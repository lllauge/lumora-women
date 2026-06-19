import type { CoachingPlanDraft } from './coaching-plan-schema'

export type LibraryExercise = {
  id: string
  name: string
  movement_pattern: string
  primary_muscles: string[]
  equipment: string
  difficulty: string
  default_sets: string
  default_reps: string
  default_rest: string
  cues: string
  video_url: string
  female_recomp_priority: number
  archived: boolean
}

export type GeneratorInputs = {
  daysPerWeek: 2 | 3 | 4 | 5
  minutesPerSession: number
  equipment: string[]
  level: 'beginner' | 'intermediate' | 'advanced'
}

type WorkoutPlan = CoachingPlanDraft['workoutPlan']
type WorkoutDay = WorkoutPlan[number]

// A slot is a movement-pattern requirement. The generator fills it by
// picking the highest-priority library exercise that matches the pattern,
// the client's equipment, and the client's difficulty level.
type Slot = { pattern: string; fallbackPatterns?: string[] }

type DayTemplate = {
  focus: string
  warmup: string
  slots: Slot[]
  cardio?: string
  cooldown?: string
}

// Patterns the body can rotate through. Order matters — we want the
// heaviest compounds first so a client running out of time still hits them.
const FULL_BODY_TEMPLATE_A: DayTemplate = {
  focus: 'Full Body — Hinge Focus',
  warmup: 'World\'s Greatest Stretch · 90/90 Hip Switches · Cat-Cow',
  slots: [
    { pattern: 'hinge' },
    { pattern: 'push_horizontal' },
    { pattern: 'pull_horizontal' },
    { pattern: 'lunge', fallbackPatterns: ['squat'] },
    { pattern: 'core' },
  ],
  cardio: '10 min easy walk to finish — keep the heart rate gently elevated.',
  cooldown: '2 min easy walk, then full-body stretch (hamstrings, hips, chest).',
}

const FULL_BODY_TEMPLATE_B: DayTemplate = {
  focus: 'Full Body — Squat Focus',
  warmup: 'World\'s Greatest Stretch · 90/90 Hip Switches · Glute Bridge × 10',
  slots: [
    { pattern: 'squat' },
    { pattern: 'pull_vertical', fallbackPatterns: ['pull_horizontal'] },
    { pattern: 'push_vertical', fallbackPatterns: ['push_horizontal'] },
    { pattern: 'glute', fallbackPatterns: ['hinge'] },
    { pattern: 'carry', fallbackPatterns: ['core'] },
  ],
  cardio: '10 min easy walk to finish.',
  cooldown: 'Quad and hip stretch, child\'s pose, deep breathing.',
}

const FULL_BODY_TEMPLATE_C: DayTemplate = {
  focus: 'Full Body — Posterior Chain',
  warmup: 'Cat-Cow · 90/90 Hip Switches · Dead Bug × 8',
  slots: [
    { pattern: 'hinge' },
    { pattern: 'pull_horizontal' },
    { pattern: 'squat' },
    { pattern: 'push_horizontal' },
    { pattern: 'core' },
  ],
  cardio: '10 min cardio finisher — incline walk or easy bike.',
  cooldown: 'Hamstring and chest stretch.',
}

const LOWER_BODY_TEMPLATE: DayTemplate = {
  focus: 'Lower Body',
  warmup: 'World\'s Greatest Stretch · Glute Bridge × 15 · 90/90 Hip Switches',
  slots: [
    { pattern: 'squat' },
    { pattern: 'hinge' },
    { pattern: 'lunge' },
    { pattern: 'glute' },
    { pattern: 'core' },
  ],
  cardio: '10 min easy walk.',
  cooldown: 'Quad, hamstring, hip-flexor, glute stretch.',
}

const UPPER_BODY_TEMPLATE: DayTemplate = {
  focus: 'Upper Body',
  warmup: 'Cat-Cow · Banded shoulder pass-throughs × 10 · Dead Bug × 8',
  slots: [
    { pattern: 'push_horizontal' },
    { pattern: 'pull_horizontal' },
    { pattern: 'push_vertical' },
    { pattern: 'pull_vertical', fallbackPatterns: ['pull_horizontal'] },
    { pattern: 'core' },
  ],
  cardio: '10 min easy walk or bike.',
  cooldown: 'Chest, lat, and t-spine mobility.',
}

const GLUTE_FOCUS_TEMPLATE: DayTemplate = {
  focus: 'Glute Focus',
  warmup: 'Glute Bridge × 15 · 90/90 Hip Switches · World\'s Greatest Stretch',
  slots: [
    { pattern: 'hinge' },
    { pattern: 'glute' },
    { pattern: 'lunge' },
    { pattern: 'hinge', fallbackPatterns: ['glute'] },
    { pattern: 'core' },
  ],
  cardio: '15 min incline walk to finish — glute and posterior chain emphasis.',
  cooldown: 'Glute and hip stretch.',
}

