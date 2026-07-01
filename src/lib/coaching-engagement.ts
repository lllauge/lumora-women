import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { mealRecipeNames, parseCoachingPlan, type CoachingPlanDraft } from '@/lib/coaching-plan-schema'
import { cookedGramsToRaw } from '@/lib/cooked-to-raw'

const COACHING_TIME_ZONE = 'America/New_York'

export type Habit = { key: string; label: string }

export type DailyLog = {
  log_date: string
  wins: Record<string, boolean>
}

export type ProgressLog = {
  id: string
  logged_at: string
  weight: string | null
  body_fat: string | null
  waist: string | null
  hips: string | null
  notes: string | null
}

export type CoachingMessage = {
  id: string
  sender: 'client' | 'coach'
  body: string
  is_check_in: boolean
  read_by_client_at: string | null
  created_at: string
}

export type PortalContext = {
  userId: string
  firstName: string
  client: { id: string; first_name: string | null; status: string }
  plan: CoachingPlanDraft
  planPublishedAt: string
}

/** Today's date (YYYY-MM-DD) in the coaching time zone. */
export function coachingToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: COACHING_TIME_ZONE }).format(new Date())
}

/** Weekday name (e.g. "Monday") in the coaching time zone. */
export function coachingWeekday(date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: COACHING_TIME_ZONE, weekday: 'long' }).format(date)
}

function shiftDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Monday-start week containing the given date. */
export function weekDates(isoDate: string): string[] {
  const d = new Date(`${isoDate}T12:00:00Z`)
  const mondayOffset = (d.getUTCDay() + 6) % 7
  const monday = shiftDate(isoDate, -mondayOffset)
  return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i))
}

/**
 * Hide the editor's internal slot suffix ("Custom breakfast (d1-breakfast)" →
 * "Custom breakfast"). Saved plans can accumulate the suffix more than once,
 * so strip repeatedly.
 */
export function displayRecipeName(name: string): string {
  const suffix = /\s*\(d\d+-(?:breakfast|lunch|dinner|snack\d*)\)\s*$/i
  let cleaned = name.trim()
  while (suffix.test(cleaned)) cleaned = cleaned.replace(suffix, '').trim()
  return cleaned || name.trim()
}

/**
 * Meal descriptions written by the plan editor for the coach ("Client
 * portion: 250g. Plate by the ingredient weights below…") are hidden from
 * clients; real food descriptions pass through.
 */
