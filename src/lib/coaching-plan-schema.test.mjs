import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isSlotRecipeName,
  mealRecipeNames,
  normalizedSlotRecipeName,
  stripSlotRecipeSuffixes,
  withMealRecipeNames,
} from './coaching-plan-schema.ts'

const emptyMeal = {
  name: '',
  description: '',
  macros: '',
  recipeName: '',
  recipeNames: [],
}

test('supports multiple recipes while retaining the legacy primary recipe', () => {
  const meal = withMealRecipeNames(emptyMeal, ['Baked Chicken', 'Sweet Potato', 'Baked Chicken'])
  assert.deepEqual(meal.recipeNames, ['Baked Chicken', 'Sweet Potato'])
  assert.equal(meal.recipeName, 'Baked Chicken')
  assert.equal(meal.name, 'Baked Chicken + Sweet Potato')
  assert.deepEqual(mealRecipeNames(meal), ['Baked Chicken', 'Sweet Potato'])
})

test('reads legacy single-recipe meals without migration', () => {
  assert.deepEqual(mealRecipeNames({ ...emptyMeal, recipeName: 'Baked Chicken' }), ['Baked Chicken'])
})

test('normalizes repeated internal slot suffixes to one stable suffix', () => {
  const malformed = 'Custom breakfast (d1-breakfast) (d1-breakfast) (d1-breakfast)'
  assert.equal(stripSlotRecipeSuffixes(malformed), 'Custom breakfast')
  assert.equal(normalizedSlotRecipeName(malformed, 'Custom breakfast', 'd1-breakfast'), 'Custom breakfast (d1-breakfast)')
  assert.equal(isSlotRecipeName(malformed, 'd1-breakfast'), true)
})
