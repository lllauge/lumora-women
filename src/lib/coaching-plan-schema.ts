import { z } from 'zod'

export const MacroTargetsSchema = z.object({
  calories: z.string().default(''),
  protein: z.string().default(''),
  carbs: z.string().default(''),
  fats: z.string().default(''),
  fiber: z.string().default(''),
  water: z.string().default(''),
  steps: z.string().default(''),
  workoutTarget: z.string().default(''),
})

const emptyMacroTargets = {
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
  fiber: '',
  water: '',
  steps: '',
  workoutTarget: '',
}

export const MealSchema = z.object({
  name: z.string().default(''),
  description: z.string().default(''),
  macros: z.string().default(''),
  recipeName: z.string().default(''),
  recipeNames: z.array(z.string()).default([]),
})

const emptyMeal = {
  name: '',
  description: '',
  macros: '',
  recipeName: '',
  recipeNames: [],
}

export const MealDaySchema = z.object({
  day: z.string().default(''),
  breakfast: MealSchema.default(emptyMeal),
  lunch: MealSchema.default(emptyMeal),
  dinner: MealSchema.default(emptyMeal),
  snacks: z.array(MealSchema).default([]),
  notes: z.string().default(''),
})

export const RecipeSchema = z.object({
  name: z.string().default(''),
  mealType: z.string().default(''),
  servings: z.string().default(''),
  familyServings: z.string().default(''),
  clientServing: z.string().default(''),
  clientServingMultiplier: z.string().default(''),
  // Coach's pin: the recipe as written IS her portion. The macro fitter
  // never resizes a pinned card and every pricing path uses multiplier 1.
  // Absent from the AI draft schema on purpose — only Laura pins.
  portionPinned: z.boolean().default(false),
  clientServingGrams: z.string().default(''),
  clientServingMeasure: z.string().default(''),
  clientServingBreakdown: z.string().default(''),
  prepTime: z.string().default(''),
  cookTime: z.string().default(''),
  calories: z.string().default(''),
  protein: z.string().default(''),
  carbs: z.string().default(''),
  fats: z.string().default(''),
  fiber: z.string().default(''),
  ingredients: z.array(z.string()).default([]),
  instructions: z.array(z.string()).default([]),
  swaps: z.array(z.string()).default([]),
  notes: z.string().default(''),
})

export const WorkoutExerciseSchema = z.object({
  name: z.string().default(''),
  sets: z.string().default(''),
  reps: z.string().default(''),
  rest: z.string().default(''),
  videoUrl: z.string().default(''),
  notes: z.string().default(''),
})

export const WorkoutDaySchema = z.object({
  day: z.string().default(''),
  focus: z.string().default(''),
  warmup: z.string().default(''),
  exercises: z.array(WorkoutExerciseSchema).default([]),
  cardio: z.string().default(''),
  cooldown: z.string().default(''),
  notes: z.string().default(''),
})

export const CoachingPlanSchema = z.object({
  macroTargets: MacroTargetsSchema.default(emptyMacroTargets),
  mealPlan: z.array(MealDaySchema).default([]),
  recipes: z.array(RecipeSchema).default([]),
  workoutPlan: z.array(WorkoutDaySchema).default([]),
  groceryList: z.array(z.string()).default([]),
  adminNotes: z.string().default(''),
  clientNotes: z.string().default(''),
  status: z.enum(['draft', 'ready_for_client', 'published', 'archived']).default('draft'),
  generatedByAi: z.boolean().default(false),
})

export type CoachingPlanDraft = z.infer<typeof CoachingPlanSchema>
export type PlanMeal = z.infer<typeof MealSchema>

/** Multi-recipe names with transparent fallback for plans saved before this field existed. */
export function mealRecipeNames(meal: Pick<PlanMeal, 'recipeName' | 'recipeNames'>): string[] {
  const names = (meal.recipeNames ?? []).map((name) => name.trim()).filter(Boolean)
  if (names.length > 0) return [...new Set(names)]
  return meal.recipeName.trim() ? [meal.recipeName.trim()] : []
}

export function withMealRecipeNames(meal: PlanMeal, names: string[]): PlanMeal {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))]
  return {
    ...meal,
    recipeNames: unique,
    recipeName: unique[0] ?? '',
    name: unique.join(' + '),
  }
}

const SLOT_SUFFIXES = /(?:\s*\(d\d+-(?:breakfast|lunch|dinner|snack\d+)\))+$/

export function stripSlotRecipeSuffixes(name: string) {
  return name.replace(SLOT_SUFFIXES, '').trim()
}

export function isSlotRecipeName(name: string, slotKey: string) {
  return new RegExp(`(?:\\s*\\(${slotKey}\\))+$`).test(name)
}

export function normalizedSlotRecipeName(name: string, fallbackLabel: string, slotKey: string) {
  return `${stripSlotRecipeSuffixes(name) || fallbackLabel} (${slotKey})`
}

export const emptyCoachingPlan: CoachingPlanDraft = {
  macroTargets: emptyMacroTargets,
  mealPlan: [],
  recipes: [],
  workoutPlan: [],
  groceryList: [],
  adminNotes: '',
  clientNotes: '',
  status: 'draft',
  generatedByAi: false,
}

