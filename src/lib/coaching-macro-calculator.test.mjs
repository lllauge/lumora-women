import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateMacroAudit, calculateMacroTargets } from './coaching-macro-calculator.ts'

const inputs = {
  age: '40', height: `5'4"`, weight: '180 lb', targetWeight: '150 lb',
  primaryGoal: 'fat_loss', planGoal: 'fat_loss', mealPlanStyle: '', mealPlanStartDate: '',
  activityLevel: 'light_daily_movement', steps: '8,000/day', strengthTraining: '3_4_days',
  strengthTrainingDetails: '', workouts: '', water: '', medicalConditions: '', medications: '',
  injuries: '', currentEating: '', allergies: '', restrictions: '', favoriteFoods: '', dislikedFoods: '',
  eatingOut: '', sleep: '', stress: '', breakfastPct: '30', lunchPct: '35', dinnerPct: '25', snackPct: '10',
}

test('calculation audit exposes the exact formula without changing macro targets', () => {
  const audit = calculateMacroAudit(inputs)
  assert.ok(audit)
  assert.deepEqual(audit.targets, calculateMacroTargets(inputs))
  assert.equal(audit.factors.lifestyle, 0.75)
  assert.equal(audit.factors.exercise, 0.75)
  assert.equal(audit.factors.activity, 1.5)
  assert.equal(audit.equations.length, 7)
  assert.match(audit.equations[0].formula, /10 x .*kg \+ 6\.25 x .*cm - 5 x 40 - 161/)
})

test('calculation audit stays unavailable when body inputs are incomplete', () => {
  assert.equal(calculateMacroAudit({ ...inputs, weight: '' }), null)
})
