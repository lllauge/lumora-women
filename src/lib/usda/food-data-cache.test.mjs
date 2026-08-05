import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateRecipeNutritionFromUsda } from './food-data.ts'

test('concurrent recipe copies share one USDA food-detail lookup', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    await new Promise((resolve) => setTimeout(resolve, 20))
    return new Response(JSON.stringify({
      fdcId: 999999901,
      description: 'TEST FOOD',
      dataType: 'Foundation',
      foodNutrients: [
        { nutrient: { id: 1008, name: 'Energy' }, amount: 200 },
        { nutrient: { id: 1003, name: 'Protein' }, amount: 10 },
        { nutrient: { id: 1005, name: 'Carbohydrate, by difference' }, amount: 20 },
        { nutrient: { id: 1004, name: 'Total lipid (fat)' }, amount: 8 },
        { nutrient: { id: 1079, name: 'Fiber, total dietary' }, amount: 4 },
      ],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const [lunch, snack] = await Promise.all([
      calculateRecipeNutritionFromUsda({
        ingredients: ['[fdc:999999901] 100g test food'],
        clientServingMultiplier: '0.5',
        apiKey: 'test-key',
      }),
      calculateRecipeNutritionFromUsda({
        ingredients: ['[fdc:999999901] 100g test food'],
        clientServingMultiplier: '0.25',
        apiKey: 'test-key',
      }),
    ])

    assert.equal(calls, 1)
    assert.equal(lunch.clientServing.calories, 100)
    assert.equal(snack.clientServing.calories, 50)
  } finally {
    globalThis.fetch = originalFetch
  }
})
