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

const DEEP_CORE_WARMUP = 'Start with the deep core exercises listed below before any strength exercises. Move slowly, breathe through each rep, and stop if there is doming/coning, leaking, pelvic pressure, or pain.'
const POSTPARTUM_COOLDOWN = 'Downshift breathing x 5 breaths, hip flexor stretch, hamstring stretch, chest opener.'
const PROGRESSIVE_OVERLOAD_NOTE = 'Progressive overload: keep 1-3 reps in reserve. When she hits the top of the rep range on every set with clean form, increase dumbbell weight next time; if weights are limited, add 1-2 reps, slow the lowering to 3 seconds, add a pause, or add 1 set.'

const BARBELL_TO_DUMBBELL_PATTERNS = new Set([
  'squat',
  'hinge',
  'lunge',
  'push_horizontal',
  'push_vertical',
  'pull_horizontal',
  'glute',
])

const DEEP_CORE_TERMS = [
  '360',
  'breathing',
  'dead bug',
  'heel slide',
  'heel tap',
  'toe tap',
  'march',
  'pelvic tilt',
  'bird dog',
  'side plank',
  'pilates',
  'single leg stretch',
  'leg circles',
  'pallof',
  'carry',
]

const POSTPARTUM_CORE_AVOID_TERMS = [
  'crunch',
  'sit-up',
  'sit up',
  'russian twist',
  'v-up',
  'v up',
  'toes to bar',
  'leg raise',
]