export function cleanMealDescription(value: string): string {
  const v = value.trim()
  if (!v) return ''
  if (/\[fdc:|details:|client portion:|plate by the ingredient|total client serving/i.test(v)) return ''
  return v
}

/** Compact one-line weigh-out summary: "3 large eggs · 50g sweet potato (cooked)". */
export function portionSummaryLine(recipe: CoachingPlanDraft['recipes'][number]): string {
  const lines = clientPortionLines(recipe).filter((line) => line.grams !== null || line.count)
  if (lines.length === 0) return ''
  return lines.map((line) => {
    if (line.count) {
      const n = parseInt(line.count, 10)
      const foodName = /egg/i.test(line.name) ? (n > 1 ? 'eggs' : 'egg') : line.name.split(',')[0].trim()
      return `${line.count} ${foodName}`
    }
    const nameMentionsState = COOKED_WORDS.test(line.name) || RAW_WORDS.test(line.name)
    const stateSuffix = nameMentionsState ? '' : line.state === 'raw' ? ' (raw)' : line.state === 'cooked' ? ' (cooked)' : ''
    return `${line.grams}g ${line.name}${stateSuffix}`
  }).join(' · ')
}

const FDC_TOKEN = /\[fdc:\d+\]\s*/gi

/** Strip internal food-database tokens and collapse whitespace for client display. */
export function cleanIngredientText(value: string): string {
  return value.replace(FDC_TOKEN, '').replace(/\s+/g, ' ').trim()
}

/** Leading gram amount of an ingredient line ("50g Sweet potato…" → 50). */
export function ingredientGrams(value: string): number | null {
  const match = cleanIngredientText(value).match(/^(\d+(?:\.\d+)?)\s*g\b/i)
  return match ? parseFloat(match[1]) : null
}

/** Ingredient name without the leading amount, trimmed to its first two comma segments. */
export function shortIngredientName(value: string): string {
  const withoutAmount = cleanIngredientText(value).replace(/^[\d.]+\s*(?:g|oz|lb|cups?|tbsp|tsp)\b\.?\s*/i, '')
  const segments = withoutAmount.split(',').map((s) => s.trim()).filter(Boolean)
  return segments.slice(0, 2).join(', ') || cleanIngredientText(value)
}

const COOKED_WORDS = /\b(cooked|baked|roasted|grilled|poached|boiled|steamed|toasted|saut[eé]ed|scrambled|fried)\b/i
const RAW_WORDS = /\b(raw|uncooked|dry|dried)\b/i

/** Whether the entry's weight refers to the food cooked or raw (from the USDA name). */
export function ingredientWeighState(value: string): 'cooked' | 'raw' | null {
  const v = cleanIngredientText(value)
  if (COOKED_WORDS.test(v)) return 'cooked'
  if (RAW_WORDS.test(v)) return 'raw'
  return null
}

function ingredientCount(value: string): { n: number; unit: string } | null {
  const match = cleanIngredientText(value).match(/\((\d+(?:\.\d+)?)\s*(extra-?large|large|medium|small)?\s*\)/i)
  return match ? { n: parseFloat(match[1]), unit: match[2]?.toLowerCase() ?? '' } : null
}

export type PortionLine = {
  grams: number | null
  name: string
  state: 'cooked' | 'raw' | null
  count: string | null
}

/**
 * Per-ingredient weigh-out list for the client's portion: full-recipe gram
 * amounts scaled by her serving multiplier (family recipes get her carved
 * portion; individual recipes are eaten as entered, multiplier 1). Counts
 * like "(3 large)" carry through when they scale to a whole number.
 */
/**
 * The fraction of the full recipe that's the client's portion. For family
 * recipes (familyServings > 1), a missing OR 1.0 multiplier means "default to
 * equal share" — no client eats a whole family pot. Use the saved multiplier
 * only when it's actually been carved (0 < m < 1).
 */
export function clientPortionFactor(recipe: CoachingPlanDraft['recipes'][number]): number {
  const multiplier = parseFloat(recipe.clientServingMultiplier)
  const familyServings = parseFloat(recipe.familyServings)
  const isFamily = Number.isFinite(familyServings) && familyServings > 1
  if (isFamily) {
    if (Number.isFinite(multiplier) && multiplier > 0 && multiplier < 1) return multiplier
    return 1 / familyServings
  }
  return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1
}

export function clientPortionLines(recipe: CoachingPlanDraft['recipes'][number]): PortionLine[] {
  const factor = clientPortionFactor(recipe)
  return recipe.ingredients
    .map((ing) => {
      const grams = ingredientGrams(ing)
      const rawCount = ingredientCount(ing)
      let count: string | null = null
      if (rawCount) {
        const scaled = rawCount.n * factor
        if (Math.abs(scaled - Math.round(scaled)) < 0.01 && Math.round(scaled) >= 1) {
          count = `${Math.round(scaled)}${rawCount.unit ? ` ${rawCount.unit}` : ''}`
        }
      }
      return {
        grams: grams !== null ? Math.round(grams * factor) : null,
        name: shortIngredientName(ing),
        state: ingredientWeighState(ing),
        count,
      }
    })
    .filter((line) => line.name)
}

// Approx grams per common shopping unit, so we can convert weights into what
// a shopper actually reaches for. Wider tolerances than the recipe parser —
// grocery lists round generously ("about 1 tsp", "2 cloves").
const GROCERY_UNITS: Array<{ match: RegExp; label: string; gramsPer: number; minCount?: number; template?: (n: number) => string }> = [
  // Cloves of garlic — count-based, no oz/g needed.
  { match: /\bgarlic\b|\bcloves?\b/, label: 'clove', gramsPer: 3, template: (n) => `${n} clove${n === 1 ? '' : 's'} garlic` },
  // Whole eggs.
  { match: /\begg(s|\b)/, label: 'egg', gramsPer: 50, template: (n) => `${n} large egg${n === 1 ? '' : 's'}` },
  // Dried leafy herbs (~1g/tsp).
  { match: /\b(oregano|basil|thyme|rosemary|parsley|sage|dill|tarragon|marjoram|italian seasoning|bay leaf|bay leaves)\b/, label: 'tsp', gramsPer: 1 },
  // Medium ground spices (~2g/tsp).
  { match: /\b(cumin|black pepper|white pepper|ground pepper|chili powder|paprika|cayenne|coriander|ginger|cardamom|cloves? ground|allspice|red pepper flakes?|taco seasoning|garam masala|curry powder)\b/, label: 'tsp', gramsPer: 2 },
  // Salt (~6g/tsp).
  { match: /\bsalt\b/, label: 'tsp', gramsPer: 6 },
  // Powders (~3g/tsp): garlic powder, onion powder, turmeric.
  { match: /\b(garlic powder|onion powder|turmeric)\b/, label: 'tsp', gramsPer: 3 },
  // Cinnamon, nutmeg (~2.5g/tsp).
  { match: /\b(cinnamon|nutmeg|mace)\b/, label: 'tsp', gramsPer: 2.5 },
  // Extracts (~4g/tsp).
  { match: /\b(vanilla extract|almond extract|extract)\b/, label: 'tsp', gramsPer: 4 },
  // Oils (~14g/tbsp).
  { match: /\b(olive oil|avocado oil|coconut oil|canola oil|vegetable oil|sesame oil|oil)\b/, label: 'tbsp', gramsPer: 14 },
  // Butter (~14g/tbsp).
  { match: /\bbutter\b|\bghee\b/, label: 'tbsp', gramsPer: 14 },
  // Nut butters (~16g/tbsp).
  { match: /\b(peanut butter|almond butter|cashew butter|sunflower butter|nut butter)\b/, label: 'tbsp', gramsPer: 16 },
  // Honey / maple / molasses (~21g/tbsp).
  { match: /\b(honey|maple syrup|agave|molasses)\b/, label: 'tbsp', gramsPer: 21 },
]

/** Round to a friendly cooking increment: ¼, ½, ¾ up through 4, then whole. */
function friendlyCount(value: number): string {
  if (value < 0.375) return '¼'
  if (value < 0.625) return '½'
  if (value < 0.875) return '¾'
  if (value < 1.25) return '1'
  if (value < 1.625) return '1¼'
  if (value < 1.875) return '1½'
  if (value < 2.25) return '2'
  return String(Math.round(value))
}

/**
 * Grocery-friendly amount from grams: cloves, tsp/tbsp, oz, cups, lb depending
 * on what a shopper would actually count. Skips grams entirely — the meal
 * plan shows precise grams for weighing at cook time; the shopping list is
 * about what to grab off the shelf.
 */
export function groceryDisplay(item: string): string {
  const cleaned = cleanIngredientText(item)
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*g\b\s*(.+)$/i)
  if (!match) return cleaned
  const parsedGrams = parseFloat(match[1])
  if (!Number.isFinite(parsedGrams) || parsedGrams <= 0) return cleaned

  const { grams, label } = cookedGramsToRaw(match[2].trim(), parsedGrams)
  const lower = label.toLowerCase()

  // Match against practical shopping units first — herbs/spices/cloves/eggs.
  for (const unit of GROCERY_UNITS) {
    if (unit.match.test(lower)) {
      const count = grams / unit.gramsPer
      if (unit.template) {
        return unit.template(Math.max(1, Math.round(count)))
      }
      return `${friendlyCount(count)} ${unit.label} ${label}`
    }
  }

  // Bulk items: lbs when a pound or more, oz otherwise. Round oz to 0.5.
  if (grams >= 454) {
    const lb = Math.round((grams / 453.59) * 4) / 4
    const lbStr = lb.toFixed(2).replace(/\.?0+$/, '')
    return `${label}, ${lbStr} lb`
  }
  const oz = Math.max(0.5, Math.round((grams / 28.35) * 2) / 2)
  const ozStr = oz.toFixed(1).replace(/\.0$/, '')
  return `${label}, ${ozStr} oz`
}

