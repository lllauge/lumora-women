import assert from 'node:assert/strict'
import test from 'node:test'

import {
  atwaterGeneralCalories,
  declaredServingMultiplier,
  resolvedFoodCalories,
  resolvedServingMultiplier,
  scaleFullRecipeNutrition,
  shouldReviewEnergyDifference,
} from './nutrition-math.ts'
import { fitRecipeServingMultipliers } from './meal-portion-fitting.ts'
import {
  inferredDiscardedBrineIndexes,
  isCanonicalZeroNutritionIngredient,
  isExcludedNutritionIngredient,
  setIngredientNutritionExcluded,
} from './nutrition-ingredient.ts'
import {
  getCuratedBrandedFood,
  searchCuratedBrandedFoods,
} from './curated-branded-foods.ts'
import { matchCommonFood } from './usda/common-foods.ts'

test('uses one declared serving for a family recipe', () => {
  assert.equal(declaredServingMultiplier(4, true), 0.25)
  assert.equal(declaredServingMultiplier(6, true), 1 / 6)
  assert.equal(declaredServingMultiplier(4, false), 1)
})

test('preserves a fitted serving multiplier through later nutrition passes', () => {
  assert.equal(resolvedServingMultiplier('0.218', 4, true), 0.218)
  assert.equal(resolvedServingMultiplier('', 4, true), 0.25)
  assert.equal(resolvedServingMultiplier('not a number', 4, true), 0.25)
})

test('falls back to an equal family share when a stored multiplier claims the whole pot', () => {
  // A plan drafted in individual style then switched to family style carries
  // clientServingMultiplier "1" — pricing a whole family recipe as one client
  // serving. Family recipes only honor an actually carved share (0 < m < 1).
  assert.equal(resolvedServingMultiplier('1', 4, true), 0.25)
  assert.equal(resolvedServingMultiplier('1.25', 6, true), 1 / 6)
  // Individual recipes still honor multipliers of 1 and above.
  assert.equal(resolvedServingMultiplier('1', 4, false), 1)
  assert.equal(resolvedServingMultiplier('1.3', 1, false), 1.3)
})

test('reduces oversized dinner and snack portions to fit the daily targets', () => {
  const meal = (recipeName) => ({
    name: recipeName,
    description: '',
    macros: '',
    recipeName,
    recipeNames: [recipeName],
  })
  const recipe = (name, calories, protein, carbs, fats, multiplier = 1) => ({
    name,
    mealType: '',
    servings: '',
    familyServings: '',
    clientServing: '',
    clientServingMultiplier: `${multiplier}`,
    clientServingGrams: '',
    clientServingMeasure: '',
    clientServingBreakdown: '',
    prepTime: '',
    cookTime: '',
    calories: `${calories}`,
    protein: `${protein}g`,
    carbs: `${carbs}g`,
    fats: `${fats}g`,
    fiber: '0g',
    ingredients: [],
    instructions: [],
    swaps: [],
    notes: '',
  })
  const plan = {
    macroTargets: {
      calories: '1700',
      protein: '140g',
      carbs: '155g',
      fats: '70g',
      fiber: '24g',
      water: '',
      steps: '',
      workoutTarget: '',
    },
    mealPlan: [{
      day: 'Monday',
      breakfast: meal('Breakfast'),
      lunch: meal('Lunch'),
      dinner: meal('Dinner'),
      snacks: [meal('Snack')],
      notes: '',
    }],
    recipes: [
      recipe('Breakfast', 592, 37.8, 57.9, 22.4),
      recipe('Lunch', 525, 55.2, 34.9, 17.7),
      recipe('Dinner', 487, 27.1, 32.6, 29.4, 0.25),
      recipe('Snack', 245, 20.9, 31.8, 3.3),
    ],
    workoutPlan: [],
    groceryList: [],
    adminNotes: '',
    clientNotes: '',
    status: 'draft',
    generatedByAi: true,
  }

  const fitted = fitRecipeServingMultipliers(plan, {
    breakfastPct: '35',
    lunchPct: '30',
    dinnerPct: '25',
    snackPct: '10',
  })
  assert.ok(fitted.get('Dinner') < 0.25)
  assert.ok(fitted.get('Snack') < 1)

  const totalCalories = plan.recipes.reduce((sum, item) => (
    sum + Number(item.calories) * (fitted.get(item.name) / Number(item.clientServingMultiplier))
  ), 0)
  assert.ok(Math.abs(totalCalories - 1700) <= 5)
})

