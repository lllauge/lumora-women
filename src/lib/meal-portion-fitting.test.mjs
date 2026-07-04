import assert from 'node:assert/strict'
import test from 'node:test'

import { fitRecipeServingMultipliers } from './meal-portion-fitting.ts'

function recipe(overrides = {}) {
  return {
    name: 'Recipe',
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
    ingredients: ['100g food'],
    instructions: [],
    swaps: [],
    notes: '',
    ...overrides,
  }
}

function meal(recipeNames) {
  return {
    name: recipeNames.join(' + '),
    recipeName: recipeNames[0] ?? '',
    recipeNames,
    description: '',
    macros: '',
  }
}

// Mirrors the 2026-07-03 incident: a client on 1775 calories whose lunch
// recipes carry carved shares, with the rest of the day fixed custom foods.
function incidentPlan({ sweetPotato }) {
  return {
    macroTargets: { calories: '1775', protein: '135g', carbs: '151g', fats: '70g' },
    mealPlan: [{
      day: 'Monday',
      breakfast: meal(['Custom breakfast (d1-breakfast)']),
      lunch: meal(['Baked Chicken Breast', 'Roasted Sweet Potato']),
      dinner: meal(['Custom dinner (d1-dinner)']),
      snacks: [meal(['Custom Snack (d1-snack0)'])],
    }],
    recipes: [
      recipe({ name: 'Custom breakfast (d1-breakfast)', calories: '683', protein: '38g', carbs: '58g', fats: '30g' }),
      recipe({ name: 'Custom dinner (d1-dinner)', calories: '393', protein: '27g', carbs: '33g', fats: '17g' }),
      recipe({ name: 'Custom Snack (d1-snack0)', calories: '130', protein: '20g', carbs: '5g', fats: '3g' }),
      recipe({
        name: 'Baked Chicken Breast',
        familyServings: '4',
        clientServingMultiplier: '0.25',
        calories: '337', protein: '51g', carbs: '1.5g', fats: '12.6g',
      }),
      recipe({
        name: 'Roasted Sweet Potato',
        familyServings: '6',
        ...sweetPotato,
      }),
    ],
  }
}

const percentages = { breakfastPct: '35', lunchPct: '30', dinnerPct: '25', snackPct: '10' }

function dayCaloriesAfterFit(plan, fitted) {
  return plan.mealPlan[0] && ['breakfast', 'lunch', 'dinner']
    .flatMap((slot) => plan.mealPlan[0][slot].recipeNames)
    .concat(plan.mealPlan[0].snacks.flatMap((snack) => snack.recipeNames))
    .reduce((total, name) => {
      const r = plan.recipes.find((candidate) => candidate.name === name)
      if (!r) return total
      const calories = parseFloat(r.calories) || 0
      const current = parseFloat(r.clientServingMultiplier) || 1
      const next = fitted.get(name)
      return total + (next ? calories * (next / current) : calories)
    }, 0)
}

test('re-carves inflated portions back to the daily calorie target', () => {
  // The sweet potato card kept a 0.25 share after the recipe grew to a
  // 6-serving pot, pushing the day to ~1802 against a 1775 target.
  const plan = incidentPlan({
    sweetPotato: {
      clientServingMultiplier: '0.25',
      calories: '259', protein: '3.8g', carbs: '46.5g', fats: '7g',
    },
  })
  const fitted = fitRecipeServingMultipliers(plan, percentages)
  const dayTotal = dayCaloriesAfterFit(plan, fitted)
  assert.ok(
    Math.abs(dayTotal - 1775) / 1775 < 0.025,
    `expected day near 1775 cal, got ${Math.round(dayTotal)}`,
  )
})

test('portions are bounded by the declared serving, not the stale carve', () => {
  // Half the pot of a 6-serving recipe can never survive a refit: the bound
  // anchors to the declared 1/6 share (max 1.5x = 0.25), so repeated saves
  // converge instead of compounding around a corrupt baseline.
  const plan = incidentPlan({
    sweetPotato: {
      clientServingMultiplier: '0.5',
      calories: '519', protein: '7.6g', carbs: '93g', fats: '14g',
    },
  })
  const fitted = fitRecipeServingMultipliers(plan, percentages)
  const potato = fitted.get('Roasted Sweet Potato')
  assert.ok(potato !== undefined)
  assert.ok(potato <= 0.25 + 1e-9, `expected at most 0.25 of the pot, got ${potato}`)
  assert.ok(potato >= 1 / 6 * 0.5 - 1e-9)
})

