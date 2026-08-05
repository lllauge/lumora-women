import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { mealRecipeNames, parseCoachingPlan, type CoachingPlanDraft } from '@/lib/coaching-plan-schema'
import { isFamilyMealPrepStyle, isFreshCookStyle, isIndividualPlanStyle } from '@/lib/cooking-style'

// Portion and measurement math lives in client-portion.ts and
// household-measure.ts (pure, unit-tested); re-exported so portal pages keep
// one import site for coaching helpers.
export {
  cleanIngredientText,
  clientPortionFactor,
  clientPortionLines,
  clientRecipeNotes,
  ingredientGrams,
  ingredientWeighState,
  portionFraction,
  portionSummaryLine,
  shortIngredientName,
  type PortionFraction,
  type PortionLine,
} from '@/lib/client-portion'
export { groceryDisplay, shoppingPrepLines, type PrepLine } from '@/lib/household-measure'

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

export type CoachReview = {
  week_of: string
  what_i_saw: string
  what_changed: string
  focus: string
  updated_at: string
}

export type PortalContext = {
  userId: string
  firstName: string
  client: { id: string; first_name: string | null; status: string }
  plan: CoachingPlanDraft
  planPublishedAt: string
  /**
   * True when the plan was built in an individual style: recipe gram amounts
   * are exactly what the client eats, so portion display must not carve
   * declared family servings out of them.
   */
  individualPlanStyle: boolean
  /**
   * Individual style where the client cooks her portion fresh each time
   * (individual_fresh) instead of batching leftovers (individual_only).
   */
  freshCookStyle: boolean
  /** Family style where repeated dinners are double-batched (family_meal_prep). */
  familyPrepStyle: boolean
  /** ISO date the plan's Day 1 begins; '' when the coach hasn't set one. */
  mealPlanStartDate: string
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
  if (/\[(?:fdc|curated):|details:|client portion:|plate by the ingredient|total client serving/i.test(v)) return ''
  return v
}

/** True when a stored portion string is clean enough to show a client. */
export function isClientReadable(value: string): boolean {
  const v = value.trim()
  return v.length > 0 && v.length <= 90 && !/\[(?:fdc|curated):/i.test(v) && !/details:/i.test(v)
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
  // No protein habit on purpose: in this program, eating the planned meals
  // IS hitting the macros — a separate protein checkbox double-counts the
  // same behavior. The 'workout' key stays on the strength habit so clients'
  // historical movement wins keep counting toward streaks.
  const habits: Habit[] = [{ key: 'meals', label: 'Ate my planned meals' }]
  if (t.water.trim()) habits.push({ key: 'water', label: `Drank ${t.water.trim()} water` })
  if (t.steps.trim()) habits.push({ key: 'steps', label: `${t.steps.trim()} steps` })
  if (t.workoutTarget.trim()) habits.push({ key: 'workout', label: 'Did my strength training' })
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

export type CoachingClientRow = {
  id: string
  user_id: string | null
  email: string
  first_name: string | null
  last_name: string | null
  status: string
  onboarding_status: string
}

/**
 * The coaching client record belonging to this signed-in user.
 *
 * Looks up by linked auth user first, then by login email. Never uses a
 * single-row query across both keys: a comp invite plus a purchase under two
 * emails can legitimately leave two rows matching one person, and a
 * multiple-rows error must degrade to "pick her row", not lock a paying
 * client out of the portal. Rows already linked to a different auth user are
 * never returned.
 */
export async function findCoachingClientForUser(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  user: { id: string; email: string },
): Promise<CoachingClientRow | null> {
  const columns = 'id, user_id, email, first_name, last_name, status, onboarding_status'

  const { data: byUser } = await admin
    .from('coaching_clients')
    .select(columns)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
  if (byUser && byUser.length > 0) return byUser[0] as CoachingClientRow

  const { data: byEmail } = await admin
    .from('coaching_clients')
    .select(columns)
    .eq('email', user.email.toLowerCase())
    .order('created_at', { ascending: true })
    .limit(5)
  const rows = (byEmail ?? []) as CoachingClientRow[]
  return rows.find((row) => row.user_id === user.id)
    ?? rows.find((row) => !row.user_id)
    ?? null
}

/**
 * Portal-shaped data for a specific client, for the admin "view as client"
 * preview. Unlike getPortalContext (which authenticates the client herself),
 * this loads by client id via the service role — callers must already sit
 * behind the admin guard. Null when the client doesn't exist; `plan` is null
 * until she has a published plan.
 */
export async function getClientPortalPreview(clientId: string) {
  const admin = await createAdminClient()
  const { data: client } = await admin
    .from('coaching_clients')
    .select('id, first_name, last_name, status')
    .eq('id', clientId)
    .maybeSingle()
  if (!client) return null

  const { data: planRow } = await admin
    .from('coaching_plans')
    .select('macro_targets, meal_plan, recipes, workout_plan, grocery_list, client_notes, status, updated_at, planning_inputs')
    .eq('coaching_client_id', client.id)
    .eq('status', 'published')
    .maybeSingle()
  if (!planRow) {
    return { client, plan: null, individualPlanStyle: false, freshCookStyle: false, familyPrepStyle: false, mealPlanStartDate: '', planPublishedAt: '' }
  }

  const planningInputs = (planRow.planning_inputs ?? {}) as Record<string, unknown>
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
    client,
    plan,
    individualPlanStyle: isIndividualPlanStyle(planningInputs.mealPlanStyle),
    freshCookStyle: isFreshCookStyle(planningInputs.mealPlanStyle),
    familyPrepStyle: isFamilyMealPrepStyle(planningInputs.mealPlanStyle),
    mealPlanStartDate: typeof planningInputs.mealPlanStartDate === 'string' ? planningInputs.mealPlanStartDate : '',
    planPublishedAt: planRow.updated_at as string,
  }
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
  const client = await findCoachingClientForUser(admin, { id: user.id, email: user.email })

  if (!client) redirect('/dashboard')

  const { data: planRow } = await admin
    .from('coaching_plans')
    .select('macro_targets, meal_plan, recipes, workout_plan, grocery_list, client_notes, status, updated_at, planning_inputs')
    .eq('coaching_client_id', client.id)
    .eq('status', 'published')
    .maybeSingle()

  if (!planRow) redirect('/dashboard')

  const planningInputs = (planRow.planning_inputs ?? {}) as Record<string, unknown>

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
    individualPlanStyle: isIndividualPlanStyle(planningInputs.mealPlanStyle),
    freshCookStyle: isFreshCookStyle(planningInputs.mealPlanStyle),
    familyPrepStyle: isFamilyMealPrepStyle(planningInputs.mealPlanStyle),
    mealPlanStartDate: typeof planningInputs.mealPlanStartDate === 'string' ? planningInputs.mealPlanStartDate : '',
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

/**
 * The most recent coach review for the client, any week. The Today page pins
 * it until the next one replaces it — coach attention should stay visible
 * even when a review lands mid-week or a week gets skipped.
 */
export async function getLatestCoachReview(clientId: string): Promise<CoachReview | null> {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('coaching_reviews')
    .select('week_of, what_i_saw, what_changed, focus, updated_at')
    .eq('coaching_client_id', clientId)
    .order('week_of', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as CoachReview | null) ?? null
}

/**
 * How many reviews the client has ever received. Zero means the composer
 * should present as her post-onboarding-call welcome; exactly one means the
 * pinned card is that welcome and is labeled accordingly.
 */
export async function getCoachReviewCount(clientId: string): Promise<number> {
  const admin = await createAdminClient()
  const { count } = await admin
    .from('coaching_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('coaching_client_id', clientId)
  return count ?? 0
}

/** The review for one specific week (Monday date), for the admin composer. */
export async function getCoachReviewForWeek(clientId: string, weekOf: string): Promise<CoachReview | null> {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('coaching_reviews')
    .select('week_of, what_i_saw, what_changed, focus, updated_at')
    .eq('coaching_client_id', clientId)
    .eq('week_of', weekOf)
    .maybeSingle()
  return (data as CoachReview | null) ?? null
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
