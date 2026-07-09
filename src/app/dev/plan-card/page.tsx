import { notFound } from 'next/navigation'
import DayMeals from '@/components/coaching/DayMeals'
import GroceryChecklist from '@/components/coaching/GroceryChecklist'
import { buildGroceryList } from '@/lib/grocery-list'
import { groceryDisplay } from '@/lib/coaching-engagement'
import { CoachingPlanSchema, MealDaySchema, RecipeSchema } from '@/lib/coaching-plan-schema'

// Dev-only harness: renders the client plan meal card with fixture data so
// portion display and mobile layout can be checked without a client login.
// 404s in production.
export default function PlanCardPreview() {
  if (process.env.NODE_ENV === 'production') notFound()

  const recipes = [
    RecipeSchema.parse({
      name: 'Baked Chicken Breast',
      familyServings: '4',
      clientServingMultiplier: '0.27',
      prepTime: '10 min',
      cookTime: '30 min',
      calories: '369',
      protein: '56.2',
      carbs: '1.3',
      fats: '14',
      fiber: '0.5',
      ingredients: [
        '[fdc:171077] 996g Chicken breast, boneless skinless, raw',
        '[fdc:174851] 1036g Water (not consumed)',
        '[fdc:173468] 64g kosher salt (not consumed)',
        '[fdc:171413] 28g Olive oil',
        '[fdc:171327] 4g Italian seasoning',
        '[fdc:170926] 4g Garlic powder',
        '[fdc:173468] 4g Sea salt',
        '[fdc:170932] 2g smoked paprika',
        '[fdc:170931] 2g Black pepper',
      ],
      instructions: [
        'Brine the chicken in the water and kosher salt for 30 minutes, then drain and pat dry.',
        'Rub with olive oil and the seasonings.',
        'Bake at 425°F for 25–30 minutes until 165°F inside. Rest 5 minutes before slicing.',
      ],
      swaps: ['Swap smoked paprika for chili powder if the kids prefer it mild.'],
    }),
    RecipeSchema.parse({
      name: 'Roasted Sweet Potato',
      familyServings: '4',
      clientServingMultiplier: '0.25',
      cookTime: '35 min',
      calories: '112',
      protein: '2',
      carbs: '26',
      fats: '0.1',
      ingredients: ['[fdc:168482] 907g Sweet potatoes, raw', '[fdc:173468] 2g Sea salt'],
      instructions: ['Cube, season, and roast at 425°F for 35 minutes.'],
    }),
    RecipeSchema.parse({
      name: 'Custom lunch (d1-lunch)',
      clientServingMultiplier: '1',
      ingredients: ['170g Greek yogurt, plain, nonfat', '30g Granola', '80g Blueberries'],
    }),
    RecipeSchema.parse({
      name: 'Berry Protein Smoothie',
      clientServingMultiplier: '1',
      clientServingGrams: '425',
      prepTime: '5 min',
      calories: '310',
      protein: '32',
      carbs: '38',
      fats: '5',
      ingredients: ['[fdc:1] 30g Whey protein powder, vanilla', '[fdc:2] 150g Blueberries, frozen', '[fdc:3] 240g Unsweetened almond milk'],
      instructions: ['Blend everything until smooth.'],
    }),
  ]

  const day = MealDaySchema.parse({
    day: 'Monday',
    breakfast: {
      name: 'Berry Protein Smoothie',
      recipeNames: ['Berry Protein Smoothie'],
    },
    dinner: {
      name: 'Baked Chicken Breast + Roasted Sweet Potato + Custom lunch (d1-lunch)',
      recipeNames: ['Baked Chicken Breast', 'Roasted Sweet Potato', 'Custom lunch (d1-lunch)'],
    },
  })

  return (
    <div className="portal-layout">
      <header className="portal-mobile-header">
        <span className="gold-text" style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700 }}>
          Lumora Women
        </span>
      </header>
      <main id="main-content" className="portal-main">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
          My Plan (dev fixture)
        </h1>
        <div className="portal-card">
          <div className="portal-gold-line" aria-hidden="true" />
          <details className="portal-details" open>
            <summary style={{
              padding: '0.9375rem 1.25rem', minHeight: '52px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
            }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Monday
              </span>
            </summary>
            <div style={{ padding: '0.25rem 1.25rem 1rem' }}>
              <DayMeals
                day={day}
                dayIndex={0}
                recipes={recipes}
                individualPlanStyle={false}
                selectedMealIndex={0}
                selectedRecipeIndex={0}
              />
            </div>
          </details>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '2rem 0 0.75rem' }}>
          Grocery list (merge fixture)
        </h2>
        <div className="portal-card">
          <div className="portal-gold-line" aria-hidden="true" />
          <div style={{ padding: '1rem 1.25rem' }}>
            <GroceryChecklist
              items={buildGroceryList(CoachingPlanSchema.parse({
                mealPlan: [MealDaySchema.parse({
                  day: 'Monday',
                  dinner: { name: 'All', recipeNames: ['G1', 'G2', 'G3'] },
                })],
                recipes: [
                  RecipeSchema.parse({ name: 'G1', ingredients: [
                    '[fdc:1] 400g Egg, whole, raw (8 large)',
                    '[fdc:2] 14g Oil, olive, extra virgin',
                    '12 cloves garlic',
                    '2 tbsp salt',
                    '1¼ tbsp black pepper',
                    '[fdc:3] 170g Almond milk, unsweetened (6 fl oz)',
                  ] }),
                  RecipeSchema.parse({ name: 'G2', ingredients: [
                    '[fdc:4] 500g Egg, whole, raw (10 large)',
                    '[fdc:5] 28g Olive oil',
                    '8 cloves garlic',
                    '1 tbsp Sea salt',
                    '3 tsp ground pepper',
                    '[fdc:6] 90g Almond milk, unsweetened (3 fl oz)',
                    '[fdc:7] 100g green bell pepper',
                  ] }),
                  RecipeSchema.parse({ name: 'G3', ingredients: [
                    '9 large eggs',
                    '½ tbsp Extra virgin olive oil (California olive ranch)',
                    '[fdc:8] 64g kosher salt (not consumed)',
                    '[fdc:9] 15g Pepper',
                    '[fdc:10] 100g red bell pepper',
                    '[fdc:11] 4990g Chicken breast, boneless skinless, raw',
                  ] }),
                ],
              })).map((item) => groceryDisplay(item))}
              storageKey="dev-grocery-fixture"
            />
          </div>
        </div>
      </main>
    </div>
  )
}
