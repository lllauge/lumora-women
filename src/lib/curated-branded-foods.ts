export type CuratedBrandedFood = {
  id: string
  description: string
  brand: string
  servingLabel: string
  servingGrams: number
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber: number
  keywords: string[]
}

/**
 * Label-verified foods that are not currently available in USDA Branded Foods.
 * Values are per labeled serving and should only be added from a clear package
 * Nutrition Facts panel.
 */
export const CURATED_BRANDED_FOODS: CuratedBrandedFood[] = [
  {
    id: 'truvani-plant-protein-chocolate',
    description: 'Plant Based Protein Powder, Chocolate',
    brand: 'TRUVANI',
    servingLabel: '1 scoop',
    servingGrams: 33,
    calories: 130,
    protein: 20,
    carbs: 5,
    fats: 3,
    fiber: 2,
    keywords: ['truvani', 'truvani chocolate', 'truvani pea protein', 'chocolate plant protein'],
  },
]

export function getCuratedBrandedFood(id: string) {
  return CURATED_BRANDED_FOODS.find((food) => food.id === id)
}

export function searchCuratedBrandedFoods(query: string) {
  const normalized = query.toLowerCase().trim()
  if (!normalized) return []
  return CURATED_BRANDED_FOODS.filter((food) => (
    food.keywords.some((keyword) => normalized.includes(keyword) || keyword.includes(normalized))
  )).map((food) => {
    const per100 = (value: number) => Math.round((value * 100 / food.servingGrams) * 10) / 10
    return {
      fdcId: 0,
      curatedId: food.id,
      description: food.description,
      dataType: 'Verified package label',
      brand: food.brand,
      calories: per100(food.calories),
      protein: per100(food.protein),
      carbs: per100(food.carbs),
      fats: per100(food.fats),
      measures: [{ label: food.servingLabel, grams: food.servingGrams }],
    }
  })
}