const FRACTIONS: [number, string][] = [
  [1, 'the whole recipe'], [3 / 4, '¾'], [2 / 3, '⅔'], [3 / 5, '⅗'], [1 / 2, 'half'],
  [2 / 5, '⅖'], [3 / 8, '⅜'], [1 / 3, '⅓'], [1 / 4, '¼'], [1 / 5, '⅕'], [1 / 6, '⅙'], [1 / 8, '⅛'],
]

export type PortionFraction = { label: string; qualifier: 'generous' | 'scant' | null }

/**
 * The client's portion as an easy fraction of the cooked dish ("¼", "half"),
 * for nights she doesn't want to weigh food. The fraction must stay close to
 * her true serving multiplier so the no-scale portion still hits her macros:
 * within 3% reads as exact; up to 12% off gets a "generous"/"scant" steer;
 * anything further from a kitchen fraction shows nothing.
 */
export function portionFraction(factor: number): PortionFraction | null {
  if (!Number.isFinite(factor) || factor <= 0 || factor > 1.02) return null
  let best: { label: string; deviation: number } | null = null
  for (const [value, label] of FRACTIONS) {
    const deviation = (factor - value) / value
    if (!best || Math.abs(deviation) < Math.abs(best.deviation)) best = { label, deviation }
  }
  if (!best || Math.abs(best.deviation) > 0.12) return null
  if (best.label === 'the whole recipe' && Math.abs(best.deviation) > 0.03) return null
  return {
    label: best.label,
    qualifier: Math.abs(best.deviation) <= 0.03 ? null : best.deviation > 0 ? 'generous' : 'scant',
  }
}

