import type { CoachingPlanDraft } from './coaching-plan-schema'

type WorkoutPlan = CoachingPlanDraft['workoutPlan']
type WorkoutExercise = WorkoutPlan[number]['exercises'][number]

const AUTO_PROGRESS_NOTE_RE = /\s*Auto-progressed:[^.]+(?:\.[^A-Z]*)?/gi
const STRENGTH_RESET_RANGE = '8-12'

const CORE_TERMS = [
  'deep core',
  '360',
  'breathing',
  'dead bug',
  'heel slide',
  'heel tap',
  'bird dog',
  'side plank',
  'pelvic',
]

function isCoreExercise(exercise: WorkoutExercise) {
  const text = `${exercise.name} ${exercise.notes}`.toLowerCase()
  return CORE_TERMS.some((term) => text.includes(term))
}

function cleanAutoProgressNote(notes: string) {
  return notes.replace(AUTO_PROGRESS_NOTE_RE, '').replace(/\s{2,}/g, ' ').trim()
}

function appendProgressNote(notes: string, note: string) {
  return [cleanAutoProgressNote(notes), `Auto-progressed: ${note}`].filter(Boolean).join(' ')
}

function progressSets(sets: string, maxSets: number) {
  const match = sets.trim().match(/^(\d+)$/)
  if (!match) return null
  const current = Number(match[1])
  if (!Number.isFinite(current) || current >= maxSets) return null
  return String(current + 1)
}

function progressRepRange(reps: string) {
  const match = reps.match(/(\d+)\s*[-–]\s*(\d+)/)
  if (!match) return null

  const low = Number(match[1])
  const high = Number(match[2])
  if (!Number.isFinite(low) || !Number.isFinite(high) || low > high) return null

  if (low < high) {
    return {
      reps: reps.replace(match[0], `${low + 1}-${high}`),
      loadBump: false,
    }
  }

  return {
    reps: reps.replace(match[0], STRENGTH_RESET_RANGE),
    loadBump: true,
  }
}

function progressExactReps(reps: string, maxReps: number) {
  const match = reps.trim().match(/^(\d+)(.*)$/)
  if (!match) return null
  const current = Number(match[1])
  if (!Number.isFinite(current) || current >= maxReps) return null
  return `${current + 1}${match[2]}`
}

function progressExercise(exercise: WorkoutExercise): { exercise: WorkoutExercise; changed: boolean } {
  const core = isCoreExercise(exercise)
  const rangeProgression = progressRepRange(exercise.reps)

  if (rangeProgression && !core) {
    return {
      changed: true,
      exercise: {
        ...exercise,
        reps: rangeProgression.reps,
        notes: appendProgressNote(
          exercise.notes,
          rangeProgression.loadBump
            ? 'increase dumbbell load by no more than 5-10% if form stayed clean, then rebuild reps in the 8-12 range.'
            : 'raise the bottom of the rep range by 1 rep while keeping the same dumbbells and clean form.',
        ),
      },
    }
  }

  const exactProgression = progressExactReps(exercise.reps, core ? 10 : 15)
  if (exactProgression) {
    return {
      changed: true,
      exercise: {
        ...exercise,
        reps: exactProgression,
        notes: appendProgressNote(
          exercise.notes,
          core
            ? 'add 1 controlled rep per side; stop if doming, pressure, leaking, pain, or breath holding appears.'
            : 'add 1 rep while keeping the same dumbbells and 1-3 reps in reserve.',
        ),
      },
    }
  }

  const setProgression = progressSets(exercise.sets, core ? 3 : 4)
  if (setProgression) {
    return {
      changed: true,
      exercise: {
        ...exercise,
        sets: setProgression,
        notes: appendProgressNote(
          exercise.notes,
          core
            ? 'add one conservative deep-core set only if symptoms stay quiet.'
            : 'add one set only after reps are strong; keep weekly workload increases conservative.',
        ),
      },
    }
  }

  return {
    changed: false,
    exercise: {
      ...exercise,
      notes: appendProgressNote(
        exercise.notes,
        core
          ? 'hold this deep-core level until it feels symptom-free and controlled.'
          : 'increase dumbbell load by no more than 5-10% if available; otherwise keep the same prescription and improve control.',
      ),
    },
  }
}

export function applyProgressiveOverload(plan: WorkoutPlan): { plan: WorkoutPlan; changed: boolean } {
  let changed = false
  const next = plan.map((day) => ({
    ...day,
    notes: day.notes.includes('Auto progression')
      ? day.notes
      : [day.notes.trim(), 'Auto progression applies only when workouts were completed with clean form and no postpartum warning symptoms.'].filter(Boolean).join(' '),
    exercises: day.exercises.map((exercise) => {
      const progressed = progressExercise(exercise)
      if (progressed.changed) changed = true
      return progressed.exercise
    }),
  }))

  return { plan: next, changed }
}

