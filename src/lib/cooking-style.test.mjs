import assert from 'node:assert/strict'
import test from 'node:test'

import { groceryListOptions, isIndividualPlanStyle, mealPrepBadges } from './cooking-style.ts'

function meal(names) {
  return { name: names.join(' + '), description: '', macros: '', recipeName: '', recipeNames: names }
}

function day(label, dinnerRecipes) {
  return {
    day: label,
    breakfast: meal([]),
    lunch: meal([]),
    dinner: meal(dinnerRecipes),
    snacks: [],
    notes: '',
  }
}

function recipe(name, multiplier) {
  return {
    name,
    mealType: '', servings: '', familyServings: '', clientServing: '',
    clientServingMultiplier: multiplier, clientServingGrams: '', clientServingMeasure: '',
    clientServingBreakdown: '', prepTime: '', cookTime: '', calories: '',
    protein: '', carbs: '', fats: '', fiber: '',
    ingredients: ['[fdc:1] 100g Chicken breast, raw'], instructions: [], swaps: [], notes: '',
  }
}

test('both individual styles count as individual; family does not', () => {
  assert.equal(isIndividualPlanStyle('individual_only'), true)
  assert.equal(isIndividualPlanStyle('individual_fresh'), true)
  assert.equal(isIndividualPlanStyle('family_dinners'), false)
  assert.equal(isIndividualPlanStyle(undefined), false)
})

test('grocery options map each style to its math', () => {
  assert.deepEqual(groceryListOptions('family_dinners'), { soloClient: false, freshCook: false })
  assert.deepEqual(groceryListOptions('individual_only'), { soloClient: true, freshCook: false })
  assert.deepEqual(groceryListOptions('individual_fresh'), { soloClient: true, freshCook: true })
})

test('repeated batch recipe gets a cook badge first, leftover badges after', () => {
  const days = [
    { day: day('Monday', ['Chili']), index: 0 },
    { day: day('Wednesday', ['Chili']), index: 2 },
    { day: day('Friday', ['Chili']), index: 4 },
  ]
  const badges = mealPrepBadges(days, [recipe('Chili', '0.25')])
  assert.equal(badges.get('0:Chili').kind, 'cook')
  assert.match(badges.get('0:Chili').label, /Wednesday & Friday/)
  assert.equal(badges.get('2:Chili').kind, 'leftover')
  assert.match(badges.get('2:Chili').label, /from Monday/)
  assert.equal(badges.get('4:Chili').kind, 'leftover')
})

test('recipes cooked every time get no badge', () => {
  const days = [
    { day: day('Monday', ['Smoothie']), index: 0 },
    { day: day('Tuesday', ['Smoothie']), index: 1 },
  ]
  // Multiplier 1: one batch per use — nothing is a leftover.
  assert.equal(mealPrepBadges(days, [recipe('Smoothie', '1')]).size, 0)
})

test('single-use recipes get no badge', () => {
  const days = [{ day: day('Monday', ['Chili']), index: 0 }]
  assert.equal(mealPrepBadges(days, [recipe('Chili', '0.25')]).size, 0)
})

test('five uses of a quarter-portion pot flag a second batch midweek', () => {
  const days = [0, 1, 2, 3, 4].map((i) => ({
    day: day(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][i], ['Chili']),
    index: i,
  }))
  const badges = mealPrepBadges(days, [recipe('Chili', '0.25')])
  assert.match(badges.get('0:Chili').label, /covers about 4 meals/)
  assert.equal(badges.get('1:Chili').kind, 'leftover')
  assert.match(badges.get('1:Chili').label, /fresh batch/)
})

test('near-whole portions eaten daily get no batch coaching (Norma\'s oats)', () => {
  // ¾ of the recipe per breakfast: a batch can't cover a second meal, so
  // "cook day / leftovers" would just narrate cooking every morning.
  const week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const days = week.map((label, i) => ({ day: day(label, ['Overnight Oats']), index: i }))
  assert.equal(mealPrepBadges(days, [recipe('Overnight Oats', '0.75')]).size, 0)
})

test('a barely-over-half portion still counts as a two-meal batch', () => {
  // 0.52 of the pot: within the slack, one cook covers two meals.
  const days = [
    { day: day('Monday', ['Soup']), index: 0 },
    { day: day('Thursday', ['Soup']), index: 3 },
  ]
  const badges = mealPrepBadges(days, [recipe('Soup', '0.52')])
  assert.equal(badges.get('0:Soup').kind, 'cook')
  assert.equal(badges.get('3:Soup').kind, 'leftover')
})

test('pinned recipes cook per use: no leftover badges, no batch math', () => {
  const days = [
    { day: day('Monday', ['Oats']), index: 0 },
    { day: day('Wednesday', ['Oats']), index: 2 },
  ]
  const pinned = { ...recipe('Oats', '0.25'), portionPinned: true }
  assert.equal(mealPrepBadges(days, [pinned]).size, 0)
})
