import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMealCalorieBreakdown } from './meal-calorie-breakdown.ts'

function meal(recipeNames) {
  return {
    name: recipeNames.join(' + '),
    recipeName: recipeNames[0] ?? '',
    recipeNames,
    description: '',
    macros: '',
  }
}

function recipe(overrides = {}) {
  return {
    name: 'Crispy Chicken Thighs',
    mealType: 'breakfast',
    servings: '4',
    familyServings: '4',
    clientServing: '',
    clientServingMultiplier: '0.25',
    portionPinned: false,
    clientServingGrams: '',
    clientServingMeasure: '',
    clientServingBreakdown: '',
    prepTime: '',
    cookTime: '',
    calories: '488',
    protein: '35g',
    carbs: '8g',
    fats: '36g',
    fiber: '1g',
    ingredients: [],
    instructions: [],
    swaps: [],
    notes: '',
    ...overrides,
  }
}

const planningInputs = {
  breakfastPct: '35',
  lunchPct: '30',
  dinnerPct: '25',
  snackPct: '10',
}

test('explains a serves-4 recipe from original serving to prescribed calories', () => {
  const breakdown = buildMealCalorieBreakdown({
    label: 'Breakfast',
    meal: meal(['Crispy Chicken Thighs']),
    recipes: [recipe()],
    dailyCalories: 1775,
    slot: 'breakfast',
    planningInputs,
  })

  assert.equal(breakdown.targetCalories, 621.3)
  assert.equal(breakdown.savedCalories, 488)
  assert.equal(breakdown.deltaCalories, -133.2)
  assert.equal(breakdown.recipes[0].fullRecipeCalories, 1952)
  assert.equal(breakdown.recipes[0].declaredServingCalories, 488)
  assert.equal(breakdown.recipes[0].prescribedServings, 1)
  assert.match(
    breakdown.recipes[0].formula,
    /1952 cal full recipe \/ 4 servings = 488 cal per original serving/,
  )
})

test('splits snack percentage across multiple snack slots', () => {
  const breakdown = buildMealCalorieBreakdown({
    label: 'Snack 1',
    meal: meal(['Frittata Egg Muffins']),
    recipes: [recipe({
      name: 'Frittata Egg Muffins',
      familyServings: '6',
      servings: '6',
      clientServingMultiplier: '0.2',
      calories: '496',
    })],
    dailyCalories: 1775,
    slot: 'snack',
    snackCount: 2,
    planningInputs,
  })

  assert.equal(breakdown.percentage, 5)
  assert.equal(breakdown.targetCalories, 88.8)
  assert.equal(breakdown.savedCalories, 496)
  assert.equal(breakdown.recipes[0].prescribedServings, 1.2)
})

test('uses an active-day percentage total when a meal is removed', () => {
  const breakdown = buildMealCalorieBreakdown({
    label: 'Breakfast',
    meal: meal(['Crispy Chicken Thighs']),
    recipes: [recipe()],
    dailyCalories: 1775,
    slot: 'breakfast',
    planningInputs: { breakfastPct: '30', lunchPct: '35', dinnerPct: '25', snackPct: '10' },
    percentageTotal: 65,
  })

  assert.equal(breakdown.percentage, 30)
  assert.equal(breakdown.percentageTotal, 65)
  assert.equal(breakdown.targetCalories, 819.2)
  assert.match(breakdown.targetFormula, /1775 daily cal x 30 \/ 65 = 819 cal target/)
})
