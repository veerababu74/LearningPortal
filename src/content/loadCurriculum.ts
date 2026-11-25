import type { CurriculumIndex, Lesson, TrackId } from '@/types/curriculum'
import indexJson from './generated/index.json'

type JsonModule = { default: unknown } | unknown

const trackLoaders: Record<TrackId, () => Promise<JsonModule>> = {
  'llm-concepts': () => import('./generated/llm-concepts.json'),
  rag: () => import('./generated/rag.json'),
  'agentic-ai': () => import('./generated/agentic-ai.json'),
  'multi-agent': () => import('./generated/multi-agent.json'),
  'llm-security': () => import('./generated/llm-security.json'),
  'llm-gateways': () => import('./generated/llm-gateways.json'),
  'production-failures': () => import('./generated/production-failures.json'),
}

const cache = new Map<TrackId, Lesson[]>()

function asLessons(mod: JsonModule): Lesson[] {
  if (Array.isArray(mod)) return mod as Lesson[]
  if (mod && typeof mod === 'object' && 'default' in mod) {
    return (mod as { default: Lesson[] }).default
  }
  return []
}

export function getCurriculumIndex(): CurriculumIndex {
  return indexJson as CurriculumIndex
}

export async function loadTrackLessons(trackId: TrackId): Promise<Lesson[]> {
  if (cache.has(trackId)) return cache.get(trackId)!
  const mod = await trackLoaders[trackId]()
  const lessons = asLessons(mod)
  cache.set(trackId, lessons)
  return lessons
}

export async function loadLesson(trackId: TrackId, lessonId: string): Promise<Lesson | undefined> {
  const lessons = await loadTrackLessons(trackId)
  return lessons.find((l) => l.id === lessonId)
}

export async function searchLessons(query: string, limit = 40) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const index = getCurriculumIndex()
  const hits: Array<{ trackId: TrackId; id: string; title: string; summary: string }> = []
  for (const [trackId, list] of Object.entries(index.lessonsByTrack) as Array<
    [TrackId, CurriculumIndex['lessonsByTrack'][TrackId]]
  >) {
    for (const lesson of list) {
      if (
        lesson.title.toLowerCase().includes(q) ||
        lesson.summary.toLowerCase().includes(q)
      ) {
        hits.push({ trackId, ...lesson })
        if (hits.length >= limit) return hits
      }
    }
  }
  return hits
}
