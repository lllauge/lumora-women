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
      mealType: '', servings: r.servings ?? '', familyServings: '', clientServing: '',
      clientServingMultiplier: r.clientServingMultiplier ?? '', clientServingGrams: '', clientServingMeasure: '',
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

test('boiled/poached whole eggs merge with raw whole eggs; egg whites stay separate', () => {
  const list = buildGroceryList(plan({
    recipes: [
      { name: 'A', ingredients: ['[fdc:171287] 100g Egg, whole, raw, large (2 large)', '[fdc:172183] 130g Egg white, raw'] },
      { name: 'B', ingredients: ['[fdc:2707154] 150g Egg, whole, boiled or poached (3 egg)'] },
    ],
    days: [['A', 'B']],
  }))
  const eggs = list.filter((line) => /egg/i.test(line))
  assert.deepEqual(eggs.sort(), ['130g Egg white, raw', '250g eggs'])
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

test('solo client: repeats of a multi-serving recipe are leftovers from one batch', () => {
  // 4-serving pot (client portion 0.25) eaten 4 times in the week = 1 cook.
  const fourServingPot = {
    name: 'Chicken Bowl',
    servings: '4',
    clientServingMultiplier: '0.25',
    ingredients: ['[fdc:1] 996g Chicken breast, boneless skinless, raw'],
  }
  const days = [['Chicken Bowl'], ['Chicken Bowl'], ['Chicken Bowl'], ['Chicken Bowl']]
  assert.deepEqual(
    buildGroceryList(plan({ recipes: [fourServingPot], days }), { soloClient: true }),
    ['996g Chicken breast, boneless skinless, raw'],
  )
  // Family plans still cook the pot every time — the family eats the rest.
  assert.deepEqual(
    buildGroceryList(plan({ recipes: [fourServingPot], days })),
    ['3984g Chicken breast, boneless skinless, raw'],
  )
})

test('solo client: a fifth use of a 4-serving pot needs a second batch', () => {
  const pot = {
    name: 'Chili',
    clientServingMultiplier: '0.25',
    ingredients: ['[fdc:1] 800g Beef, ground, 93% lean, raw'],
  }
  const days = [['Chili'], ['Chili'], ['Chili'], ['Chili'], ['Chili']]
  assert.deepEqual(
    buildGroceryList(plan({ recipes: [pot], days }), { soloClient: true }),
    ['1600g Beef, ground, 93% lean, raw'],
  )
})

test('solo client: macro-fitted portion jitter does not buy a second batch', () => {
  // Fitted portion 0.27 × 4 uses = 1.08 pots — she portions one pot slightly
  // smaller instead of buying a whole second pot.
  const pot = {
    name: 'Bake',
    clientServingMultiplier: '0.27',
    ingredients: ['[fdc:1] 996g Chicken breast, boneless skinless, raw'],
  }
  const days = [['Bake'], ['Bake'], ['Bake'], ['Bake']]
  assert.deepEqual(
    buildGroceryList(plan({ recipes: [pot], days }), { soloClient: true }),
    ['996g Chicken breast, boneless skinless, raw'],
  )
})

test('solo client: single-serving recipes still buy one batch per use', () => {
  const smoothie = {
    name: 'Smoothie',
    clientServingMultiplier: '1',
    ingredients: ['[fdc:1] 150g Blueberries, frozen'],
  }
  const days = [['Smoothie'], ['Smoothie'], ['Smoothie']]
  assert.deepEqual(
    buildGroceryList(plan({ recipes: [smoothie], days }), { soloClient: true }),
    ['450g Blueberries, frozen'],
  )
})

test('solo client: blank multiplier falls back to whole-recipe-per-use', () => {
  const unknown = {
    name: 'Mystery',
    ingredients: ['[fdc:1] 100g Oats, dry'],
  }
  const days = [['Mystery'], ['Mystery']]
  assert.deepEqual(
    buildGroceryList(plan({ recipes: [unknown], days }), { soloClient: true }),
    ['200g Oats, dry'],
  )
})

test('fresh cook: quantities scale to exactly what she eats, no leftovers bought', () => {
  // 4-serving pot, portion 0.25, eaten 3× fresh = buy 0.75 of the recipe.
  const pot = {
    name: 'Chicken Bowl',
    clientServingMultiplier: '0.25',
    ingredients: ['[fdc:1] 996g Chicken breast, boneless skinless, raw'],
  }
  const days = [['Chicken Bowl'], ['Chicken Bowl'], ['Chicken Bowl']]
  assert.deepEqual(
    buildGroceryList(plan({ recipes: [pot], days }), { soloClient: true, freshCook: true }),
    ['747g Chicken breast, boneless skinless, raw'],
  )
})

test('fresh cook: unweighable lines round up to whole purchases', () => {
  const pot = {
    name: 'Stir Fry',
    clientServingMultiplier: '0.25',
    ingredients: ['frozen cauliflower rice bag'],
  }
  const days = [['Stir Fry'], ['Stir Fry']]
  // 2 uses × 0.25 = 0.5 of a bag — you still buy one bag.
  assert.deepEqual(
    buildGroceryList(plan({ recipes: [pot], days }), { soloClient: true, freshCook: true }),
    ['frozen cauliflower rice bag'],
  )
})

test('fresh cook: single-serving recipes are unchanged', () => {
  const smoothie = {
    name: 'Smoothie',
    clientServingMultiplier: '1',
    ingredients: ['[fdc:1] 150g Blueberries, frozen'],
  }
  const days = [['Smoothie'], ['Smoothie']]
  assert.deepEqual(
    buildGroceryList(plan({ recipes: [smoothie], days }), { soloClient: true, freshCook: true }),
    ['300g Blueberries, frozen'],
  )
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

test('cooking methods never split a food into separate lines', () => {
  // USDA cook-state clauses in every phrasing key to the raw food.
  assert.equal(
    canonicalGroceryKey('Chicken, broilers or fryers, breast, meat only, cooked, roasted'),
    canonicalGroceryKey('Chicken, broilers or fryers, breast, meat only, raw'),
  )
  assert.equal(
    canonicalGroceryKey('Fish, salmon, Atlantic, farmed, cooked, dry heat'),
    canonicalGroceryKey('Fish, salmon, Atlantic, farmed, raw'),
  )
  assert.equal(
    canonicalGroceryKey('Beef, brisket, whole, separable lean only, cooked, braised'),
    canonicalGroceryKey('Beef, brisket, whole, separable lean only, raw'),
  )
  assert.equal(
    canonicalGroceryKey('Broccoli, cooked, boiled, drained, without salt'),
    canonicalGroceryKey('Broccoli, raw'),
  )
  assert.equal(canonicalGroceryKey('Egg, whole, boiled or poached'), 'eggs')
  // Product forms are NOT cooking methods — they stay separate…
  assert.notEqual(canonicalGroceryKey('Salmon, smoked'), canonicalGroceryKey('Salmon, raw'))
  assert.notEqual(canonicalGroceryKey('Apricots, dried'), canonicalGroceryKey('Apricots, raw'))
  // …and so do products whose name contains a cooking word.
  assert.notEqual(canonicalGroceryKey('baked beans'), canonicalGroceryKey('beans'))
  assert.notEqual(canonicalGroceryKey('fried rice'), canonicalGroceryKey('rice'))
})

test('canonical keys ignore word order, plurals, and parentheticals', () => {
  assert.equal(canonicalGroceryKey('Oil, olive, extra virgin'), canonicalGroceryKey('extra virgin olive oil (Brand)'))
  assert.equal(canonicalGroceryKey('Egg, whole, raw (8 large)'), 'eggs')
  assert.equal(canonicalGroceryKey('sundried tomatoes (365 whole foods market)'), canonicalGroceryKey('Sundried tomato'))
  assert.notEqual(canonicalGroceryKey('red bell pepper'), canonicalGroceryKey('black pepper'))
})
