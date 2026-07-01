import assert from 'node:assert/strict'
import test from 'node:test'

import {
  atwaterGeneralCalories,
  declaredServingMultiplier,
  resolvedFoodCalories,
} from './nutrition-math.ts'
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

test('uses one declared serving for a family recipe', () => {
  assert.equal(declaredServingMultiplier(4, true), 0.25)
  assert.equal(declaredServingMultiplier(6, true), 1 / 6)
  assert.equal(declaredServingMultiplier(4, false), 1)
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
