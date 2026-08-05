import assert from 'node:assert/strict'
import test from 'node:test'

import { slotLinkRecipeAssignments } from './plan-slot-recipes.ts'

function recipe(overrides = {}) {
  return {
    name: 'Crispy Chicken Thighs',
    mealType: 'dinner',
    servings: '5',
    familyServings: '5',
    clientServing: 'old serving',
    clientServingMultiplier: '0.2',
    portionPinned: false,
    clientServingGrams: '224g',
    clientServingMeasure: 'old measure',
    clientServingBreakdown: 'old breakdown',
    prepTime: '',
    cookTime: '',
    calories: '460',
    protein: '40g',
    carbs: '1g',
    fats: '20g',
    fiber: '0g',
    ingredients: ['1000g chicken thighs', '14g olive oil'],
    instructions: ['Bake.'],
    swaps: [],
    notes: '',
    ...overrides,
  }
}

function meal(names) {
  return {
    name: names.join(' + '),
    recipeName: names[0] ?? '',
    recipeNames: names,
    description: '',
    macros: '',
  }
}

function libraryRecipe(overrides = {}) {
  return {
    name: 'Crispy Chicken Thighs',
    meal_type: 'dinner',
    family_servings: '5',
    ingredients: ['1000g chicken thighs', '14g olive oil'],
    instructions: ['Bake.'],
    notes: '',
    ...overrides,
  }
}

test('library-backed recipes are split into independent meal-slot cards', () => {
  const plan = {
    macroTargets: { calories: '1775' },
    mealPlan: [
      { day: 'Monday', breakfast: meal(['Crispy Chicken Thighs']), lunch: meal([]), dinner: meal([]), snacks: [], notes: '' },
      { day: 'Tuesday', breakfast: meal(['Crispy Chicken Thighs']), lunch: meal([]), dinner: meal([]), snacks: [], notes: '' },
    ],
    recipes: [recipe()],
    workoutPlan: [],
    groceryList: [],
    adminNotes: '',
    clientNotes: '',
    status: 'draft',
    generatedByAi: false,
  }
  const next = slotLinkRecipeAssignments(plan, [libraryRecipe()])

  assert.deepEqual(next.mealPlan[0].breakfast.recipeNames, ['Crispy Chicken Thighs (d1-breakfast)'])
  assert.deepEqual(next.mealPlan[1].breakfast.recipeNames, ['Crispy Chicken Thighs (d2-breakfast)'])
  const monday = next.recipes.find((item) => item.name === 'Crispy Chicken Thighs (d1-breakfast)')
  const tuesday = next.recipes.find((item) => item.name === 'Crispy Chicken Thighs (d2-breakfast)')
  assert.ok(monday)
  assert.ok(tuesday)
  assert.equal(monday.clientServingMultiplier, '')
  assert.equal(tuesday.calories, '')
  assert.notEqual(monday, tuesday)
})

test('plan-only recipes are also split so old clients can be repaired', () => {
  const plan = {
    macroTargets: { calories: '1775' },
    mealPlan: [
      { day: 'Monday', breakfast: meal([]), lunch: meal(['One-off Pasta']), dinner: meal([]), snacks: [], notes: '' },
      { day: 'Wednesday', breakfast: meal([]), lunch: meal(['One-off Pasta']), dinner: meal([]), snacks: [], notes: '' },
    ],
    recipes: [recipe({ name: 'One-off Pasta', ingredients: ['500g pasta'], instructions: ['Cook.'] })],
    workoutPlan: [],
    groceryList: [],
    adminNotes: '',
    clientNotes: '',
    status: 'draft',
    generatedByAi: false,
  }
  const next = slotLinkRecipeAssignments(plan)

  assert.deepEqual(next.mealPlan[0].lunch.recipeNames, ['One-off Pasta (d1-lunch)'])
  assert.deepEqual(next.mealPlan[1].lunch.recipeNames, ['One-off Pasta (d2-lunch)'])
  assert.ok(next.recipes.some((item) => item.name === 'One-off Pasta (d1-lunch)'))
  assert.ok(next.recipes.some((item) => item.name === 'One-off Pasta (d2-lunch)'))
})

test('custom slot foods and already-linked cards are left alone', () => {
  const plan = {
    macroTargets: { calories: '1775' },
    mealPlan: [{
      day: 'Monday',
      breakfast: meal(['Custom breakfast (d1-breakfast)']),
      lunch: meal(['Crispy Chicken Thighs (d1-lunch)']),
      dinner: meal([]),
      snacks: [],
      notes: '',
    }],
    recipes: [
      recipe({ name: 'Custom breakfast (d1-breakfast)' }),
      recipe({ name: 'Crispy Chicken Thighs (d1-lunch)' }),
    ],
    workoutPlan: [],
    groceryList: [],
    adminNotes: '',
    clientNotes: '',
    status: 'draft',
    generatedByAi: false,
  }
  const next = slotLinkRecipeAssignments(plan, [libraryRecipe()])

  assert.equal(next, plan)
})
