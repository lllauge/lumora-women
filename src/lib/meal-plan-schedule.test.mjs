import test from 'node:test'
import assert from 'node:assert'
import { mealPlanBlocks, mealPlanSchedule, friendlyBlockDate } from './meal-plan-schedule.ts'

test('short plans are a single block and the schedule stays inactive', () => {
  assert.deepStrictEqual(mealPlanBlocks(7), [{ start: 0, end: 7 }])
  assert.deepStrictEqual(mealPlanBlocks(14), [{ start: 0, end: 14 }])
  assert.strictEqual(mealPlanSchedule(14, '2026-07-06', '2026-07-10').active, false)
})

test('a month splits into two 14-day blocks', () => {
  assert.deepStrictEqual(mealPlanBlocks(28), [
    { start: 0, end: 14 },
    { start: 14, end: 28 },
  ])
})

test('without a start date the schedule stays inactive', () => {
  assert.strictEqual(mealPlanSchedule(28, '', '2026-07-10').active, false)
  assert.strictEqual(mealPlanSchedule(28, 'soon', '2026-07-10').active, false)
})

test('during week one only block one shows and today tracks the calendar', () => {
  const s = mealPlanSchedule(28, '2026-07-06', '2026-07-09')
  assert.strictEqual(s.active, true)
  assert.strictEqual(s.currentBlock, 0)
  assert.strictEqual(s.todayDayIndex, 3)
  assert.strictEqual(s.nextBlockVisible, false)
  assert.strictEqual(s.daysUntilNextBlock, 11)
})

test('the next block unlocks exactly two days before it starts', () => {
  // Block 2 starts day 14 = 2026-07-20. Day 11 (Jul 17): still hidden.
  assert.strictEqual(mealPlanSchedule(28, '2026-07-06', '2026-07-17').nextBlockVisible, false)
  // Day 12 (Jul 18): two days out — visible.
  const unlock = mealPlanSchedule(28, '2026-07-06', '2026-07-18')
  assert.strictEqual(unlock.nextBlockVisible, true)
  assert.strictEqual(unlock.daysUntilNextBlock, 2)
  assert.strictEqual(unlock.nextBlockStartsOn, '2026-07-20')
  // Day 13 (Jul 19): one day out — still visible.
  assert.strictEqual(mealPlanSchedule(28, '2026-07-06', '2026-07-19').nextBlockVisible, true)
})

test('when block two begins it becomes the current block', () => {
  const s = mealPlanSchedule(28, '2026-07-06', '2026-07-20')
  assert.strictEqual(s.currentBlock, 1)
  assert.strictEqual(s.todayDayIndex, 14)
  assert.strictEqual(s.nextBlockVisible, false)
  assert.strictEqual(s.nextBlockStartsOn, '')
})

test('after the plan ends the client stays on the last block, days still rotating', () => {
  // 28-day plan, day 30 → last block, rotating: 30 - 14 = 16, 16 % 14 = 2.
  const s = mealPlanSchedule(28, '2026-07-06', '2026-08-05')
  assert.strictEqual(s.currentBlock, 1)
  assert.strictEqual(s.todayDayIndex, 16)
  assert.strictEqual(s.nextBlockVisible, false)
})

test('before the start date the client sees block one, day one', () => {
  const s = mealPlanSchedule(28, '2026-07-06', '2026-07-01')
  assert.strictEqual(s.currentBlock, 0)
  assert.strictEqual(s.todayDayIndex, 0)
  assert.strictEqual(s.nextBlockVisible, false)
})

test('a short final block still schedules and rotates correctly', () => {
  // 21 days → blocks of 14 and 7. Day 17 → block 2, day-in-block 3 → index 17.
  const s = mealPlanSchedule(21, '2026-07-06', '2026-07-23')
  assert.strictEqual(s.currentBlock, 1)
  assert.strictEqual(s.todayDayIndex, 17)
  // Day 26 (past end): (26 - 14) % 7 = 5 → index 19.
  assert.strictEqual(mealPlanSchedule(21, '2026-07-06', '2026-08-01').todayDayIndex, 19)
})

test('friendly date formats for the unlock notice', () => {
  assert.strictEqual(friendlyBlockDate('2026-07-20'), 'Monday, July 20')
})
