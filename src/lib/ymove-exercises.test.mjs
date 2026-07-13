import assert from 'node:assert/strict'
import test from 'node:test'

import {
  inferLumoraMovementPattern,
  mapYMoveExerciseToLumoraDraft,
  parseYMoveVideoRef,
  ymoveVideoHref,
  bestYMoveVideoUrl,
} from './ymove-exercises.ts'

test('maps YMove lower-body exercises into Lumora coaching drafts', () => {
  const draft = mapYMoveExerciseToLumoraDraft({
    id: 'abc',
    slug: 'barbell-hip-thrust',
    title: 'Barbell Hip Thrust',
    muscleGroup: 'glutes',
    secondaryMuscles: ['hamstrings'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: ['Set your shoulders on a bench.', 'Drive through the heels.'],
    importantPoints: ['Keep ribs down.', 'Squeeze glutes at the top.'],
    exerciseType: ['strength'],
    hasVideo: true,
  })

  assert.equal(draft.name, 'Barbell Hip Thrust')
  assert.equal(draft.movement_pattern, 'glute')
  assert.equal(draft.equipment, 'barbell')
  assert.equal(draft.difficulty, 'intermediate')
  assert.equal(draft.video_url, 'ymove:barbell-hip-thrust')
  assert.equal(draft.female_recomp_priority, 1)
  assert.match(draft.cues, /Keep ribs down/)
})

test('builds backend YMove video links from stored refs', () => {
  assert.equal(parseYMoveVideoRef('ymove:goblet-squat'), 'goblet-squat')
  assert.equal(ymoveVideoHref('ymove:goblet-squat'), '/api/ymove/exercises/goblet-squat/video')
  assert.equal(ymoveVideoHref('https://youtube.com/watch?v=demo'), '')
})

test('infers common Lumora movement patterns', () => {
  assert.equal(inferLumoraMovementPattern({ id: '1', slug: 'x', title: 'Single Arm Dumbbell Row', muscleGroup: 'back' }), 'pull_horizontal')
  assert.equal(inferLumoraMovementPattern({ id: '2', slug: 'x', title: 'Dead Bug', muscleGroup: 'abs' }), 'core')
  assert.equal(inferLumoraMovementPattern({ id: '3', slug: 'x', title: 'Stationary Bike Intervals', muscleGroup: 'cardio' }), 'cardio_intervals')
})

test('prefers white-background YMove videos over other available videos', () => {
  assert.equal(
    bestYMoveVideoUrl({
      id: '4',
      slug: 'band-row',
      title: 'Resistance Band Row',
      videos: [
        { tag: 'gym-shot', videoUrl: 'https://example.com/gym.mp4', isPrimary: true },
        { tag: 'white-background', videoUrl: 'https://example.com/white.mp4' },
      ],
    }),
    'https://example.com/white.mp4',
  )
})