function firstNumber(value: string) {
  const match = value.match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function scaleMacro(value: string, factor: number) {
  const amount = firstNumber(value)
  if (!amount) return value
  const rounded = Math.round(amount * factor * 10) / 10
  return `${rounded}${/g\s*$/i.test(value) ? 'g' : ''}`
}

// Keep obviously corrupt portions from making old plans unusable. Intentional
// fitted portions above one full recipe are valid: they mean the client should
// scale the recipe up to hit the slot calorie target.
function normalizeOversizedFamilyRecipes(plan: CoachingPlanDraft): CoachingPlanDraft {
  let changed = false
  const recipes = plan.recipes.map((recipe) => {
    const familyServings = firstNumber(recipe.familyServings || recipe.servings)
    const multiplier = firstNumber(recipe.clientServingMultiplier)
    if (familyServings <= 1 || multiplier <= 4) return recipe

    changed = true
    const factor = 4 / multiplier
    const ingredientLines = recipe.ingredients
      .map((ingredient) => ingredient.replace(/^\[(?:fdc:\d+|curated:[a-z0-9-]+)\]\s*/i, '').trim())
      .filter(Boolean)
    const totalGrams = ingredientLines.reduce((total, ingredient) => {
      const match = ingredient.match(/^(\d+(?:\.\d+)?)\s*g\b/i)
      return total + (match ? Number(match[1]) : 0)
    }, 0)
    const breakdown = ingredientLines.filter((ingredient) => /^\d+(?:\.\d+)?\s*g\b/i.test(ingredient)).join(' + ')

    return {
      ...recipe,
      clientServingMultiplier: '4',
      clientServingGrams: totalGrams > 0 ? `${Math.round(totalGrams)}g` : '',
      clientServingMeasure: 'Prepare the recipe exactly as written. The ingredient amounts match the saved library recipe.',
      clientServingBreakdown: breakdown,
      clientServing: breakdown || (totalGrams > 0 ? `${Math.round(totalGrams)}g` : ''),
      calories: scaleMacro(recipe.calories, factor),
      protein: scaleMacro(recipe.protein, factor),
      carbs: scaleMacro(recipe.carbs, factor),
      fats: scaleMacro(recipe.fats, factor),
      fiber: scaleMacro(recipe.fiber, factor),
    }
  })
  return changed ? { ...plan, recipes } : plan
}

export function parseCoachingPlan(value: unknown): CoachingPlanDraft {
  const parsed = CoachingPlanSchema.safeParse(value)
  return parsed.success ? normalizeOversizedFamilyRecipes(parsed.data) : emptyCoachingPlan
}

export const CoachingPlanAiJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['macroTargets', 'mealPlan', 'recipes', 'workoutPlan', 'groceryList', 'adminNotes', 'clientNotes', 'status', 'generatedByAi'],
  properties: {
    macroTargets: {
      type: 'object',
      additionalProperties: false,
      required: ['calories', 'protein', 'carbs', 'fats', 'fiber', 'water', 'steps', 'workoutTarget'],
      properties: {
        calories: { type: 'string' },
        protein: { type: 'string' },
        carbs: { type: 'string' },
        fats: { type: 'string' },
        fiber: { type: 'string' },
        water: { type: 'string' },
        steps: { type: 'string' },
        workoutTarget: { type: 'string' },
      },
    },
    mealPlan: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['day', 'breakfast', 'lunch', 'dinner', 'snacks', 'notes'],
        properties: {
          day: { type: 'string' },
          breakfast: { $ref: '#/$defs/meal' },
          lunch: { $ref: '#/$defs/meal' },
          dinner: { $ref: '#/$defs/meal' },
          snacks: { type: 'array', items: { $ref: '#/$defs/meal' } },
          notes: { type: 'string' },
        },
      },
    },
    recipes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'mealType', 'servings', 'familyServings', 'clientServing', 'clientServingMultiplier', 'clientServingGrams', 'clientServingMeasure', 'clientServingBreakdown', 'prepTime', 'cookTime', 'calories', 'protein', 'carbs', 'fats', 'fiber', 'ingredients', 'instructions', 'swaps', 'notes'],
        properties: {
          name: { type: 'string' },
          mealType: { type: 'string' },
          servings: { type: 'string' },
          familyServings: { type: 'string' },
          clientServing: { type: 'string' },
          clientServingMultiplier: { type: 'string' },
          clientServingGrams: { type: 'string' },
          clientServingMeasure: { type: 'string' },
          clientServingBreakdown: { type: 'string' },
          prepTime: { type: 'string' },
          cookTime: { type: 'string' },
          calories: { type: 'string' },
          protein: { type: 'string' },
          carbs: { type: 'string' },
          fats: { type: 'string' },
          fiber: { type: 'string' },
          ingredients: { type: 'array', items: { type: 'string' } },
          instructions: { type: 'array', items: { type: 'string' } },
          swaps: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
        },
      },
    },
    workoutPlan: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['day', 'focus', 'warmup', 'exercises', 'cardio', 'cooldown', 'notes'],
        properties: {
          day: { type: 'string' },
          focus: { type: 'string' },
          warmup: { type: 'string' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'sets', 'reps', 'rest', 'videoUrl', 'notes'],
              properties: {
                name: { type: 'string' },
                sets: { type: 'string' },
                reps: { type: 'string' },
                rest: { type: 'string' },
                videoUrl: { type: 'string' },
                notes: { type: 'string' },
              },
            },
          },
          cardio: { type: 'string' },
          cooldown: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
    groceryList: { type: 'array', items: { type: 'string' } },
    adminNotes: { type: 'string' },
    clientNotes: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'ready_for_client', 'published', 'archived'] },
    generatedByAi: { type: 'boolean' },
  },
  $defs: {
    meal: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'description', 'macros', 'recipeName'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        macros: { type: 'string' },
        recipeName: { type: 'string' },
      },
    },
  },
} as const
