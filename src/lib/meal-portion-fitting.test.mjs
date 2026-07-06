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

test('a stale inflated carve is re-fitted to the targets, not preserved', () => {
  // The sweet potato card kept a corrupt half-pot carve of a 6-serving
  // recipe. The fit re-derives the portion from the targets (the card macros
  // scale with the baseline, so the baseline cancels out), bringing the day
  // back to the 1775 target instead of compounding around the bad carve.
  const plan = incidentPlan({
    sweetPotato: {
      clientServingMultiplier: '0.5',
      calories: '519', protein: '7.6g', carbs: '93g', fats: '14g',
    },
  })
  const fitted = fitRecipeServingMultipliers(plan, percentages)
  const potato = fitted.get('Roasted Sweet Potato')
  assert.ok(potato !== undefined)
  assert.ok(potato < 0.4, `expected the half-pot carve corrected down, got ${potato}`)
  const dayTotal = dayCaloriesAfterFit(plan, fitted)
  assert.ok(
    Math.abs(dayTotal - 1775) / 1775 < 0.025,
    `expected day near 1775 cal, got ${Math.round(dayTotal)}`,
  )
})

test('a light family pot can exceed its declared equal share', () => {
  // Serves 4, but the whole pot is only 1000 cal. With a 500-cal dinner
  // target the client needs two declared servings — half the pot. The old
  // fitter capped family portions at 1.5x the equal share (0.375); the
  // declared serving count must not bound the fit.
  const plan = {
    macroTargets: { calories: '2000', protein: '150g', carbs: '175g', fats: '78g' },
    mealPlan: [{
      day: 'Monday',
      breakfast: meal(['Custom breakfast (d1-breakfast)']),
      lunch: meal(['Custom lunch (d1-lunch)']),
      dinner: meal(['Sheet-Pan Chicken']),
      snacks: [meal(['Custom Snack (d1-snack0)'])],
    }],
    recipes: [
      recipe({ name: 'Custom breakfast (d1-breakfast)', calories: '700', protein: '52g', carbs: '61g', fats: '27g' }),
      recipe({ name: 'Custom lunch (d1-lunch)', calories: '600', protein: '45g', carbs: '53g', fats: '23g' }),
      recipe({ name: 'Custom Snack (d1-snack0)', calories: '200', protein: '15g', carbs: '17g', fats: '8g' }),
      recipe({
        name: 'Sheet-Pan Chicken',
        familyServings: '4',
        clientServingMultiplier: '0.25',
        calories: '250', protein: '18.8g', carbs: '21.9g', fats: '9.8g',
      }),
    ],
  }
  const fitted = fitRecipeServingMultipliers(plan, percentages)
  const portion = fitted.get('Sheet-Pan Chicken')
  assert.ok(portion !== undefined)
  assert.ok(
    portion > 0.45 && portion < 0.55,
    `expected roughly half the pot, got ${portion}`,
  )
})

test('a family portion is never the whole pot as one serving', () => {
  // Even when the targets ask for more food than the pot holds, the portion
  // caps at 90% — a family recipe priced as (more than) the entire pot for
  // one client is never valid.
  const plan = {
    macroTargets: { calories: '2000', protein: '150g', carbs: '175g', fats: '78g' },
    mealPlan: [{
      day: 'Monday',
      breakfast: meal(['Custom breakfast (d1-breakfast)']),
      lunch: meal(['Custom lunch (d1-lunch)']),
      dinner: meal(['Tiny Pot']),
      snacks: [],
    }],
    recipes: [
      recipe({ name: 'Custom breakfast (d1-breakfast)', calories: '700', protein: '52g', carbs: '61g', fats: '27g' }),
      recipe({ name: 'Custom lunch (d1-lunch)', calories: '600', protein: '45g', carbs: '53g', fats: '23g' }),
      recipe({
        name: 'Tiny Pot',
        familyServings: '2',
        clientServingMultiplier: '0.5',
        calories: '150', protein: '11g', carbs: '13g', fats: '6g',
      }),
    ],
  }
  const fitted = fitRecipeServingMultipliers(plan, percentages)
  const portion = fitted.get('Tiny Pot')
  assert.ok(portion !== undefined)
  assert.ok(portion <= 0.9 + 1e-9, `expected at most 0.9 of the pot, got ${portion}`)
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

test('individual-style plans scale exact-gram recipes to slot targets, not family shares', () => {
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
  // Four identical 500-cal dishes against 35/30/25/10 slot shares of 1500:
  // each portion scales straight to its slot target (525/450/375/150 cal),
  // starting from the exact-gram baseline of 1, not a 1/4 family share.
  const expected = { A: 1.05, B: 0.9, C: 0.75, D: 0.3 }
  for (const [name, want] of Object.entries(expected)) {
    const next = fitted.get(name)
    assert.ok(next !== undefined)
    assert.ok(Math.abs(next - want) < 0.02, `${name}: expected ~${want}, got ${next}`)
  }
  const dayTotal = dayCaloriesAfterFit(plan, fitted)
  assert.ok(
    Math.abs(dayTotal - 1500) / 1500 < 0.025,
    `expected day near 1500 cal, got ${Math.round(dayTotal)}`,
  )
})

test('returns nothing without a calorie target', () => {
  const plan = incidentPlan({
    sweetPotato: { clientServingMultiplier: '0.25', calories: '259' },
  })
  plan.macroTargets = { calories: '' }
  assert.equal(fitRecipeServingMultipliers(plan, percentages).size, 0)
})