test('never resizes exact custom-slot food quantities while fitting recipes', () => {
  const exactCustomName = 'Custom breakfast (d1-breakfast)'
  const meal = {
    name: 'Breakfast',
    description: '',
    macros: '',
    recipeName: 'Oats',
    recipeNames: ['Oats', exactCustomName],
  }
  const baseRecipe = {
    mealType: '',
    servings: '',
    familyServings: '',
    clientServing: '',
    clientServingMultiplier: '1',
    clientServingGrams: '',
    clientServingMeasure: '',
    clientServingBreakdown: '',
    prepTime: '',
    cookTime: '',
    protein: '20g',
    carbs: '20g',
    fats: '10g',
    fiber: '5g',
    ingredients: [],
    instructions: [],
    swaps: [],
    notes: '',
  }
  const plan = {
    macroTargets: {
      calories: '500',
      protein: '40g',
      carbs: '40g',
      fats: '20g',
      fiber: '20g',
      water: '',
      steps: '',
      workoutTarget: '',
    },
    mealPlan: [{
      day: 'Monday',
      breakfast: meal,
      lunch: { ...meal, recipeName: '', recipeNames: [], name: '' },
      dinner: { ...meal, recipeName: '', recipeNames: [], name: '' },
      snacks: [],
      notes: '',
    }],
    recipes: [
      { ...baseRecipe, name: 'Oats', calories: '300' },
      { ...baseRecipe, name: exactCustomName, calories: '250' },
    ],
    workoutPlan: [],
    groceryList: [],
    adminNotes: '',
    clientNotes: '',
    status: 'draft',
    generatedByAi: true,
  }

  const fitted = fitRecipeServingMultipliers(plan, { breakfastPct: '100' })
  assert.equal(fitted.has(exactCustomName), false)
  assert.ok(fitted.has('Oats'))
})

test('scales full-recipe totals once and never re-divides saved serving calories', () => {
  const multiplier = declaredServingMultiplier(6, true)
  assert.deepEqual(scaleFullRecipeNutrition({
    calories: 1037.2,
    protein: 15.2,
    carbs: 185.8,
    fats: 28.1,
    fiber: 28.5,
    multiplier,
  }), {
    calories: 173,
    protein: 2.5,
    carbs: 31,
    fats: 4.7,
    fiber: 4.8,
  })
})

test('keeps reported USDA energy when it differs from general 4/4/9 math', () => {
  assert.equal(resolvedFoodCalories({
    reportedCalories: 77,
    protein: 1,
    carbs: 10,
    fats: 2,
  }), 77)
})

test('recovers missing oil energy from macros instead of counting zero calories', () => {
  assert.equal(resolvedFoodCalories({
    reportedCalories: 0,
    protein: 0,
    carbs: 0,
    fats: 9.1,
  }), 81.89999999999999)
  assert.equal(atwaterGeneralCalories(0, 0, 9.1), 81.89999999999999)
})

test('ignores tiny rounding differences but reviews materially large energy drift', () => {
  assert.equal(shouldReviewEnergyDifference(15, 18), false)
  assert.equal(shouldReviewEnergyDifference(595, 713), true)
})

test('recognizes plain water and salts as canonical zero-nutrient ingredients', () => {
  assert.equal(isCanonicalZeroNutritionIngredient('946.4g Water'), true)
  assert.equal(isCanonicalZeroNutritionIngredient('58.3g kosher salt'), true)
  assert.equal(isCanonicalZeroNutritionIngredient('250g chicken broth'), false)
})

test('marks discarded brine ingredients explicitly and reversibly', () => {
  const marked = setIngredientNutritionExcluded('946.4g Water', true)
  assert.equal(marked, '946.4g Water (not consumed)')
  assert.equal(isExcludedNutritionIngredient(marked), true)
  assert.equal(setIngredientNutritionExcluded(marked, false), '946.4g Water')
})

test('auto-excludes brine water and only the large brining salt amount', () => {
  const excluded = inferredDiscardedBrineIndexes([
    { name: 'chicken breast', grams: 907.2 },
    { name: 'water', grams: 946.4 },
    { name: 'kosher salt', grams: 58.3 },
    { name: 'sea salt', grams: 4.9 },
  ], [
    'Brine the chicken in the water and salt.',
    'Drain the salt water, rinse the chicken, and pat dry.',
  ])
  assert.deepEqual([...excluded], [1, 2])
})

test('finds the label-verified Truvani chocolate protein and preserves its serving macros', () => {
  const results = searchCuratedBrandedFoods('truvani pea protein chocolate')
  assert.equal(results[0]?.curatedId, 'truvani-plant-protein-chocolate')
  const food = getCuratedBrandedFood('truvani-plant-protein-chocolate')
  assert.deepEqual({
    grams: food?.servingGrams,
    calories: food?.calories,
    protein: food?.protein,
    carbs: food?.carbs,
    fats: food?.fats,
    fiber: food?.fiber,
  }, {
    grams: 33,
    calories: 130,
    protein: 20,
    carbs: 5,
    fats: 3,
    fiber: 2,
  })
})

test('maps plural sweet potatoes to the raw sweet potato staple', () => {
  const food = matchCommonFood('sweet potatoes')
  assert.equal(food?.displayName, 'Sweet potato, raw')
  assert.equal(food?.usdaQuery, 'sweet potato raw unprepared')
  assert.equal(food?.fdcId, 168482)
})

test('maps chili powder to the USDA spice instead of powdered sugar', () => {
  const food = matchCommonFood('chili powder')
  assert.equal(food?.displayName, 'Chili powder')
  assert.equal(food?.fdcId, 171319)
})

test('maps blueberries and lemon juice to complete, ingredient-specific USDA records', () => {
  assert.equal(matchCommonFood('Blueberries, raw')?.fdcId, 171711)
  assert.equal(matchCommonFood('lemon juice')?.fdcId, 167747)
  assert.equal(matchCommonFood('lemon')?.displayName, 'Lemon, raw')
})
