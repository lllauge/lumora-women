import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGroceryList, canonicalGroceryKey, mergeGroceryList } from './grocery-list.ts'

function plan({ recipes, days }) {
  return {
    mealPlan: days.map((meals) => ({
      day: '',
      breakfast: { name: '', description: '', macros: '', recipeName: '', recipeNames: [] },
      lunch: { name: '', description: '', macros: '', recipeName: '', recipeNames: [] },
      dinner: { name: meals.join(' + '), description: '', macros: '', recipeName: '', recipeNames: meals },
      snacks: [],
      notes: '',
    })),
    recipes: recipes.map((r) => ({
      name: r.name,
      mealType: '', servings: '', familyServings: '', clientServing: '',
      clientServingMultiplier: '', clientServingGrams: '', clientServingMeasure: '',
      clientServingBreakdown: '', prepTime: '', cookTime: '', calories: '',
      protein: '', carbs: '', fats: '', fiber: '',
      ingredients: r.ingredients, instructions: [], swaps: [], notes: '',
    })),
    workoutPlan: [], groceryList: [], adminNotes: '', clientNotes: '',
    status: 'draft', generatedByAi: false,
    macroTargets: { calories: '', protein: '', carbs: '', fats: '', fiber: '', water: '', steps: '', workoutTarget: '' },
  }
}

test('same food under different USDA phrasings merges into one line', () => {
  const list = buildGroceryList(plan({
    recipes: [
      { name: 'A', ingredients: ['[fdc:1] 14g Oil, olive, extra virgin'] },
      { name: 'B', ingredients: ['[fdc:2] 28g Olive oil'] },
      { name: 'C', ingredients: ['[fdc:3] 14g Extra virgin olive oil (California olive ranch)'] },
    ],
    days: [['A', 'B', 'C']],
  }))
  const oil = list.filter((line) => /olive/i.test(line))
  assert.equal(oil.length, 1)
  assert.equal(oil[0], '56g olive oil')
})

test('egg lines with different counts in the label sum into one entry', () => {
  const list = buildGroceryList(plan({
    recipes: [
      { name: 'A', ingredients: ['[fdc:1] 400g Egg, whole, raw (8 large)'] },
      { name: 'B', ingredients: ['[fdc:2] 500g Egg, whole, raw (10 large)'] },
      { name: 'C', ingredients: ['9 large eggs'] },
    ],
    days: [['A', 'B', 'C']],
  }))
  const eggs = list.filter((line) => /egg/i.test(line))
  assert.equal(eggs.length, 1)
  assert.equal(eggs[0], '1350g eggs')
})

test('typed household spice amounts convert and merge with gram lines', () => {
  const list = buildGroceryList(plan({
    recipes: [
      { name: 'A', ingredients: ['1¼ tbsp black pepper', '[fdc:1] 4g Black pepper'] },
      { name: 'B', ingredients: ['3 tsp ground pepper', '[fdc:2] 6g Pepper'] },
    ],
    days: [['A', 'B']],
  }))
  const pepper = list.filter((line) => /pepper/i.test(line))
  assert.equal(pepper.length, 1)
  // 1.25 tbsp = 3.75 tsp ×2g + 4g + 3 tsp ×2g + 6g = 23.5g
  assert.equal(pepper[0], '24g black pepper')
})

test('salt variants merge but kosher salt stays its own line', () => {
  const list = buildGroceryList(plan({
    recipes: [
      { name: 'A', ingredients: ['2 tbsp salt', '1 tbsp Sea salt'] },
      { name: 'B', ingredients: ['1 tbsp fine sea salt', '[fdc:1] 64g kosher salt (not consumed)'] },
    ],
    days: [['A', 'B']],
  }))
  const salts = list.filter((line) => /salt/i.test(line))
  assert.deepEqual(salts.sort(), ['64g kosher salt', '72g salt'])
})