test('custom slot foods are never resized', () => {
  const plan = incidentPlan({
    sweetPotato: {
      clientServingMultiplier: '0.25',
      calories: '259', protein: '3.8g', carbs: '46.5g', fats: '7g',
    },
  })
  const fitted = fitRecipeServingMultipliers(plan, percentages)
  for (const name of fitted.keys()) {
    assert.doesNotMatch(name, /\(d\d+-/)
  }
})

test('a plan already on target is a stable fixpoint', () => {
  const plan = {
    macroTargets: { calories: '1700', protein: '130g', carbs: '149g', fats: '65g' },
    mealPlan: [{
      day: 'Monday',
      breakfast: meal(['A']),
      lunch: meal(['B']),
      dinner: meal(['C']),
      snacks: [meal(['D'])],
    }],
    recipes: [
      recipe({ name: 'A', familyServings: '4', clientServingMultiplier: '0.25', calories: '595', protein: '45.5g', carbs: '52.2g', fats: '22.8g' }),
      recipe({ name: 'B', familyServings: '4', clientServingMultiplier: '0.25', calories: '510', protein: '39g', carbs: '44.7g', fats: '19.5g' }),
      recipe({ name: 'C', familyServings: '6', clientServingMultiplier: '0.167', calories: '425', protein: '32.5g', carbs: '37.3g', fats: '16.3g' }),
      recipe({ name: 'D', familyServings: '2', clientServingMultiplier: '0.5', calories: '170', protein: '13g', carbs: '14.9g', fats: '6.5g' }),
    ],
  }
  const fitted = fitRecipeServingMultipliers(plan, percentages)
  for (const r of plan.recipes) {
    const next = fitted.get(r.name)
    const current = parseFloat(r.clientServingMultiplier)
    assert.ok(next !== undefined)
    assert.ok(
      Math.abs(next - current) / current < 0.005,
      `${r.name}: expected ~${current}, got ${next}`,
    )
  }
})

test('individual-style plans scale exact-gram recipes around 1, not family shares', () => {
  const plan = {
    macroTargets: { calories: '1500', protein: '115g', carbs: '131g', fats: '58g' },
    mealPlan: [{
      day: 'Monday',
      breakfast: meal(['A']),
      lunch: meal(['B']),
      dinner: meal(['C']),
      snacks: [meal(['D'])],
    }],
    recipes: [
      // familyServings is declared but ignored in individual style: the
      // recipe is exact grams as entered, so its baseline share is 1.
      recipe({ name: 'A', familyServings: '4', clientServingMultiplier: '1', calories: '500', protein: '38g', carbs: '44g', fats: '19g' }),
      recipe({ name: 'B', familyServings: '4', clientServingMultiplier: '1', calories: '500', protein: '38g', carbs: '44g', fats: '19g' }),
      recipe({ name: 'C', familyServings: '4', clientServingMultiplier: '1', calories: '500', protein: '38g', carbs: '44g', fats: '19g' }),
      recipe({ name: 'D', familyServings: '4', clientServingMultiplier: '1', calories: '500', protein: '38g', carbs: '44g', fats: '19g' }),
    ],
  }
  const fitted = fitRecipeServingMultipliers(plan, { ...percentages, mealPlanStyle: 'individual_only' })
  for (const r of plan.recipes) {
    const next = fitted.get(r.name)
    assert.ok(next !== undefined)
    assert.ok(next >= 0.5 - 1e-9 && next <= 1.5 + 1e-9, `${r.name}: ${next} outside [0.5, 1.5]`)
  }
  // 2000 calories entered against a 1500 target: portions must come down.
  assert.ok(fitted.get('B') < 1)
})

test('returns nothing without a calorie target', () => {
  const plan = incidentPlan({
    sweetPotato: { clientServingMultiplier: '0.25', calories: '259' },
  })
  plan.macroTargets = { calories: '' }
  assert.equal(fitRecipeServingMultipliers(plan, percentages).size, 0)
})