const CARDIO_DAY_TEMPLATE: DayTemplate = {
  focus: 'Cardio + Mobility',
  warmup: '5 min easy walk · World\'s Greatest Stretch',
  slots: [
    { pattern: 'cardio_steady' },
    { pattern: 'core' },
    { pattern: 'mobility' },
  ],
  cooldown: 'Full body stretch — hold each 30 sec.',
}

const SPLITS: Record<number, DayTemplate[]> = {
  2: [FULL_BODY_TEMPLATE_A, FULL_BODY_TEMPLATE_B],
  3: [FULL_BODY_TEMPLATE_A, FULL_BODY_TEMPLATE_B, FULL_BODY_TEMPLATE_C],
  4: [LOWER_BODY_TEMPLATE, UPPER_BODY_TEMPLATE, GLUTE_FOCUS_TEMPLATE, UPPER_BODY_TEMPLATE],
  5: [LOWER_BODY_TEMPLATE, UPPER_BODY_TEMPLATE, GLUTE_FOCUS_TEMPLATE, UPPER_BODY_TEMPLATE, CARDIO_DAY_TEMPLATE],
}

const DIFFICULTY_RANK: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
}

function exerciseFits(ex: LibraryExercise, level: GeneratorInputs['level'], equipment: string[]) {
  if (ex.archived) return false
  if (DIFFICULTY_RANK[ex.difficulty] > DIFFICULTY_RANK[level]) return false
  if (ex.equipment === 'bodyweight') return true
  if (equipment.length === 0) return ex.equipment === 'bodyweight'
  return equipment.includes(ex.equipment)
}

// Pick best library exercise for a pattern: filter by level + equipment,
// then rank by female_recomp_priority desc, then by name for stability.
function pickForPattern(
  library: LibraryExercise[],
  slot: Slot,
  level: GeneratorInputs['level'],
  equipment: string[],
  used: Set<string>,
): LibraryExercise | null {
  const patterns = [slot.pattern, ...(slot.fallbackPatterns ?? [])]
  for (const pattern of patterns) {
    const candidates = library
      .filter((ex) => ex.movement_pattern === pattern && exerciseFits(ex, level, equipment))
      .sort((a, b) => b.female_recomp_priority - a.female_recomp_priority || a.name.localeCompare(b.name))

    const unused = candidates.find((ex) => !used.has(ex.id))
    if (unused) return unused
    if (candidates.length > 0) return candidates[0]
  }
  return null
}

// Trim the number of working sets to fit the session length budget. ~6 minutes
// per slot is a reasonable estimate (sets + rest + transitions); warmup and
// cooldown together eat ~10 minutes.
function slotsForTimeBudget(template: DayTemplate, minutesPerSession: number) {
  const budget = Math.max(20, minutesPerSession) - 10
  const maxSlots = Math.max(3, Math.floor(budget / 6))
  return template.slots.slice(0, Math.min(template.slots.length, maxSlots))
}

export function generateWorkoutPlan(
  library: LibraryExercise[],
  inputs: GeneratorInputs,
): WorkoutPlan {
  const templates = SPLITS[inputs.daysPerWeek] ?? SPLITS[3]
  const used = new Set<string>()
  const days: WorkoutDay[] = []

  templates.forEach((template, i) => {
    const slots = slotsForTimeBudget(template, inputs.minutesPerSession)
    const exercises: WorkoutDay['exercises'] = []

    for (const slot of slots) {
      const ex = pickForPattern(library, slot, inputs.level, inputs.equipment, used)
      if (!ex) continue
      used.add(ex.id)
      exercises.push({
        name: ex.name,
        sets: ex.default_sets,
        reps: ex.default_reps,
        rest: ex.default_rest,
        notes: ex.cues,
      })
    }

    days.push({
      day: `Day ${i + 1} — ${template.focus}`,
      focus: template.focus,
      warmup: template.warmup,
      exercises,
      cardio: template.cardio ?? '',
      cooldown: template.cooldown ?? '',
      notes: '',
    })
  })

  return days
}

// Parser for the onboarding strengthTraining field.
export function parseDaysPerWeek(value: string): 2 | 3 | 4 | 5 {
  const v = value.toLowerCase()
  if (v.includes('5')) return 5
  if (v.includes('3') || v.includes('4')) return v.includes('4') ? 4 : 3
  if (v.includes('1') || v.includes('2')) return 2
  return 3
}
