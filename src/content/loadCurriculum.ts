import type { CurriculumIndex, Lesson, TrackId } from '@/types/curriculum'
import indexJson from './generated/index.json'

type JsonModule = { default: unknown } | unknown

/**
 * Every track is sharded: one JSON file per lesson under generated/<track>/lessons/.
 * Opening a lesson downloads only that lesson (Vite turns each file into its own chunk).
 */
const lessonLoaders = import.meta.glob('./generated/*/lessons/*.json') as Record<string, () => Promise<JsonModule>>

const byTrack = new Map<string, Record<string, () => Promise<JsonModule>>>()
for (const [key, loader] of Object.entries(lessonLoaders)) {
  const track = key.split('/')[2]
  if (!byTrack.has(track)) byTrack.set(track, {})
  byTrack.get(track)![key] = loader
}

const lessonCache = new Map<string, Lesson>()
const trackCache = new Map<TrackId, Lesson[]>()

function asLesson(mod: JsonModule): Lesson | null {
  if (!mod) return null
  if (typeof mod === 'object' && 'default' in mod) {
    const d = (mod as { default: Lesson }).default
    return d?.id ? d : null
  }
  if (typeof mod === 'object' && 'id' in (mod as object)) return mod as Lesson
  return null
}

const fileName = (lessonId: string) => `${lessonId.replace(/[^a-z0-9-_]/gi, '_').slice(0, 100)}.json`

export function getCurriculumIndex(): CurriculumIndex {
  return indexJson as CurriculumIndex
}

/** Load one lesson (a single small JSON file). */
export async function loadLesson(trackId: TrackId, lessonId: string): Promise<Lesson | undefined> {
  const cacheKey = `${trackId}/${lessonId}`
  if (lessonCache.has(cacheKey)) return lessonCache.get(cacheKey)
  const loaders = byTrack.get(trackId) || {}
  const key = `./generated/${trackId}/lessons/${fileName(lessonId)}`
  const loader = loaders[key]
  if (!loader) return undefined
  const lesson = asLesson(await loader())
  if (lesson) lessonCache.set(cacheKey, lesson)
  return lesson || undefined
}

export const loadTrackLessonById = loadLesson

/** Load every lesson of a track (rarely needed — prefer the index for lists). */
export async function loadTrackLessons(trackId: TrackId): Promise<Lesson[]> {
  if (trackCache.has(trackId)) return trackCache.get(trackId)!
  const entries = Object.values(byTrack.get(trackId) || {})
  const lessons: Lesson[] = []
  for (let i = 0; i < entries.length; i += 40) {
    const part = await Promise.all(entries.slice(i, i + 40).map((load) => load()))
    for (const mod of part) {
      const lesson = asLesson(mod)
      if (lesson) lessons.push(lesson)
    }
  }
  lessons.sort((a, b) => a.order - b.order)
  trackCache.set(trackId, lessons)
  return lessons
}

export type SearchHit = { trackId: TrackId; id: string; title: string; summary: string }

/** Search titles + summaries in the index (no lesson bodies are downloaded). */
export function searchLessons(query: string, limit = 500): SearchHit[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const index = getCurriculumIndex()
  const hits: Array<SearchHit & { score: number }> = []
  for (const [trackId, list] of Object.entries(index.lessonsByTrack) as Array<[TrackId, CurriculumIndex['lessonsByTrack'][TrackId]]>) {
    for (const lesson of list) {
      const title = lesson.title.toLowerCase()
      const hay = `${title} ${lesson.summary.toLowerCase()} ${(lesson.series || '').toLowerCase()}`
      if (!words.every((w) => hay.includes(w))) continue
      const score = words.reduce((n, w) => n + (title.includes(w) ? 2 : 1), 0)
      hits.push({ trackId, id: lesson.id, title: lesson.title, summary: lesson.summary, score })
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}