const DEEP_CORE_SEQUENCE: LibraryExercise[] = [
  {
    id: 'deep-core-360-breathing',
    name: '360 Breathing',
    movement_pattern: 'core',
    primary_muscles: ['deep core', 'pelvic floor'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    default_sets: '1',
    default_reps: '5 slow breaths',
    default_rest: '15-30s',
    cues: 'How to do it: Lie on your back with knees bent or sit tall. Put hands around the sides of your ribs. Inhale through your nose and feel your ribs, back, and belly expand into your hands. Exhale slowly like you are fogging a mirror and gently lift the pelvic floor while your lower belly wraps in. Fully relax before the next breath. Do not suck in, clench, or hold your breath.',
    video_url: '',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'deep-core-heel-slides',
    name: 'Heel Slides',
    movement_pattern: 'core',
    primary_muscles: ['deep core'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    default_sets: '2',
    default_reps: '6/side',
    default_rest: '30s',
    cues: 'How to do it: Lie on your back with knees bent and feet on the floor. Exhale first, gently wrap the lower belly, then slowly slide one heel away until the leg is almost straight. Inhale to bring it back. Keep ribs down and hips still. Stop the slide early if your belly domes, your back arches, or you feel pelvic pressure.',
    video_url: '',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'deep-core-supine-toe-taps',
    name: 'Supine Toe Taps',
    movement_pattern: 'core',
    primary_muscles: ['deep core', 'pilates'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    default_sets: '2',
    default_reps: '6/side',
    default_rest: '30s',
    cues: 'How to do it: Lie on your back and bring knees over hips one at a time. Exhale, gently wrap your lower belly, and tap one toe to the floor. Inhale to return, then switch sides. Keep ribs down and move slowly. Make the range smaller if your back arches, belly domes, or you feel pressure.',
    video_url: 'ymove:supine-toe-taps',
    female_recomp_priority: 2,
    archived: false,
  },
]

const FALLBACK_EXERCISES: LibraryExercise[] = [
  {
    id: 'fallback-dead-bug-with-dumbbells',
    name: 'Dead Bug with Dumbbells',
    movement_pattern: 'core',
    primary_muscles: ['deep core'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '2',
    default_reps: '6-10/side',
    default_rest: '30-45s',
    cues: 'Use a light dumbbell only if she can keep ribs stacked and belly flat. Exhale before each reach and stop before doming.',
    video_url: 'ymove:dead-bug-with-dumbbells-cadc7a',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-bird-dog',
    name: 'Bird Dog',
    movement_pattern: 'core',
    primary_muscles: ['deep core', 'glutes', 'back'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    default_sets: '2',
    default_reps: '8/side',
    default_rest: '30-45s',
    cues: 'Reach opposite arm and leg long. Keep hips level, exhale on the reach, and avoid arching the low back.',
    video_url: 'ymove:bird-dog-d1070c',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-side-plank-knee-tucked',
    name: 'Knee Tucked Side Plank Up and Downs',
    movement_pattern: 'core',
    primary_muscles: ['obliques', 'deep core'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    default_sets: '2',
    default_reps: '8-10/side',
    default_rest: '30-45s',
    cues: 'Keep this small and controlled. Breathe through each rep and stop if there is doming, pressure, leaking, or pain.',
    video_url: 'ymove:knee-tucked-side-plank-up-and-downs-left',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-sitting-pelvic-tilts',
    name: 'Sitting Pelvic Tilts',
    movement_pattern: 'core',
    primary_muscles: ['deep core', 'pelvic floor'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    default_sets: '2',
    default_reps: '8-10',
    default_rest: '30s',
    cues: 'Move slowly with breath. Exhale and gently stack ribs over pelvis without clenching or bearing down.',
    video_url: 'ymove:sitting-pelvic-tilts-08b48b',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-the-hundred',
    name: 'The Hundred',
    movement_pattern: 'core',
    primary_muscles: ['abs', 'deep core', 'pilates'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    default_sets: '2',
    default_reps: '20-40 arm pumps',
    default_rest: '30-45s',
    cues: 'Pilates core work. Keep head down if needed. Pump arms while breathing steadily. Stop or regress to 360 breathing if there is doming, neck strain, pressure, leaking, or breath holding.',
    video_url: 'ymove:the-hundred',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-single-leg-stretch',
    name: 'Single Leg Stretch',
    movement_pattern: 'core',
    primary_muscles: ['abs', 'deep core', 'pilates'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    default_sets: '2',
    default_reps: '6-10/side',
    default_rest: '30-45s',
    cues: 'Pilates core work. Move slowly and exhale as one leg reaches. Keep the reach small enough that ribs stay stacked and the belly does not dome.',
    video_url: 'ymove:single-leg-stretch',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-single-leg-circles',
    name: 'Single Leg Circles',
    movement_pattern: 'core',
    primary_muscles: ['core', 'hips', 'pilates'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    default_sets: '2',
    default_reps: '5 each direction/side',
    default_rest: '30-45s',
    cues: 'Pilates core and hip control. Make small circles, keep hips heavy on the floor, and breathe. Stop if the back arches or the belly domes.',
    video_url: 'ymove:single-leg-circles',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-side-lying-leg-lifts',
    name: 'Side Lying Leg Lifts',
    movement_pattern: 'core',
    primary_muscles: ['glutes', 'hips', 'pilates'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    default_sets: '2',
    default_reps: '10-12/side',
    default_rest: '30-45s',
    cues: 'Pilates-style hip and core stability. Lie on your side, stack ribs over hips, lift the top leg without rolling backward, and keep breathing.',
    video_url: 'ymove:side-lying-leg-lifts',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-dumbbell-goblet-squat',
    name: 'Dumbbell Goblet Squat',
    movement_pattern: 'squat',
    primary_muscles: ['quads', 'glutes', 'core'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '3',
    default_reps: '8-12',
    default_rest: '60-90s',
    cues: 'Hold one dumbbell at chest, sit between hips, knees track over toes, exhale to stand.',
    video_url: 'ymove:dumbbell-goblet-squat-202e4f',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-dumbbell-box-squat',
    name: 'Dumbbell Box Squat',
    movement_pattern: 'squat',
    primary_muscles: ['quads', 'glutes'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '3',
    default_reps: '8-12',
    default_rest: '60-90s',
    cues: 'Tap the box softly, stay stacked, and drive through the whole foot to stand.',
    video_url: 'ymove:dumbbell-box-squat',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-dumbbell-sumo-squat',
    name: 'Dumbbell Sumo Squat',
    movement_pattern: 'squat',
    primary_muscles: ['glutes', 'quads', 'adductors'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '3',
    default_reps: '8-12',
    default_rest: '60-90s',
    cues: 'Feet wider than hips, hold one dumbbell low, knees track over toes, stand by squeezing glutes.',
    video_url: 'ymove:dumbbell-sumo-squat-bbef20',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-dumbbell-deadlift',
    name: 'Dumbbell Deadlift',
    movement_pattern: 'hinge',
    primary_muscles: ['glutes', 'hamstrings'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '3',
    default_reps: '8-12',
    default_rest: '60-90s',
    cues: 'Dumbbells stay close, hips go back, spine stays long, exhale to stand.',
    video_url: 'ymove:dumbbell-deadlift',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-romanian-deadlift',
    name: 'Romanian Deadlift',
    movement_pattern: 'hinge',
    primary_muscles: ['hamstrings', 'glutes'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '3',
    default_reps: '8-12',
    default_rest: '60-90s',
    cues: 'Use dumbbells for this client. Hips move back, knees stay soft, and the lowering stays slow.',
    video_url: 'ymove:romanian-deadlift',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-dumbbell-reverse-lunge',
    name: 'Dumbbell Reverse Lunge',
    movement_pattern: 'lunge',
    primary_muscles: ['glutes', 'quads'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '3',
    default_reps: '8-12/side',
    default_rest: '60s',
    cues: 'Step back, lower with control, exhale and drive through the front heel to stand.',
    video_url: 'ymove:dumbbell-reverse-lunge',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-dumbbell-split-squat',
    name: 'Dumbbell Split Squat',
    movement_pattern: 'lunge',
    primary_muscles: ['glutes', 'quads'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '3',
    default_reps: '8-12/side',
    default_rest: '60s',
    cues: 'Keep a long stance, lower straight down, and use light dumbbells until balance is steady.',
    video_url: 'ymove:dumbbell-split-squat',
    female_recomp_priority: 1,
    archived: false,
  },
  {
    id: 'fallback-step-up-no-equipment',
    name: 'Step Up No Equipment',
    movement_pattern: 'lunge',
    primary_muscles: ['quads', 'glutes'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    default_sets: '3',
    default_reps: '8-12/side',
    default_rest: '60s',
    cues: 'Full foot on the step, drive through the working heel, and lower with control. Add dumbbells later.',
    video_url: 'ymove:step-up-no-equipment-e251f2',
    female_recomp_priority: 1,
    archived: false,
  },
  {
    id: 'fallback-dumbbell-floor-press',
    name: 'Dumbbell Floor Press',
    movement_pattern: 'push_horizontal',
    primary_muscles: ['chest', 'triceps', 'shoulders'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '3',
    default_reps: '8-12',
    default_rest: '60-90s',
    cues: 'Elbows touch the floor softly, ribs stay down, exhale as you press.',
    video_url: 'ymove:dumbbell-floor-press',
    female_recomp_priority: 1,
    archived: false,
  },
  {
    id: 'fallback-dumbbell-shoulder-press',
    name: 'Dumbbell Shoulder Press',
    movement_pattern: 'push_vertical',
    primary_muscles: ['shoulders', 'triceps'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '2-3',
    default_reps: '8-12',
    default_rest: '60s',
    cues: 'Press without arching the low back. Keep ribs stacked and exhale through the press.',
    video_url: 'ymove:dumbbell-shoulder-press',
    female_recomp_priority: 1,
    archived: false,
  },
  {
    id: 'fallback-seated-dumbbell-press',
    name: 'Seated Dumbbell Press',
    movement_pattern: 'push_vertical',
    primary_muscles: ['shoulders', 'triceps'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '2-3',
    default_reps: '8-12',
    default_rest: '60s',
    cues: 'Sit tall, keep ribs down, and press evenly overhead without holding breath.',
    video_url: 'ymove:seated-dumbbell-press',
    female_recomp_priority: 1,
    archived: false,
  },
  {
    id: 'fallback-one-arm-dumbbell-row-bench',
    name: 'One-Arm Dumbbell Row Bench',
    movement_pattern: 'pull_horizontal',
    primary_muscles: ['back', 'biceps'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '3',
    default_reps: '8-12/side',
    default_rest: '60s',
    cues: 'Support one hand on a bench or chair, pull elbow toward hip, pause, lower slowly.',
    video_url: 'ymove:one-arm-dumbbell-row-bench',
    female_recomp_priority: 1,
    archived: false,
  },
  {
    id: 'fallback-incline-dumbbell-row',
    name: 'Incline Dumbbell Row',
    movement_pattern: 'pull_horizontal',
    primary_muscles: ['back', 'biceps'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '3',
    default_reps: '8-12',
    default_rest: '60s',
    cues: 'Chest supported, row toward hips, pause at the top and lower under control.',
    video_url: 'ymove:incline-dumbbell-row',
    female_recomp_priority: 1,
    archived: false,
  },
  {
    id: 'fallback-dumbbell-hip-thrust',
    name: 'Dumbbell Hip Thrust',
    movement_pattern: 'glute',
    primary_muscles: ['glutes', 'hamstrings'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '3',
    default_reps: '8-12',
    default_rest: '60-90s',
    cues: 'Upper back on couch or bench, dumbbell on hips, tuck pelvis slightly and squeeze glutes at the top.',
    video_url: 'ymove:dumbbell-hip-thrust',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-dumbbell-glute-bridge',
    name: 'Dumbbell Glute Bridge',
    movement_pattern: 'glute',
    primary_muscles: ['glutes', 'hamstrings'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '3',
    default_reps: '8-12',
    default_rest: '60s',
    cues: 'Dumbbell rests on hips, exhale and bridge up without arching the low back.',
    video_url: 'ymove:dumbbell-glute-bridge',
    female_recomp_priority: 2,
    archived: false,
  },
  {
    id: 'fallback-suitcase-carry',
    name: 'Suitcase Carry',
    movement_pattern: 'carry',
    primary_muscles: ['deep core', 'grip', 'obliques'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '3',
    default_reps: '20-40 sec/side',
    default_rest: '45-60s',
    cues: 'Hold one dumbbell at your side and walk tall without leaning. Switch sides.',
    video_url: 'ymove:suitcase-carry',
    female_recomp_priority: 2,
    archived: false,
  },
]

// Patterns the body can rotate through. Order matters — we want the
// heaviest compounds first so a client running out of time still hits them.
const FULL_BODY_TEMPLATE_A: DayTemplate = {
  focus: 'Full Body — Hinge Focus',
  warmup: `${DEEP_CORE_WARMUP} Then do 90/90 hip switches and cat-cow if she needs extra mobility.`,
  slots: [
    { pattern: 'hinge' },
    { pattern: 'push_horizontal' },
    { pattern: 'pull_horizontal' },
    { pattern: 'lunge', fallbackPatterns: ['squat'] },
    { pattern: 'core' },
  ],
  cardio: 'Optional 5-10 min easy walk to finish. Keep it conversational so strength recovery stays the priority.',
  cooldown: POSTPARTUM_COOLDOWN,
}

const FULL_BODY_TEMPLATE_B: DayTemplate = {
  focus: 'Full Body — Squat Focus',
  warmup: `${DEEP_CORE_WARMUP} Then do glute bridge x 10 and bodyweight squat x 6 if she needs extra mobility.`,
  slots: [
    { pattern: 'squat' },
    { pattern: 'pull_vertical', fallbackPatterns: ['pull_horizontal'] },
    { pattern: 'push_vertical', fallbackPatterns: ['push_horizontal'] },
    { pattern: 'glute', fallbackPatterns: ['hinge'] },
    { pattern: 'carry', fallbackPatterns: ['core'] },
  ],
  cardio: 'Optional 5-10 min easy walk to finish. Skip conditioning if she needs the recovery for lifting.',
  cooldown: POSTPARTUM_COOLDOWN,
}

const FULL_BODY_TEMPLATE_C: DayTemplate = {
  focus: 'Full Body — Posterior Chain',
  warmup: `${DEEP_CORE_WARMUP} Then do hip hinge drill x 8 if she needs extra mobility.`,
  slots: [
    { pattern: 'hinge' },
    { pattern: 'pull_horizontal' },
    { pattern: 'squat' },
    { pattern: 'push_horizontal' },
    { pattern: 'core' },
  ],
  cardio: 'Optional 5-10 min incline walk or easy bike. Strength work comes first for muscle gain.',
  cooldown: POSTPARTUM_COOLDOWN,
}

const LOWER_BODY_TEMPLATE: DayTemplate = {
  focus: 'Lower Body',
  warmup: `${DEEP_CORE_WARMUP} Then do glute bridge x 12 and 90/90 hip switches if she needs extra mobility.`,
  slots: [
    { pattern: 'squat' },
    { pattern: 'hinge' },
    { pattern: 'lunge' },
    { pattern: 'glute' },
    { pattern: 'core' },
  ],
  cardio: '10 min easy walk.',
  cooldown: POSTPARTUM_COOLDOWN,
}

const UPPER_BODY_TEMPLATE: DayTemplate = {
  focus: 'Upper Body',
  warmup: `${DEEP_CORE_WARMUP} Then do cat-cow and scapular wall slides x 8 if she needs extra mobility.`,
  slots: [
    { pattern: 'push_horizontal' },
    { pattern: 'pull_horizontal' },
    { pattern: 'push_vertical' },
    { pattern: 'pull_vertical', fallbackPatterns: ['pull_horizontal'] },
    { pattern: 'core' },
  ],
  cardio: '10 min easy walk or bike.',
  cooldown: POSTPARTUM_COOLDOWN,
}

const GLUTE_FOCUS_TEMPLATE: DayTemplate = {
  focus: 'Glute Focus',
  warmup: `${DEEP_CORE_WARMUP} Then do glute bridge x 12 and hip hinge drill x 8 if she needs extra mobility.`,
  slots: [
    { pattern: 'hinge' },
    { pattern: 'glute' },
    { pattern: 'lunge' },
    { pattern: 'hinge', fallbackPatterns: ['glute'] },
    { pattern: 'core' },
  ],
  cardio: 'Optional 5-10 min incline walk. Do not let cardio reduce lower-body loading quality.',
  cooldown: POSTPARTUM_COOLDOWN,
}

const CARDIO_DAY_TEMPLATE: DayTemplate = {
  focus: 'Cardio + Mobility',
  warmup: `${DEEP_CORE_WARMUP} Then do 5 min easy walking.`,
  slots: [
    { pattern: 'cardio_steady' },
    { pattern: 'core' },
    { pattern: 'mobility' },
  ],
  cooldown: POSTPARTUM_COOLDOWN,
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
  const available = new Set(equipment.map((item) => item.toLowerCase()))
  if (ex.equipment === 'bodyweight') return true
  if (available.size === 0) return ex.equipment === 'bodyweight'
  if (available.has(ex.equipment)) return true
  return ex.equipment === 'barbell'
    && available.has('dumbbells')
    && BARBELL_TO_DUMBBELL_PATTERNS.has(ex.movement_pattern)
}

function isDeepCoreExercise(ex: LibraryExercise) {
  const text = `${ex.name} ${ex.cues} ${ex.primary_muscles.join(' ')}`.toLowerCase()
  return DEEP_CORE_TERMS.some((term) => text.includes(term))
}

function isPostpartumCoreRisky(ex: LibraryExercise) {
  const text = `${ex.name} ${ex.cues}`.toLowerCase()
  return POSTPARTUM_CORE_AVOID_TERMS.some((term) => text.includes(term))
}

function scoreExercise(ex: LibraryExercise, pattern: string) {
  let score = ex.female_recomp_priority * 10
  if (pattern === 'core') {
    if (isDeepCoreExercise(ex)) score += 100
    if (isPostpartumCoreRisky(ex)) score -= 100
  }
  if (ex.equipment === 'dumbbells') score += 8
  if (ex.equipment === 'bodyweight') score += pattern === 'core' ? 10 : 4
  if (ex.equipment === 'barbell') score -= 8
  return score
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
    const allCandidates = library
      .filter((ex) => ex.movement_pattern === pattern && exerciseFits(ex, level, equipment))
      .sort((a, b) => scoreExercise(b, pattern) - scoreExercise(a, pattern) || a.name.localeCompare(b.name))
    const candidates = pattern === 'core' && allCandidates.some((ex) => !isPostpartumCoreRisky(ex))
      ? allCandidates.filter((ex) => !isPostpartumCoreRisky(ex))
      : allCandidates

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
  const maxSlots = Math.max(4, Math.floor(budget / 6))
  const slots = template.slots.slice(0, Math.min(template.slots.length, maxSlots))
  const templateHasCore = template.slots.some((slot) => slot.pattern === 'core' || slot.fallbackPatterns?.includes('core'))
  const slotsHaveCore = slots.some((slot) => slot.pattern === 'core' || slot.fallbackPatterns?.includes('core'))
  if (templateHasCore && !slotsHaveCore) {
    return [...slots.slice(0, Math.max(0, maxSlots - 1)), { pattern: 'core' }]
  }
  return slots
}

function doseForExercise(ex: LibraryExercise, level: GeneratorInputs['level']) {
  const pattern = ex.movement_pattern
  if (pattern === 'core') {
    return {
      sets: level === 'beginner' ? '2' : '2-3',
      reps: isDeepCoreExercise(ex) ? '6-10/side or 20-30 sec' : '8-12 controlled',
      rest: '30-45s',
    }
  }
  if (pattern === 'carry') {
    return { sets: '3', reps: '30-45 sec', rest: '60s' }
  }
  if (['squat', 'hinge', 'lunge', 'glute', 'push_horizontal', 'pull_horizontal'].includes(pattern)) {
    return {
      sets: level === 'beginner' ? '3' : '3-4',
      reps: '8-12',
      rest: level === 'beginner' ? '60-90s' : '90s',
    }
  }
  return {
    sets: level === 'beginner' ? '2-3' : '3',
    reps: '10-15',
    rest: '60s',
  }
}

function notesForExercise(ex: LibraryExercise) {
  const notes = [ex.cues.trim()].filter(Boolean)
  if (ex.equipment === 'barbell') {
    notes.push('Dumbbell substitution: use dumbbells instead of a barbell for this client.')
  }
  if (ex.movement_pattern === 'core') {
    notes.push('Deep core focus: slow exhale, ribs stacked over pelvis, no breath holding, no doming.')
  } else {
    notes.push('Muscle-building focus: move with control, lower for about 2-3 seconds, finish each set with 1-3 reps in reserve.')
  }
  return notes.join(' ')
}

function workoutExerciseFromLibraryExercise(ex: LibraryExercise, level: GeneratorInputs['level']) {
  const dose = doseForExercise(ex, level)
  return {
    name: ex.name,
    sets: dose.sets || ex.default_sets,
    reps: dose.reps || ex.default_reps,
    rest: dose.rest || ex.default_rest,
    videoUrl: ex.video_url,
    notes: notesForExercise(ex),
  }
}

function deepCorePrepExercises(level: GeneratorInputs['level']): WorkoutDay['exercises'] {
  return DEEP_CORE_SEQUENCE.map((exercise) => workoutExerciseFromLibraryExercise(exercise, level))
}

export function generateWorkoutPlan(
  library: LibraryExercise[],
  inputs: GeneratorInputs,
): WorkoutPlan {
  const libraryNames = new Set(library.map((exercise) => exercise.name.trim().toLowerCase()))
  const expandedLibrary = [
    ...library,
    ...FALLBACK_EXERCISES.filter((exercise) => !libraryNames.has(exercise.name.trim().toLowerCase())),
  ]
  const templates = SPLITS[inputs.daysPerWeek] ?? SPLITS[3]
  const used = new Set<string>()
  const days: WorkoutDay[] = []

  templates.forEach((template, i) => {
    const slots = slotsForTimeBudget(template, inputs.minutesPerSession)
    const exercises: WorkoutDay['exercises'] = deepCorePrepExercises(inputs.level)
    const strengthSlots = slots.filter((slot) => slot.pattern !== 'core')
    const coreSlots = slots.filter((slot) => slot.pattern === 'core')

    for (const slot of strengthSlots) {
      const ex = pickForPattern(expandedLibrary, slot, inputs.level, inputs.equipment, used)
      if (!ex) continue
      used.add(ex.id)
      exercises.push(workoutExerciseFromLibraryExercise(ex, inputs.level))
    }

    for (const slot of coreSlots) {
      const ex = pickForPattern(expandedLibrary, slot, inputs.level, inputs.equipment, used)
      if (!ex) continue
      used.add(ex.id)
      exercises.push(workoutExerciseFromLibraryExercise(ex, inputs.level))
    }

    days.push({
      day: `Day ${i + 1} — ${template.focus}`,
      focus: template.focus,
      warmup: template.warmup,
      exercises,
      cardio: template.cardio ?? '',
      cooldown: template.cooldown ?? '',
      notes: PROGRESSIVE_OVERLOAD_NOTE,
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
