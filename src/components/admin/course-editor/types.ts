/** Shared draft types for the course editor. Mirrors the server-side schema. */

export type DownloadDraft = {
  /** DB id when persisted. Undefined for new entries. */
  id?: string
  /** Client-only key used for React reconciliation. Stable across the editor session. */
  _key: string
  file_name: string
  file_url:  string
  file_type: string | null
}

export type LessonDraft = {
  id?: string
  _key: string
  title:     string
  content:   string
  video_url: string
  downloads: DownloadDraft[]
}

export type ModuleDraft = {
  id?: string
  _key: string
  title:   string
  lessons: LessonDraft[]
}

export type CourseDraft = {
  id?: string
  title:         string
  subtitle:      string
  description:   string
  price:         number
  is_free:       boolean
  thumbnail_url: string
  modules:       ModuleDraft[]
}

/** Strips the editor-only `_key` fields before sending to the server. */
export function toServerPayload(draft: CourseDraft) {
  return {
    id: draft.id,
    title:         draft.title,
    subtitle:      draft.subtitle,
    description:   draft.description,
    price:         draft.price,
    is_free:       draft.is_free,
    thumbnail_url: draft.thumbnail_url,
    modules: draft.modules.map((m) => ({
      id:    m.id,
      title: m.title,
      lessons: m.lessons.map((l) => ({
        id:        l.id,
        title:     l.title,
        content:   l.content,
        video_url: l.video_url,
        downloads: l.downloads.map((d) => ({
          id:        d.id,
          file_name: d.file_name,
          file_url:  d.file_url,
          file_type: d.file_type,
        })),
      })),
    })),
  }
}

/** Generates a unique client-side key for new draft items. */
export function newKey(prefix = 'k'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
}
