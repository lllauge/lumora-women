import {
  bestYMoveVideoUrl,
  mapYMoveExerciseToLumoraDraft,
  type YMoveExercise,
} from '@/lib/ymove-exercises'

const YMOVE_BASE_URL = 'https://exercise-api.ymove.app/api/v2'

type YMoveListResponse = {
  data?: YMoveExercise[]
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  _warning?: unknown
  error?: string
  message?: string
}

type YMoveSingleResponse = {
  data?: YMoveExercise
  _warning?: unknown
  error?: string
  message?: string
}

function getYMoveApiKey() {
  const key = process.env.YMOVE_API_KEY?.trim()
  if (!key) throw new Error('YMOVE_API_KEY is not configured.')
  return key
}

function ymoveErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const error = payload as { error?: unknown; message?: unknown }
    return String(error.message || error.error || fallback)
  }
  return fallback
}

async function ymoveFetch<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(`${YMOVE_BASE_URL}${path}`)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }

  const response = await fetch(url, {
    headers: {
      'X-API-Key': getYMoveApiKey(),
      Accept: 'application/json',
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(ymoveErrorMessage(payload, `YMove request failed with ${response.status}.`))
  }
  return payload as T
}

export async function searchYMoveExercises(params: {
  search?: string
  muscleGroup?: string
  exerciseType?: string
  equipment?: string
  difficulty?: string
  page?: number
  pageSize?: number
}) {
  const payload = await ymoveFetch<YMoveListResponse>('/exercises', {
    ...params,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 12,
    hasVideoWhite: true,
    videoTag: 'white-background',
    includeVideos: false,
  })

  return {
    exercises: (payload.data ?? []).map((exercise) => ({
      ...exercise,
      lumoraDraft: mapYMoveExerciseToLumoraDraft(exercise),
    })),
    pagination: payload.pagination ?? null,
    warning: payload._warning ?? null,
  }
}

export async function getYMoveExercise(idOrSlug: string) {
  const payload = await ymoveFetch<YMoveSingleResponse>(`/exercises/${encodeURIComponent(idOrSlug)}`)
  if (!payload.data) throw new Error('YMove exercise not found.')
  return payload.data
}

export { bestYMoveVideoUrl }
