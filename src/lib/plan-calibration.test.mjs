import assert from 'node:assert/strict'
import test from 'node:test'

import { isPlanCalibrated } from './plan-calibration.ts'

function meal(name) {
  return { name, recipeName: name, recipeNames: name ? [name] : [], description: '', macros: '' }
}

function recipe(name, calories) {
  return {
    name,
    mealType: '',
    servings: '1',
    familyServings: '1',
    clientServing: '',
    clientServingMultiplier: '1',
    clientServingGrams: '',
    clientServingMeasure: '',
    clientServingBreakdown: '',
    prepTime: '',
    cookTime: '',
    calories: `${calories}`,
    protein: '',
    carbs: '',
    fats: '',
    fiber: '',
    ingredients: ['100g food'],
    instructions: [],
    swaps: [],
    notes: '',
  }
}

function plan(calories = { breakfast: 533, lunch: 621, dinner: 444, snack: 177 }) {
  return {
    macroTargets: { calories: '1775' },
    mealPlan: [{
      day: 'Monday',
      breakfast: meal('Breakfast'),
      lunch: meal('Lunch'),
      dinner: meal('Dinner'),
      snacks: [meal('Snack')],
    }],
    recipes: [
      recipe('Breakfast', calories.breakfast),
      recipe('Lunch', calories.lunch),
      recipe('Dinner', calories.dinner),
      recipe('Snack', calories.snack),
    ],
  }
}

const percentages = { breakfastPct: '30', lunchPct: '35', dinnerPct: '25', snackPct: '10' }

test('a saved exact plan needs no refresh recalculation', () => {
  assert.equal(isPlanCalibrated(plan(), percentages), true)
})

test('a one-calorie discrepancy requires recalculation', () => {
  assert.equal(isPlanCalibrated(plan({ breakfast: 533, lunch: 622, dinner: 444, snack: 177 }), percentages), false)
})

test('a changed client target or percentage allocation requires recalculation', () => {
  const saved = plan()
  saved.macroTargets.calories = '1850'
  assert.equal(isPlanCalibrated(saved, percentages), false)
  assert.equal(isPlanCalibrated(plan(), { ...percentages, breakfastPct: '35', lunchPct: '30' }), false)
})