test('garlic cloves from separate recipes total into one line', () => {
  const list = buildGroceryList(plan({
    recipes: [
      { name: 'A', ingredients: ['12 cloves garlic'] },
      { name: 'B', ingredients: ['8 cloves garlic'] },
    ],
    days: [['A', 'B']],
  }))
  assert.deepEqual(list.filter((line) => /garlic/i.test(line)), ['60g garlic'])
})

test('genuinely different foods never merge', () => {
  const list = buildGroceryList(plan({
    recipes: [{
      name: 'A',
      ingredients: [
        '[fdc:1] 100g green bell pepper',
        '[fdc:2] 100g red bell pepper',
        '[fdc:3] 100g onion',
        '[fdc:4] 100g red onion',
        '[fdc:5] 10g Black pepper',
        '[fdc:6] 10g garlic powder',
        '[fdc:7] 30g garlic',
      ],
    }],
    days: [['A']],
  }))
  assert.equal(list.length, 7)
})

test('serving-size parentheticals drop from display, brands stay', () => {
  const list = buildGroceryList(plan({
    recipes: [
      { name: 'A', ingredients: ['[fdc:1] 170g Almond milk, unsweetened (6 fl oz)'] },
      { name: 'B', ingredients: ['[fdc:2] 90g Almond milk, unsweetened (3 fl oz)'] },
      { name: 'C', ingredients: ['[fdc:3] 100g Chickpeas pasta, Penne (Banza)'] },
    ],
    days: [['A', 'B', 'C']],
  }))
  assert.ok(list.includes('260g Almond milk, unsweetened'), list.join(' | '))
  assert.ok(list.includes('100g Chickpeas pasta, Penne (Banza)'), list.join(' | '))
})

test('list comes back alphabetized by food name', () => {
  const list = buildGroceryList(plan({
    recipes: [{ name: 'A', ingredients: ['[fdc:1] 100g mushrooms', '[fdc:2] 100g asparagus', '[fdc:3] 100g capers'] }],
    days: [['A']],
  }))
  assert.deepEqual(list, ['100g asparagus', '100g capers', '100g mushrooms'])
})

test('coach-typed staples dedupe against the generated list by food identity', () => {
  const merged = mergeGroceryList(
    ['olive oil', 'paper towels', '2 tbsp salt'],
    ['56g olive oil', '72g salt'],
  )
  assert.deepEqual(merged, ['56g olive oil', '72g salt', 'paper towels'])
})

test('macro-neutral descriptors (brand, organic, size, boneless) merge; macro-relevant ones do not', () => {
  // Same food, same macros → one line.
  assert.equal(canonicalGroceryKey('Organic large eggs (Vital Farms)'), 'eggs')
  assert.equal(
    canonicalGroceryKey('Chicken breast, boneless skinless, raw'),
    canonicalGroceryKey('chicken breast'),
  )
  assert.equal(
    canonicalGroceryKey('wild-caught salmon fillet'),
    canonicalGroceryKey('Salmon fillet'),
  )
  // Different macros → separate lines.
  assert.notEqual(
    canonicalGroceryKey('Turkey, ground, 93% lean/7% fat'),
    canonicalGroceryKey('Turkey, ground, 80% lean/20% fat'),
  )
  assert.notEqual(
    canonicalGroceryKey('Almond milk, unsweetened'),
    canonicalGroceryKey('Almond milk, vanilla'),
  )
  assert.notEqual(
    canonicalGroceryKey('chicken thighs, skin-on'),
    canonicalGroceryKey('chicken thighs'),
  )
})

test('canonical keys ignore word order, plurals, and parentheticals', () => {
  assert.equal(canonicalGroceryKey('Oil, olive, extra virgin'), canonicalGroceryKey('extra virgin olive oil (Brand)'))
  assert.equal(canonicalGroceryKey('Egg, whole, raw (8 large)'), 'eggs')
  assert.equal(canonicalGroceryKey('sundried tomatoes (365 whole foods market)'), canonicalGroceryKey('Sundried tomato'))
  assert.notEqual(canonicalGroceryKey('red bell pepper'), canonicalGroceryKey('black pepper'))
})
