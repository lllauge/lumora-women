// Two-week release schedule for long meal plans. The coach authors up to a
// month of days; the client sees only the current 14-day block, and the next
// block (with its grocery list) unlocks a couple of days early so she can
// shop before the switch. Pure module (no server deps) so the date math is
// unit-testable; explicit .ts extensions keep it loading under `node --test
// --experimental-strip-types`.

export const BLOCK_DAYS = 14
export const NEXT_BLOCK_PREVIEW_DAYS = 2

/** Day-index ranges [start, end) chunked into 14-day blocks. */
export function mealPlanBlocks(totalDays: number): { start: number; end: number }[] {
  const blocks: { start: number; end: number }[] = []
  for (let start = 0; start < totalDays; start += BLOCK_DAYS) {
    blocks.push({ start, end: Math.min(start + BLOCK_DAYS, totalDays) })
  }
  return blocks
}

export type MealPlanSchedule = {
  /** True when the plan is long enough to gate AND a valid start date exists. */
  active: boolean
  /** Index into mealPlanBlocks(); 0 when inactive. */
  currentBlock: number
  /** Absolute mealPlan index for today's meals; -1 when inactive (caller falls back to weekday logic). */
  todayDayIndex: number
  nextBlockVisible: boolean
  /** Calendar days until the next block starts; 0 when there is no next block. */
  daysUntilNextBlock: number
  /** ISO date the next block begins; '' when there is no next block. */
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

  // Before the start date the client sees block one with day one as "today".
  const daysSince = Math.max(0, daysBetween(startDate.trim(), today))
  const currentBlock = Math.min(Math.floor(daysSince / BLOCK_DAYS), blocks.length - 1)
  const block = blocks[currentBlock]
  const blockLength = block.end - block.start
  // Past the final block the client stays on it, rotating through its days so
  // "today" keeps moving until the coach publishes the next month.
  const dayInBlock = (daysSince - currentBlock * BLOCK_DAYS) % blockLength

  const hasNext = currentBlock < blocks.length - 1
  const daysUntilNextBlock = hasNext ? (currentBlock + 1) * BLOCK_DAYS - daysSince : 0

  return {
    active: true,
    currentBlock,
    todayDayIndex: block.start + dayInBlock,
    nextBlockVisible: hasNext && daysUntilNextBlock <= NEXT_BLOCK_PREVIEW_DAYS,
    daysUntilNextBlock,
    nextBlockStartsOn: hasNext ? shiftDate(startDate.trim(), (currentBlock + 1) * BLOCK_DAYS) : '',
  }
}

/** "2026-07-20" → "Monday, July 20" for client-facing unlock notices. */
export function friendlyBlockDate(isoDate: string): string {
  if (!ISO_DATE.test(isoDate)) return isoDate
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric',
  }).format(new Date(`${isoDate}T12:00:00Z`))
}
