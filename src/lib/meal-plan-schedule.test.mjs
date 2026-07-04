import test from 'node:test'
import assert from 'node:assert'
import { mealPlanBlocks, mealPlanSchedule, friendlyBlockDate, blockWeeksLabel } from './meal-plan-schedule.ts'

test('a single 7-day menu is one block and the schedule stays inactive', () => {
  assert.deepStrictEqual(mealPlanBlocks(7), [{ start: 0, end: 7 }])
  assert.strictEqual(mealPlanSchedule(7, '2026-07-06', '2026-07-10').active, false)
})

test('a month (two 7-day menus) splits into two blocks', () => {
  assert.deepStrictEqual(mealPlanBlocks(14), [
    { start: 0, end: 7 },
    { start: 7, end: 14 },
  ])
})

test('without a start date the schedule stays inactive', () => {
  assert.strictEqual(mealPlanSchedule(14, '', '2026-07-10').active, false)
  assert.strictEqual(mealPlanSchedule(14, 'soon', '2026-07-10').active, false)
})

test('during weeks 1–2 only menu one shows and today tracks the weekday', () => {
  // Start Monday Jul 6. Thursday Jul 9 → menu day 3.
  const s = mealPlanSchedule(14, '2026-07-06', '2026-07-09')
  assert.strictEqual(s.active, true)
  assert.strictEqual(s.currentBlock, 0)
  assert.strictEqual(s.todayDayIndex, 3)
  assert.strictEqual(s.nextBlockVisible, false)
  assert.strictEqual(s.daysUntilNextBlock, 11)
})

test('the menu repeats in its second week: same weekday, same day index', () => {
  // Thursday of week 2 (Jul 16, day 10) → still menu day 3.
  const s = mealPlanSchedule(14, '2026-07-06', '2026-07-16')
  assert.strictEqual(s.currentBlock, 0)
  assert.strictEqual(s.todayDayIndex, 3)
})

test('the next menu unlocks exactly two days before its two weeks start', () => {
  // Menu 2 starts calendar day 14 = 2026-07-20. Day 11 (Jul 17): hidden.
  assert.strictEqual(mealPlanSchedule(14, '2026-07-06', '2026-07-17').nextBlockVisible, false)
  // Day 12 (Jul 18): two days out — visible.
  const unlock = mealPlanSchedule(14, '2026-07-06', '2026-07-18')
  assert.strictEqual(unlock.nextBlockVisible, true)
  assert.strictEqual(unlock.daysUntilNextBlock, 2)
  assert.strictEqual(unlock.nextBlockStartsOn, '2026-07-20')
  // Day 13 (Jul 19): one day out — still visible.
  assert.strictEqual(mealPlanSchedule(14, '2026-07-06', '2026-07-19').nextBlockVisible, true)
})

test('when weeks 3–4 begin, menu two becomes current', () => {
  const s = mealPlanSchedule(14, '2026-07-06', '2026-07-20')
  assert.strictEqual(s.currentBlock, 1)
  assert.strictEqual(s.todayDayIndex, 7)
  assert.strictEqual(s.nextBlockVisible, false)
  assert.strictEqual(s.nextBlockStartsOn, '')
})

test('after the month ends the client stays on the last menu, weekdays still aligned', () => {
  // Day 30 (Aug 5, a Wednesday): (30 - 14) % 7 = 2 → menu index 7 + 2 = 9.
  const s = mealPlanSchedule(14, '2026-07-06', '2026-08-05')
  assert.strictEqual(s.currentBlock, 1)
  assert.strictEqual(s.todayDayIndex, 9)
  assert.strictEqual(s.nextBlockVisible, false)
})

test('before the start date the client sees menu one, day one', () => {
  const s = mealPlanSchedule(14, '2026-07-06', '2026-07-01')
  assert.strictEqual(s.currentBlock, 0)
  assert.strictEqual(s.todayDayIndex, 0)
  assert.strictEqual(s.nextBlockVisible, false)
})

test('a short second menu still schedules and rotates within its length', () => {
  // 10 days → menus of 7 and 3. Calendar day 17 → block 2, (17 - 14) % 3 = 0 → index 7.
  assert.strictEqual(mealPlanSchedule(10, '2026-07-06', '2026-07-23').todayDayIndex, 7)
  // Calendar day 19 → (19 - 14) % 3 = 2 → index 9.
  assert.strictEqual(mealPlanSchedule(10, '2026-07-06', '2026-07-25').todayDayIndex, 9)
})

test('labels for client-facing dates and admin block headers', () => {
  assert.strictEqual(friendlyBlockDate('2026-07-20'), 'Monday, July 20')
  assert.strictEqual(blockWeeksLabel(0), 'Weeks 1–2')
  assert.strictEqual(blockWeeksLabel(1), 'Weeks 3–4')
  assert.strictEqual(blockWeeksLabel(2), 'Weeks 5–6')
})

test('warns when a start date is not a Monday, stays quiet otherwise', async () => {
  const { startDateWeekdayWarning } = await import('./meal-plan-schedule.ts')
  assert.strictEqual(startDateWeekdayWarning('2026-07-06'), null) // Monday
  assert.strictEqual(startDateWeekdayWarning(''), null)
  assert.strictEqual(startDateWeekdayWarning('not-a-date'), null)
  const warning = startDateWeekdayWarning('2026-07-08') // Wednesday
  assert.ok(warning && warning.includes('Wednesday'))
  assert.ok(warning.includes('Monday'))
})
