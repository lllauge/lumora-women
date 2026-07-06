import assert from 'node:assert/strict'
import test from 'node:test'

import {
  approxWeightMeasure,
  groceryDisplay,
  householdMeasure,
  shoppingPrepLines,
} from './household-measure.ts'
import { clientRecipeNotes } from './client-portion.ts'

test('converts gram weights to kitchen cups using ingredient-specific densities', () => {
  // Densities come from the paste-parser table, not a water assumption:
  // 90g rolled oats is one full cup, not ~⅓ of a 237g water-cup.
  assert.equal(householdMeasure('rolled oats', 90), '1 cup rolled oats')
  assert.equal(householdMeasure('rolled oats', 45), '½ cup rolled oats')
  assert.equal(householdMeasure('quinoa', 113), '⅔ cup quinoa')
  assert.equal(householdMeasure('white rice', 370), '2 cups white rice')
  assert.equal(householdMeasure('milk', 240), '1 cup milk')
})

test('shows spoons for oils and spices, promoting to larger units when practical', () => {
  assert.equal(householdMeasure('olive oil', 14), '1 tbsp olive oil')
  assert.equal(householdMeasure('olive oil', 7), '½ tbsp olive oil')
  assert.equal(householdMeasure('cinnamon', 2.5), '1 tsp cinnamon')
  assert.equal(householdMeasure('kosher salt', 18), '1 tbsp kosher salt')
  assert.equal(householdMeasure('butter', 57), '¼ cup butter')
})

test('counts eggs and garlic instead of weighing them', () => {
  assert.equal(householdMeasure('Egg, whole, cooked (4 large)', 200), '4 large eggs')
  assert.equal(householdMeasure('garlic', 9), '3 cloves garlic')
})

test('falls back to ounces and pounds for foods without a cup density', () => {
  assert.equal(householdMeasure('chicken breast', 200), null)
  assert.equal(approxWeightMeasure(200), '7 oz')
  assert.equal(approxWeightMeasure(907), '2 lb')
})

test('prep lines convert cooked entries to raw buying weights in both units', () => {
  const [chicken, rice, seasoning] = shoppingPrepLines([
    '[fdc:1] 150g chicken breast, cooked',
    '[fdc:2] 185g white rice, cooked',
    'Black pepper, to taste',
  ])
  // 150g cooked chicken needs ~200g raw (×1.33); label flips to raw.
  assert.equal(chicken.grams, '200g chicken breast, raw')
  assert.equal(chicken.easy, '7 oz chicken breast, raw')
  assert.equal(chicken.state, 'raw')
  // 185g cooked rice comes from ~62g dry rice (×1/3) — ⅓ cup.
  assert.equal(rice.grams, '62g white rice, raw')
  assert.equal(rice.easy, '⅓ cup white rice, raw')
  // Weightless seasoning lines pass through unchanged in both modes.
  assert.equal(seasoning.grams, 'Black pepper, to taste')
  assert.equal(seasoning.easy, 'Black pepper, to taste')
})

test('grocery display keeps its shopper-friendly formatting', () => {
  assert.equal(groceryDisplay('[fdc:1] 907g chicken breast, cooked'), 'chicken breast, raw, 2.75 lb')
  assert.equal(groceryDisplay('[fdc:2] 6g kosher salt'), '1 tsp kosher salt')
  assert.equal(groceryDisplay('[fdc:3] 100g Egg, whole, raw (2 large)'), '2 large eggs')
})

test('bulk spoon amounts escalate to cups instead of piling up tablespoons', () => {
  // A month of salt aggregated onto the grocery list: 702g is 117 tsp.
  // Nobody measures 39 tablespoons — show 2½ cups.
  assert.equal(groceryDisplay('[fdc:2] 702g sea salt'), '2½ cups sea salt')
  assert.equal(householdMeasure('sea salt', 702), '2½ cups sea salt')
  assert.equal(groceryDisplay('[fdc:4] 234g salt'), '¾ cup salt')
  // Oils cross into cups at 4 tbsp on the grocery list too.
  assert.equal(groceryDisplay('[fdc:5] 112g olive oil'), '½ cup olive oil')
  // Small amounts keep their natural spoon units.
  assert.equal(groceryDisplay('[fdc:6] 4g cumin'), '2 tsp cumin')
  assert.equal(groceryDisplay('[fdc:7] 28g olive oil'), '2 tbsp olive oil')
})

test('client recipe notes hide sources and the USDA calculation trail', () => {
  const notes = [
    'Great with a squeeze of lime.',
    'Source: https://www.allrecipes.com/some-chicken-recipe',
    'USDA calculated full-recipe nutrition for dinner. Declared-serving input weight: 500g. Full recipe USDA total: 1200 cal, 90g protein, 100g carbs, 40g fats.',
    'Final macro-fitted client portion: 0.28 of the full recipe (420 cal).',
    'Swap Greek yogurt for sour cream to boost protein.',
  ].join('\n\n')
  assert.equal(
    clientRecipeNotes(notes),
    'Great with a squeeze of lime.\n\nSwap Greek yogurt for sour cream to boost protein.',
  )
  assert.equal(clientRecipeNotes('Source: https://example.com/recipe'), '')
  assert.equal(clientRecipeNotes(''), '')
})