/** True when a stored portion string is clean enough to show a client. */
export function isClientReadable(value: string): boolean {
  const v = value.trim()
  return v.length > 0 && v.length <= 90 && !/\[fdc:/i.test(v) && !/details:/i.test(v)
}

/** "130" → "130g", but "130g" stays "130g" — values may already carry a unit. */
export function withGrams(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /[a-z]$/i.test(trimmed) ? trimmed : `${trimmed}g`
}

/**
 * Daily habits generated from the plan's macro targets. Only targets Laura
 * actually set become habits, capped at 5 so the list never overwhelms.
 */
export function habitsFromPlan(plan: CoachingPlanDraft): Habit[] {
  const t = plan.macroTargets
  const habits: Habit[] = [{ key: 'meals', label: 'Ate my planned meals' }]
  if (t.protein.trim()) habits.push({ key: 'protein', label: `Hit ${withGrams(t.protein)} protein` })
  if (t.water.trim()) habits.push({ key: 'water', label: `Drank ${t.water.trim()} water` })
  if (t.steps.trim()) habits.push({ key: 'steps', label: `${t.steps.trim()} steps` })
  if (t.workoutTarget.trim()) habits.push({ key: 'workout', label: 'Got my movement in' })
  return habits.slice(0, 5)
}

/**
 * Recipes the client should see: only ones referenced by a meal slot in her
 * week. Plans accumulate leftover recipes as Laura experiments in the editor,
 * and those should stay invisible. Original indexes are kept so recipe anchor
 * links stay stable.
 */
export function clientVisibleRecipes(plan: CoachingPlanDraft): { recipe: CoachingPlanDraft['recipes'][number]; index: number }[] {
  const referenced = new Set<string>()
  for (const day of plan.mealPlan) {
    for (const meal of [day.breakfast, day.lunch, day.dinner, ...day.snacks]) {
      mealRecipeNames(meal).forEach((name) => referenced.add(name))
    }
  }
  if (referenced.size === 0) return []
  // Auto-slot recipes created when a coach adds raw ingredients to a meal slot
  // without picking a real recipe are named "Custom breakfast (d1-breakfast)"
  // etc. Those carry the meal's ingredient list but aren't recipes the client
  // is meant to read as a card — hide them.
  const autoSlotName = /^Custom\s+(breakfast|lunch|dinner|snack)\b/i
  return plan.recipes
    .map((recipe, index) => ({ recipe, index }))
    .filter(({ recipe }) => referenced.has(recipe.name.trim()))
    .filter(({ recipe }) => !autoSlotName.test(displayRecipeName(recipe.name)))
}

function winsCount(log: DailyLog | undefined, habits: Habit[]): number {
  if (!log) return 0
  return habits.filter((h) => log.wins?.[h.key] === true).length
}

/** Consecutive days with at least one win, ending today or yesterday. */
export function currentStreak(logs: DailyLog[], habits: Habit[], today: string): number {
  const byDate = new Map(logs.map((l) => [l.log_date, l]))
  let cursor = today
  if (winsCount(byDate.get(cursor), habits) === 0) cursor = shiftDate(today, -1)
  let streak = 0
  while (winsCount(byDate.get(cursor), habits) > 0) {
    streak += 1
    cursor = shiftDate(cursor, -1)
  }
  return streak
}

/** Longest streak across all logs (for milestones). */
export function bestStreak(logs: DailyLog[], habits: Habit[]): number {
  const activeDates = logs
    .filter((l) => winsCount(l, habits) > 0)
    .map((l) => l.log_date)
    .sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const date of activeDates) {
    run = prev !== null && shiftDate(prev, 1) === date ? run + 1 : 1
    best = Math.max(best, run)
    prev = date
  }
  return best
}

