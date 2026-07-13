import assert from 'node:assert/strict'
import test from 'node:test'

import {
  cleanIngredientText,
  clientPortionFactor,
  clientPortionLines,
  portionFraction,
  portionSummaryLine,
} from './client-portion.ts'
import { resolvedServingMultiplier } from './nutrition-math.ts'

function recipe(overrides = {}) {
  return {
    name: 'Test recipe',
    mealType: 'dinner',
    servings: '',
    familyServings: '',
    clientServing: '',
    clientServingMultiplier: '',
    clientServingGrams: '',
    clientServingMeasure: '',
    clientServingBreakdown: '',
    prepTime: '',
    cookTime: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    fiber: '',
    ingredients: [],
    instructions: [],
    swaps: [],
    notes: '',
    ...overrides,
  }
}

test('family recipe with a carved multiplier weighs out exactly the saved share', () => {
  const r = recipe({
    familyServings: '4',
    clientServingMultiplier: '0.3',
    ingredients: ['[fdc:1] 400g chicken breast, cooked', '[fdc:2] 200g white rice, cooked'],
  })
  assert.equal(clientPortionFactor(r), 0.3)
  const lines = clientPortionLines(r)
  assert.deepEqual(lines.map((l) => l.grams), [120, 60])
})

test('family recipe defaults to an equal share when the multiplier is blank or the whole pot', () => {
  for (const stored of ['', '1', 'not a number']) {
    const r = recipe({ familyServings: '4', clientServingMultiplier: stored })
    assert.equal(clientPortionFactor(r), 0.25, `stored="${stored}"`)
  }
})

test('individual-style plans weigh out exact entered grams even with declared family servings', () => {
  // Recipe Library rows default family_servings to "4". Under an
  // individual-only plan the grams are exactly what the client eats, so the
  // portal must not carve them into quarters while the macros show the whole
  // recipe.
  const r = recipe({
    familyServings: '4',
    clientServingMultiplier: '1',
    ingredients: ['[fdc:1] 150g chicken breast, cooked', '[fdc:2] 90g quinoa, cooked'],
  })
  assert.equal(clientPortionFactor(r, true), 1)
  assert.deepEqual(clientPortionLines(r, true).map((l) => l.grams), [150, 90])
  assert.equal(
    portionSummaryLine(r, true),
    '150g chicken breast, cooked · 90g quinoa, cooked',
  )
})

test('portal portion factor always matches the server serving multiplier', () => {
  const cases = [
    { stored: '0.25', familyServings: '4', individual: false },
    { stored: '0.218', familyServings: '4', individual: false },
    { stored: '', familyServings: '6', individual: false },
    { stored: '1', familyServings: '4', individual: false },
    { stored: '1', familyServings: '4', individual: true },
    { stored: '1.3', familyServings: '', individual: false },
    { stored: '', familyServings: '', individual: false },
    { stored: '5', familyServings: '', individual: false },
  ]
  for (const { stored, familyServings, individual } of cases) {
    const familyCount = Number.parseFloat(familyServings) || 0
    const isFamily = !individual && familyCount > 1
    const server = resolvedServingMultiplier(stored, familyCount, isFamily)
    const portal = clientPortionFactor(
      recipe({ familyServings, clientServingMultiplier: stored }),
      individual,
    )
    assert.equal(
      portal,
      server,
      `stored="${stored}" familyServings="${familyServings}" individual=${individual}`,
    )
  }
})

test('scaled counts carry through only when they land on whole items', () => {
  const r = recipe({
    familyServings: '2',
    clientServingMultiplier: '0.5',
    ingredients: ['[fdc:1] 200g Egg, whole, cooked (4 large)'],
  })
  const [line] = clientPortionLines(r)
  assert.equal(line.grams, 100)
  assert.equal(line.count, '2 large')
  assert.equal(portionSummaryLine(r), '2 large eggs')
})

test('all-caps USDA descriptions are sentence-cased for client display', () => {
  assert.equal(
    cleanIngredientText('[fdc:123] 15g EXTRA VIRGIN OLIVE OIL (CALIFORNIA OLIVE RANCH)'),
    '15g Extra virgin olive oil (California olive ranch)',
  )
  assert.equal(
    cleanIngredientText('2g MRS. DASH, ORIGINAL SALT-FREE SEASONING BLEND (MRS. DASH)'),
    '2g Mrs. dash, Original salt-free seasoning blend (Mrs. dash)',
  )
  // Coach-typed mixed case passes through untouched.
  assert.equal(cleanIngredientText('5g fine sea salt'), '5g fine sea salt')
  assert.equal(cleanIngredientText('907g Sweet potatoes'), '907g Sweet potatoes')
  // Short all-caps tokens that are likely intentional stay as-is.
  assert.equal(cleanIngredientText('BBQ rub'), 'BBQ rub')
})

test('no-scale fraction stays honest to the true multiplier', () => {
  assert.deepEqual(portionFraction(0.25), { label: '¼', qualifier: null, parts: 4, take: 1 })
  assert.deepEqual(portionFraction(0.27), { label: '¼', qualifier: 'generous', parts: 4, take: 1 })
  assert.equal(portionFraction(0.29), null)
  assert.deepEqual(portionFraction(1), { label: 'the whole recipe', qualifier: null, parts: 1, take: 1 })
  assert.equal(portionFraction(1.3), null)
})

test('no-scale fraction carries the division for multi-part shares', () => {
  // Half the pot: split into 2, take 1 — the fit the new portion math can
  // produce for a light family recipe.
  assert.deepEqual(portionFraction(0.5), { label: 'half', qualifier: null, parts: 2, take: 1 })
  // Non-unit fractions tell her how many of the equal portions are hers.
  assert.deepEqual(portionFraction(2 / 3), { label: '⅔', qualifier: null, parts: 3, take: 2 })
  assert.deepEqual(portionFraction(0.38), { label: '⅜', qualifier: null, parts: 8, take: 3 })
})

test('a pinned recipe is always the whole recipe, whatever the stored carve says', () => {
  // Pin set after a fit carved ¾ — display must not wait for the next save.
  const r = recipe({
    portionPinned: true,
    clientServingMultiplier: '0.75',
    familyServings: '4',
    ingredients: ['[fdc:1] 40g Oats, dry', '[fdc:2] 100g Blueberries, raw'],
  })
  assert.equal(clientPortionFactor(r, true), 1)
  assert.equal(clientPortionFactor(r, false), 1)
  const lines = clientPortionLines(r, true)
  assert.equal(lines[0].grams, 40)
  assert.equal(lines[1].grams, 100)
})
