import assert from 'node:assert/strict'
import { test } from 'node:test'

import { extractJsonLdRecipe, extractVisibleNutrition, ingredientNameFromRaw, scaleSiteNutrition } from './url-importer.ts'

test('scales website per-serving nutrition to whole-recipe totals', () => {
  const totals = scaleSiteNutrition({
    calories: '466.7 kcal',
    proteinContent: '25.7g',
    carbohydrateContent: '7.3 g',
    fatContent: '37.7g',
    fiberContent: '2g',
  }, 6)

  assert.deepEqual(totals, {
    calories: 2800,
    protein: 154.2,
    carbs: 43.8,
    fats: 226.2,
    fiber: 12,
  })
})

test('preserves distinct food names from raw URL recipe ingredients', () => {
  assert.equal(ingredientNameFromRaw('1/4 cup pitted Kalamata olives'), 'pitted Kalamata olives')
  assert.equal(ingredientNameFromRaw('1/4 cup pitted Castelvetrano olives'), 'pitted Castelvetrano olives')
  assert.equal(ingredientNameFromRaw('1 to 2 teaspoons dried oregano'), 'dried oregano')
  assert.equal(ingredientNameFromRaw('6 to 8 boneless skinless chicken thighs'), 'boneless skinless chicken thighs')
  assert.equal(ingredientNameFromRaw('1 large orange bell pepper, cored and sliced into 1/2-inch thick slices'), 'orange bell pepper')
})

test('prefers structured recipe nodes that include nutrition', () => {
  const html = `
    <script type="application/ld+json">
      {
        "@graph": [
          {
            "@type": "Recipe",
            "name": "Ingredients only",
            "recipeYield": "6 servings",
            "recipeIngredient": ["3/4 cup olive oil"]
          },
          {
            "@type": "Recipe",
            "name": "Nutrition node",
            "recipeYield": "6 servings",
            "nutrition": { "calories": "466.7 kcal" },
            "recipeIngredient": ["3/4 cup olive oil"]
          }
        ]
      }
    </script>
  `

  const recipe = extractJsonLdRecipe(html)

  assert.equal(recipe?.name, 'Nutrition node')
  assert.equal(recipe?.nutrition?.calories, '466.7 kcal')
})

test('extracts visible recipe nutrition blocks when JSON-LD nutrition is missing', () => {
  const nutrition = extractVisibleNutrition(`
    <div>
      <p>Calories: 466.7kcal</p>
      <p>Fat: 37.7g</p>
      <p>Carbohydrates: 7.3g</p>
      <p>Protein: 25.7g</p>
      <p>Fiber: 2g</p>
    </div>
  `)

  assert.deepEqual(nutrition, {
    calories: '466.7',
    proteinContent: '25.7',
    carbohydrateContent: '7.3',
    fatContent: '37.7',
    fiberContent: '2',
  })
})
