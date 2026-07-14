export const YMOVE_VIDEO_PREFIX = 'ymove:'

export type YMoveExercise = {
  id: string
  title: string
  slug: string
  description?: string | null
  instructions?: string[] | null
  importantPoints?: string[] | null
  muscleGroup?: string | null
  secondaryMuscles?: string[] | null
  equipment?: string | null
  category?: string | null
  difficulty?: string | null
  exerciseType?: string[] | null
  hasVideo?: boolean
  hasVideoWhite?: boolean
  hasVideoGym?: boolean
  videoUrl?: string | null
  videoHlsUrl?: string | null
  thumbnailUrl?: string | null
  videos?: Array<{
    videoUrl?: string | null
    videoHlsUrl?: string | null
    thumbnailUrl?: string | null
    tag?: string
    orientation?: string
    isPrimary?: boolean
  }>
}

export type LumoraExerciseDraft = {
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

const EQUIPMENT_MAP: Record<string, string> = {
  band: 'bands',
  dumbbell: 'dumbbells',
  bodyweight: 'bodyweight',
  barbell: 'barbell',
  cable: 'cable',
  machine: 'machine',
  kettlebell: 'kettlebell',
}

export function ymoveVideoRef(slug: string) {
  return `${YMOVE_VIDEO_PREFIX}${slug.trim()}`
}

export function parseYMoveVideoRef(value: string) {
  const trimmed = value.trim()
  return trimmed.startsWith(YMOVE_VIDEO_PREFIX) ? trimmed.slice(YMOVE_VIDEO_PREFIX.length).trim() : ''
}

export function ymoveVideoHref(value: string) {
  const slug = parseYMoveVideoRef(value)
  return slug ? `/api/ymove/exercises/${encodeURIComponent(slug)}/video` : ''
}

export function bestYMoveVideoUrl(exercise: YMoveExercise) {
  const primary = exercise.videos?.find((video) => video.tag === 'white-background' && video.isPrimary)
    ?? exercise.videos?.find((video) => video.tag === 'white-background')
    ?? exercise.videos?.find((video) => video.isPrimary)
    ?? exercise.videos?.[0]
  // MP4 before HLS: browsers other than Safari cannot play .m3u8 natively,
  // and these URLs feed plain <video> tags and direct link opens.
  return primary?.videoUrl || primary?.videoHlsUrl || exercise.videoUrl || exercise.videoHlsUrl || ''
}

function normalizedWords(exercise: YMoveExercise) {
  return [
    exercise.title,
    exercise.muscleGroup,
    exercise.category,
    ...(exercise.exerciseType ?? []),
  ].filter(Boolean).join(' ').toLowerCase()
}

export function inferLumoraMovementPattern(exercise: YMoveExercise) {
  const text = normalizedWords(exercise)
  if (text.includes('mobility') || text.includes('stretch') || text.includes('yoga')) return 'mobility'
  if (text.includes('hiit') || text.includes('interval')) return 'cardio_intervals'
  if (text.includes('cardio') || text.includes('bike') || text.includes('run') || text.includes('walk')) return 'cardio_steady'
  if (text.includes('core') || text.includes('abs') || text.includes('plank') || text.includes('crunch')) return 'core'
  if (text.includes('glute') || text.includes('hip thrust') || text.includes('bridge')) return 'glute'
  if (text.includes('deadlift') || text.includes('hinge') || text.includes('hamstring')) return 'hinge'
  if (text.includes('squat') || text.includes('quad') || text.includes('leg press')) return 'squat'
  if (text.includes('lunge') || text.includes('step-up') || text.includes('split squat')) return 'lunge'
  if (text.includes('row') || text.includes('back')) return 'pull_horizontal'
  if (text.includes('pulldown') || text.includes('pull-up') || text.includes('pullup')) return 'pull_vertical'
  if (text.includes('shoulder press') || text.includes('overhead press')) return 'push_vertical'
  if (text.includes('press') || text.includes('push-up') || text.includes('chest')) return 'push_horizontal'
  if (text.includes('carry') || text.includes('farmer')) return 'carry'
  return 'accessory'
}

export function mapYMoveExerciseToLumoraDraft(exercise: YMoveExercise): LumoraExerciseDraft {
  const instructions = (exercise.instructions ?? []).filter(Boolean)
  const points = (exercise.importantPoints ?? []).filter(Boolean)
  const cues = points.length > 0
    ? points.join('\n')
    : instructions.slice(0, 4).join('\n')

  const muscles = [
    exercise.muscleGroup,
    ...(exercise.secondaryMuscles ?? []),
  ].filter(Boolean).map((muscle) => String(muscle).replace(/_/g, ' '))

  return {
    name: exercise.title,
    movement_pattern: inferLumoraMovementPattern(exercise),
    primary_muscles: [...new Set(muscles)],
    equipment: EQUIPMENT_MAP[String(exercise.equipment ?? '').toLowerCase()] ?? 'bodyweight',
    difficulty: ['beginner', 'intermediate', 'advanced'].includes(String(exercise.difficulty))
      ? String(exercise.difficulty)
      : 'beginner',
    default_sets: '3',
    default_reps: '10',
    default_rest: '60s',
    cues,
    video_url: ymoveVideoRef(exercise.slug || exercise.id),
    female_recomp_priority: inferLumoraMovementPattern(exercise).match(/^(hinge|glute|squat|lunge)$/) ? 1 : 0,
    archived: false,
  }
}