/** Wins completed / wins possible for the week so far (Mon → today). */
export function weekConsistency(logs: DailyLog[], habits: Habit[], today: string): {
  percent: number
  days: { date: string; wins: number; possible: number }[]
} {
  const byDate = new Map(logs.map((l) => [l.log_date, l]))
  const days = weekDates(today).map((date) => ({
    date,
    wins: winsCount(byDate.get(date), habits),
    possible: habits.length,
  }))
  const elapsed = days.filter((d) => d.date <= today)
  const possible = elapsed.length * habits.length
  const done = elapsed.reduce((sum, d) => sum + d.wins, 0)
  return { percent: possible > 0 ? Math.round((done / possible) * 100) : 0, days }
}

export type Milestone = { key: string; label: string; earned: boolean }

export function milestones(logs: DailyLog[], habits: Habit[], checkInCount: number): Milestone[] {
  const activeDays = logs.filter((l) => winsCount(l, habits) > 0).length
  const best = bestStreak(logs, habits)
  return [
    { key: 'first-week', label: 'First week', earned: activeDays >= 7 },
    { key: 'streak-7', label: '7-day streak', earned: best >= 7 },
    { key: 'check-ins-4', label: '4 check-ins', earned: checkInCount >= 4 },
    { key: 'days-30', label: '30 active days', earned: activeDays >= 30 },
  ]
}

/** Week number since the plan was published (1-based). */
export function planWeekNumber(publishedAt: string, today: string): number {
  const start = new Date(`${publishedAt.slice(0, 10)}T12:00:00Z`).getTime()
  const now = new Date(`${today}T12:00:00Z`).getTime()
  const days = Math.max(0, Math.floor((now - start) / 86_400_000))
  return Math.floor(days / 7) + 1
}

/**
 * Pick today's meal-plan day. Prefers a day label containing today's weekday
 * name; otherwise rotates through the plan by weekday index.
 */
