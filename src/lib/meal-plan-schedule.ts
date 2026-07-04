// Two-week release schedule for long meal plans. The coach authors 7-day
// menus (Monday–Sunday); each menu is what the client eats for two calendar
// weeks. A month is 14 authored days: days 1–7 cover weeks 1–2, days 8–14
// cover weeks 3–4. The client sees only the current menu, and the next menu
// (with its grocery list) unlocks a couple of days early so she can shop
// before the switch. Pure module (no server deps) so the date math is
// unit-testable; explicit .ts extensions keep it loading under `node --test
// --experimental-strip-types`.

/** Days the coach authors per block: one week's menu. */
export const BLOCK_MENU_DAYS = 7
/** Calendar days each menu is live: the menu repeats for two weeks. */
export const BLOCK_CALENDAR_DAYS = 14
export const NEXT_BLOCK_PREVIEW_DAYS = 2

/** Day-index ranges [start, end) chunked into 7-day menus. */
export function mealPlanBlocks(totalDays: number): { start: number; end: number }[] {
  const blocks: { start: number; end: number }[] = []
  for (let start = 0; start < totalDays; start += BLOCK_MENU_DAYS) {
    blocks.push({ start, end: Math.min(start + BLOCK_MENU_DAYS, totalDays) })
  }
  return blocks
}

export type MealPlanSchedule = {
  /** True when the plan has more than one menu AND a valid start date exists. */
  active: boolean
  /** Index into mealPlanBlocks(); 0 when inactive. */
  currentBlock: number
  /** Absolute mealPlan index for today's meals; -1 when inactive (caller falls back to weekday logic). */
  todayDayIndex: number
  nextBlockVisible: boolean
  /** Calendar days until the next menu starts; 0 when there is no next menu. */
  daysUntilNextBlock: number
  /** ISO date the next menu begins; '' when there is no next menu. */
  nextBlockStartsOn: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function shiftDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T12:00:00Z`).getTime()
  const to = new Date(`${toIso}T12:00:00Z`).getTime()
  return Math.floor((to - from) / 86_400_000)
}

const inactive: MealPlanSchedule = {
  active: false, currentBlock: 0, todayDayIndex: -1,
  nextBlockVisible: false, daysUntilNextBlock: 0, nextBlockStartsOn: '',
}

export function mealPlanSchedule(totalDays: number, startDate: string, today: string): MealPlanSchedule {
  const blocks = mealPlanBlocks(totalDays)
  if (blocks.length <= 1 || !ISO_DATE.test(startDate.trim()) || !ISO_DATE.test(today)) {
    return inactive
  }

  // Before the start date the client sees the first menu with day one as "today".
  const daysSince = Math.max(0, daysBetween(startDate.trim(), today))
  const currentBlock = Math.min(Math.floor(daysSince / BLOCK_CALENDAR_DAYS), blocks.length - 1)
  const block = blocks[currentBlock]
  const blockLength = block.end - block.start
  // The menu repeats weekly within its two weeks; past the final menu the
  // client stays on it, still rotating, until the coach publishes new weeks.
  const dayInMenu = (daysSince - currentBlock * BLOCK_CALENDAR_DAYS) % blockLength

  const hasNext = currentBlock < blocks.length - 1
  const daysUntilNextBlock = hasNext ? (currentBlock + 1) * BLOCK_CALENDAR_DAYS - daysSince : 0

  return {
    active: true,
    currentBlock,
    todayDayIndex: block.start + dayInMenu,
    nextBlockVisible: hasNext && daysUntilNextBlock <= NEXT_BLOCK_PREVIEW_DAYS,
    daysUntilNextBlock,
    nextBlockStartsOn: hasNext ? shiftDate(startDate.trim(), (currentBlock + 1) * BLOCK_CALENDAR_DAYS) : '',
  }
}

/** "2026-07-20" → "Monday, July 20" for client-facing unlock notices. */
export function friendlyBlockDate(isoDate: string): string {
  if (!ISO_DATE.test(isoDate)) return isoDate
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric',
  }).format(new Date(`${isoDate}T12:00:00Z`))
}

/** "Weeks 1–2" for block 0, "Weeks 3–4" for block 1, … */
export function blockWeeksLabel(blockIndex: number): string {
  return `Weeks ${blockIndex * 2 + 1}–${blockIndex * 2 + 2}`
}

/**
 * Menus are authored Monday–Sunday, but the schedule rotates from the start
 * date — a mid-week start makes every day label (and the TODAY badge) point
 * at the wrong real-world weekday for the entire plan. Returns a coach-facing
 * warning for non-Monday start dates, or null when the date is fine/blank.
 */
export function startDateWeekdayWarning(startDate: string): string | null {
  const trimmed = startDate.trim()
  if (!ISO_DATE.test(trimmed)) return null
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' })
    .format(new Date(`${trimmed}T12:00:00Z`))
  if (weekday === 'Monday') return null
  return `${friendlyBlockDate(trimmed)} is a ${weekday}. Menu days are labeled Monday–Sunday and rotate from this date, so the client's "today" won't match her real weekday. Pick a Monday.`
}
