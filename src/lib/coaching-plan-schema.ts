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
})

const emptyMeal = {
  name: '',
  description: '',
  macros: '',
  recipeName: '',
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
  prepTime: z.string().default(''),
  cookTime: z.string().default(''),
  calories: z.string().default(''),
  protein: z.string().default(''),
  carbs: z.string().default(''),
  fats: z.string().default(''),
  ingredients: z.array(z.string()).default([]),
  instructions: z.array(z.string()).default([]),
  swaps: z.array(z.string()).default([]),
  notes: z.string().default(''),
})

export const CoachingPlanSchema = z.object({
  macroTargets: MacroTargetsSchema.default(emptyMacroTargets),
  mealPlan: z.array(MealDaySchema).default([]),
  recipes: z.array(RecipeSchema).default([]),
  groceryList: z.array(z.string()).default([]),
  adminNotes: z.string().default(''),
  clientNotes: z.string().default(''),
  status: z.enum(['draft', 'ready_for_client', 'published', 'archived']).default('draft'),
  generatedByAi: z.boolean().default(false),
})

export type CoachingPlanDraft = z.infer<typeof CoachingPlanSchema>

export const emptyCoachingPlan: CoachingPlanDraft = {
  macroTargets: emptyMacroTargets,
  mealPlan: [],
  recipes: [],
  groceryList: [],
  adminNotes: '',
  clientNotes: '',
  status: 'draft',
  generatedByAi: false,
}

export function parseCoachingPlan(value: unknown): CoachingPlanDraft {
  const parsed = CoachingPlanSchema.safeParse(value)
  return parsed.success ? parsed.data : emptyCoachingPlan
}

export const CoachingPlanAiJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['macroTargets', 'mealPlan', 'recipes', 'groceryList', 'adminNotes', 'clientNotes', 'status', 'generatedByAi'],
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
        required: ['name', 'mealType', 'servings', 'familyServings', 'clientServing', 'prepTime', 'cookTime', 'calories', 'protein', 'carbs', 'fats', 'ingredients', 'instructions', 'swaps', 'notes'],
        properties: {
          name: { type: 'string' },
          mealType: { type: 'string' },
          servings: { type: 'string' },
          familyServings: { type: 'string' },
          clientServing: { type: 'string' },
          prepTime: { type: 'string' },
          cookTime: { type: 'string' },
          calories: { type: 'string' },
          protein: { type: 'string' },
          carbs: { type: 'string' },
          fats: { type: 'string' },
          ingredients: { type: 'array', items: { type: 'string' } },
          instructions: { type: 'array', items: { type: 'string' } },
          swaps: { type: 'array', items: { type: 'string' } },
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