export function todayMealDayIndex(plan: CoachingPlanDraft): number {
  if (plan.mealPlan.length === 0) return -1
  const weekday = coachingWeekday().toLowerCase()
  const byName = plan.mealPlan.findIndex((d) => d.day.toLowerCase().includes(weekday))
  if (byName >= 0) return byName
  const isoIndex = (new Date(`${coachingToday()}T12:00:00Z`).getUTCDay() + 6) % 7
  return isoIndex % plan.mealPlan.length
}

/**
 * Loads the signed-in user's coaching portal context, redirecting away when
 * the user has no published plan. Every portal page calls this.
 */
export async function getPortalContext(): Promise<PortalContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/login?redirectTo=/coaching')

  const admin = await createAdminClient()
  const { data: client } = await admin
    .from('coaching_clients')
    .select('id, user_id, first_name, status')
    .or(`user_id.eq.${user.id},email.eq.${user.email.toLowerCase()}`)
    .maybeSingle()

  if (!client) redirect('/dashboard')
  if (client.user_id && client.user_id !== user.id) redirect('/dashboard')

  const { data: planRow } = await admin
    .from('coaching_plans')
    .select('macro_targets, meal_plan, recipes, workout_plan, grocery_list, client_notes, status, updated_at')
    .eq('coaching_client_id', client.id)
    .eq('status', 'published')
    .maybeSingle()

  if (!planRow) redirect('/dashboard')

  const plan = parseCoachingPlan({
    macroTargets: planRow.macro_targets,
    mealPlan: planRow.meal_plan,
    recipes: planRow.recipes,
    workoutPlan: planRow.workout_plan,
    groceryList: planRow.grocery_list,
    clientNotes: planRow.client_notes ?? '',
    status: planRow.status,
  })

  return {
    userId: user.id,
    firstName: client.first_name?.trim() || user.email.split('@')[0],
    client: { id: client.id, first_name: client.first_name, status: client.status },
    plan,
    planPublishedAt: planRow.updated_at,
  }
}

/** Daily logs for the client, most recent first. */
export async function getDailyLogs(clientId: string, limit = 120): Promise<DailyLog[]> {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('coaching_daily_logs')
    .select('log_date, wins')
    .eq('coaching_client_id', clientId)
    .order('log_date', { ascending: false })
    .limit(limit)
  return (data ?? []).map((row) => ({
    log_date: row.log_date,
    wins: (row.wins ?? {}) as Record<string, boolean>,
  }))
}

export async function getProgressLogs(clientId: string, limit = 60): Promise<ProgressLog[]> {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('coaching_progress_logs')
    .select('id, logged_at, weight, body_fat, waist, hips, notes')
    .eq('coaching_client_id', clientId)
    .order('logged_at', { ascending: true })
    .limit(limit)
  return (data ?? []) as ProgressLog[]
}

export async function getMessages(clientId: string, limit = 200): Promise<CoachingMessage[]> {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('coaching_messages')
    .select('id, sender, body, is_check_in, read_by_client_at, created_at')
    .eq('coaching_client_id', clientId)
    .order('created_at', { ascending: true })
    .limit(limit)
  return (data ?? []) as CoachingMessage[]
}

export async function getCheckInCount(clientId: string): Promise<number> {
  const admin = await createAdminClient()
  const { count } = await admin
    .from('coaching_messages')
    .select('id', { count: 'exact', head: true })
    .eq('coaching_client_id', clientId)
    .eq('is_check_in', true)
  return count ?? 0
}

/** True when no check-in has been submitted in the last 7 days. */
export async function isCheckInDue(clientId: string): Promise<boolean> {
  const admin = await createAdminClient()
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const { count } = await admin
    .from('coaching_messages')
    .select('id', { count: 'exact', head: true })
    .eq('coaching_client_id', clientId)
    .eq('is_check_in', true)
    .gte('created_at', cutoff)
  return (count ?? 0) === 0
}
