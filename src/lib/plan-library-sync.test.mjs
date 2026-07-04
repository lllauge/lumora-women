import assert from 'node:assert/strict'
import test from 'node:test'

import {
  findLibraryRecipe,
  isCustomSlotRecipeName,
  normalizeRecipeName,
  syncRecipesWithLibrary,
} from './plan-library-sync.ts'

function planRecipe(overrides = {}) {
  return {
    name: 'Roasted Sweet Potato',
    mealType: 'dinner',
    servings: '4',
    familyServings: '4',
    clientServing: '250g roasted sweet potato',
    clientServingMultiplier: '0.25',
    clientServingGrams: '250g',
    clientServingMeasure: 'Serve 25% of the full recipe.',
    clientServingBreakdown: '226.8g sweet potatoes + 6.8g Olive oil',
    prepTime: '',
    cookTime: '',
    calories: '255',
    protein: '3.6g',
    carbs: '45g',
    fats: '7g',
    fiber: '7g',
    ingredients: ['680g sweet potatoes', '20g Olive oil'],
    instructions: ['Roast.'],
    swaps: [],
    notes: '',
    ...overrides,
  }
}

function libraryRecipe(overrides = {}) {
  return {
    name: 'Roasted Sweet Potato',
    meal_type: 'dinner',
    family_servings: '4',
    ingredients: ['680g sweet potatoes', '20g Olive oil'],
    instructions: ['Roast.'],
    notes: '',
    ...overrides,
  }
}

test('normalizeRecipeName ignores case and whitespace drift', () => {
  assert.equal(
    normalizeRecipeName('  overnight oats -  Blueberry '),
    normalizeRecipeName('Overnight Oats - blueberry'),
  )
})

test('findLibraryRecipe matches names case-insensitively', () => {
  const library = [libraryRecipe({ name: 'Overnight oats - Blueberry' })]
  assert.equal(
    findLibraryRecipe(library, 'overnight oats - Blueberry'),
    library[0],
  )
  assert.equal(findLibraryRecipe(library, 'Green Smoothie'), undefined)
  assert.equal(findLibraryRecipe(library, ''), undefined)
})

test('sync copies the current library snapshot onto the plan card', () => {
  const recipe = planRecipe()
  const library = libraryRecipe({
    ingredients: ['680g sweet potatoes', '20g Olive oil', '1.2g paprika'],
    instructions: ['Season and roast.'],
    notes: 'Flip halfway.',
  })
  const [synced] = syncRecipesWithLibrary([recipe], [library])
  assert.deepEqual(synced.ingredients, library.ingredients)
  assert.deepEqual(synced.instructions, library.instructions)
  assert.equal(synced.notes, 'Flip halfway.')
  // Ingredient edits alone keep the fitted portion: the share of the pot the
  // client eats is still deliberate, and the fitter re-trues it to targets.
  assert.equal(synced.clientServingMultiplier, '0.25')
})

test('sync preserves cards without a library counterpart', () => {
  const recipe = planRecipe({ name: 'One-off recipe' })
  const [synced] = syncRecipesWithLibrary([recipe], [libraryRecipe()])
  assert.deepEqual(synced, recipe)
})

test('custom per-slot recipes never sync', () => {
  const recipe = planRecipe({ name: 'Custom lunch (d1-lunch)' })
  const library = libraryRecipe({ name: 'Custom lunch (d1-lunch)', ingredients: ['100g rice'] })
  const [synced] = syncRecipesWithLibrary([recipe], [library])
  assert.deepEqual(synced, recipe)
  assert.equal(isCustomSlotRecipeName(recipe.name), true)
})

test('a changed declared serving count resets the carved portion', () => {
  // The incident this guards against: a recipe rescaled from 4 to 6 family
  // servings kept its old 0.25 carved share, silently growing the client's
  // portion from an equal share to a quarter of a bigger pot.
  const recipe = planRecipe()
  const library = libraryRecipe({
    family_servings: '6',
    ingredients: ['907.2g sweet potatoes', '27g Olive oil'],
  })
  const [synced] = syncRecipesWithLibrary([recipe], [library])
  assert.equal(synced.familyServings, '6')
  assert.equal(synced.servings, '6')
  assert.equal(synced.clientServingMultiplier, '')
  assert.equal(synced.clientServing, '')
  assert.equal(synced.clientServingGrams, '')
  assert.equal(synced.clientServingMeasure, '')
  assert.equal(synced.clientServingBreakdown, '')
})

test('an unchanged serving count keeps the carved portion', () => {
  const [synced] = syncRecipesWithLibrary([planRecipe()], [libraryRecipe()])
  assert.equal(synced.clientServingMultiplier, '0.25')
  assert.equal(synced.clientServingBreakdown, '226.8g sweet potatoes + 6.8g Olive oil')
})

test('a blank library serving count never wipes the carved portion', () => {
  const [synced] = syncRecipesWithLibrary(
    [planRecipe()],
    [libraryRecipe({ family_servings: '' })],
  )
  assert.equal(synced.familyServings, '4')
  assert.equal(synced.clientServingMultiplier, '0.25')
})
