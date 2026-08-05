import assert from 'node:assert/strict'
import test from 'node:test'

import { generateWorkoutPlan } from './workout-generator.ts'

function exercise(overrides = {}) {
  return {
    id: overrides.name?.toLowerCase().replaceAll(' ', '-') ?? 'exercise',
    name: 'Goblet Squat',
    movement_pattern: 'squat',
    primary_muscles: ['quads', 'glutes'],
    equipment: 'dumbbells',
    difficulty: 'beginner',
    default_sets: '3',
    default_reps: '10',
    default_rest: '60s',
    cues: 'Move with control.',
    video_url: '',
    female_recomp_priority: 1,
    archived: false,
    ...overrides,
  }
}

const library = [
  exercise({ id: 'barbell-rdl', name: 'Barbell Romanian Deadlift', movement_pattern: 'hinge', equipment: 'barbell', primary_muscles: ['hamstrings', 'glutes'] }),
  exercise({ id: 'floor-press', name: 'Dumbbell Floor Press', movement_pattern: 'push_horizontal', primary_muscles: ['chest'], equipment: 'dumbbells' }),
  exercise({ id: 'row', name: 'One-Arm Dumbbell Row', movement_pattern: 'pull_horizontal', primary_muscles: ['back'], equipment: 'dumbbells' }),
  exercise({ id: 'reverse-lunge', name: 'Dumbbell Reverse Lunge', movement_pattern: 'lunge', primary_muscles: ['glutes', 'quads'], equipment: 'dumbbells' }),
  exercise({ id: 'goblet-squat', name: 'Goblet Squat', movement_pattern: 'squat', primary_muscles: ['quads', 'glutes'], equipment: 'dumbbells' }),
  exercise({ id: 'dead-bug', name: 'Dead Bug', movement_pattern: 'core', primary_muscles: ['deep core'], equipment: 'bodyweight', cues: 'Exhale and keep ribs stacked.' }),
  exercise({ id: 'crunch', name: 'Crunch', movement_pattern: 'core', primary_muscles: ['abs'], equipment: 'bodyweight', cues: 'Curl up.' }),
]

test('generates postpartum-friendly hypertrophy workouts for dumbbell-only clients', () => {
  const plan = generateWorkoutPlan(library, {
    daysPerWeek: 3,
    minutesPerSession: 30,
    equipment: ['bodyweight', 'dumbbells'],
    level: 'beginner',
  })

  assert.equal(plan.length, 3)
  for (const day of plan) {
    assert.match(day.warmup, /Start with the deep core exercises listed below/)
    assert.match(day.notes, /Progressive overload/)
    assert.equal(day.exercises[0].name, '360 Breathing')
    assert.equal(day.exercises[1].name, 'Heel Slides')
    assert.match(day.exercises[0].notes, /How to do it/)
    assert.match(day.exercises[1].notes, /How to do it/)
    assert.ok(day.exercises.some((ex) => /Dead Bug|deep core/i.test(`${ex.name} ${ex.notes}`)))
  }

  const barbellExercises = plan.flatMap((day) => day.exercises).filter((ex) => /barbell/i.test(ex.name))
  assert.ok(barbellExercises.every((exercise) => /use dumbbells instead of a barbell/i.test(exercise.notes)))
})

test('uses YMove-backed fallback exercises when the library is sparse', () => {
  const plan = generateWorkoutPlan([], {
    daysPerWeek: 3,
    minutesPerSession: 30,
    equipment: ['bodyweight', 'dumbbells'],
    level: 'beginner',
  })

  const exercises = plan.flatMap((day) => day.exercises)
  assert.ok(exercises.length > 0)
  assert.ok(exercises.every((exercise) => exercise.name === '360 Breathing' || exercise.name === 'Heel Slides' || exercise.videoUrl.startsWith('ymove:')))
  assert.ok(exercises.some((exercise) => /Dumbbell|Bird Dog|Dead Bug|Pelvic|Suitcase/.test(exercise.name)))
})
