import assert from 'node:assert/strict'
import test from 'node:test'

import { applyProgressiveOverload } from './workout-progression.ts'

function workout(exercise) {
  return [{
    day: 'Day 1',
    focus: 'Full Body',
    warmup: '',
    cardio: '',
    cooldown: '',
    notes: '',
    exercises: [exercise],
  }]
}

test('raises the bottom of a strength rep range before changing load', () => {
  const { plan, changed } = applyProgressiveOverload(workout({
    name: 'Goblet Squat',
    sets: '3',
    reps: '8-12',
    rest: '60-90s',
    videoUrl: '',
    notes: 'Muscle-building focus.',
  }))

  assert.equal(changed, true)
  assert.equal(plan[0].exercises[0].reps, '9-12')
  assert.match(plan[0].exercises[0].notes, /raise the bottom/)
})

test('resets strength reps after the top range and cues a small load bump', () => {
  const { plan } = applyProgressiveOverload(workout({
    name: 'Dumbbell Romanian Deadlift',
    sets: '3',
    reps: '12-12',
    rest: '90s',
    videoUrl: '',
    notes: 'Muscle-building focus.',
  }))

  assert.equal(plan[0].exercises[0].reps, '8-12')
  assert.match(plan[0].exercises[0].notes, /5-10%/)
})

test('progresses deep core with symptom-aware notes', () => {
  const { plan } = applyProgressiveOverload(workout({
    name: 'Dead Bug',
    sets: '2',
    reps: '6/side',
    rest: '30-45s',
    videoUrl: '',
    notes: 'Deep core focus.',
  }))

  assert.equal(plan[0].exercises[0].reps, '7/side')
  assert.match(plan[0].exercises[0].notes, /doming/)
})

