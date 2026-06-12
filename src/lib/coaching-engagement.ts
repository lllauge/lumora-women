import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { parseCoachingPlan, type CoachingPlanDraft } from '@/lib/coaching-plan-schema'

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

/** Hide the editor's internal slot suffix ("Custom breakfast (d1-breakfast)" → "Custom breakfast"). */
export function displayRecipeName(name: string): string {
  return name.replace(/\s*\(d\d+-(?:breakfast|lunch|dinner|snack\d*)\)\s*$/i, '').trim() || name.trim()
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

export type PortionLine = { grams: number | null; name: string }

/**
 * Per-ingredient weigh-out list for the client's portion: full-recipe gram
 * amounts scaled by her serving multiplier (family recipes get her carved
 * portion; individual recipes are eaten as entered, multiplier 1).
 */
export function clientPortionLines(recipe: CoachingPlanDraft['recipes'][number]): PortionLine[] {
  const multiplier = parseFloat(recipe.clientServingMultiplier)
  const factor = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1
  return recipe.ingredients
    .map((ing) => {
      const grams = ingredientGrams(ing)
      return { grams: grams !== null ? Math.round(grams * factor) : null, name: shortIngredientName(ing) }
    })
    .filter((line) => line.name)
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
export function portionFraction(multiplierValue: string): PortionFraction | null {
  const multiplier = parseFloat(multiplierValue)
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 1.02) return null
  let best: { label: string; deviation: number } | null = null
  for (const [value, label] of FRACTIONS) {
    const deviation = (multiplier - value) / value
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
      if (meal.recipeName.trim()) referenced.add(meal.recipeName.trim())
    }
  }
  const all = plan.recipes.map((recipe, index) => ({ recipe, index }))
  if (referenced.size === 0) return all
  return all.filter(({ recipe }) => referenced.has(recipe.name.trim()))
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
    .select('macro_targets, meal_plan, recipes, grocery_list, client_notes, status, updated_at')
    .eq('coaching_client_id', client.id)
    .eq('status', 'published')
    .maybeSingle()

  if (!planRow) redirect('/dashboard')

  const plan = parseCoachingPlan({
    macroTargets: planRow.macro_targets,
    mealPlan: planRow.meal_plan,
    recipes: planRow.recipes,
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
