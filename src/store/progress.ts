import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ProgressState = {
  completedLessonIds: string[]
  quizScores: Record<string, number>
  bookmarks: string[]
  lastLessonId?: string
  markComplete: (lessonId: string) => void
  setQuizScore: (lessonId: string, score: number) => void
  toggleBookmark: (lessonId: string) => void
  setLastLesson: (lessonId: string) => void
  trackProgress: (lessonIds: string[]) => { done: number; total: number; pct: number }
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedLessonIds: [],
      quizScores: {},
      bookmarks: [],
      lastLessonId: undefined,
      markComplete: (lessonId) =>
        set((s) => ({
          completedLessonIds: s.completedLessonIds.includes(lessonId)
            ? s.completedLessonIds
            : [...s.completedLessonIds, lessonId],
          lastLessonId: lessonId,
        })),
      setQuizScore: (lessonId, score) =>
        set((s) => ({ quizScores: { ...s.quizScores, [lessonId]: score } })),
      toggleBookmark: (lessonId) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(lessonId)
            ? s.bookmarks.filter((id) => id !== lessonId)
            : [...s.bookmarks, lessonId],
        })),
      setLastLesson: (lessonId) => set({ lastLessonId: lessonId }),
      trackProgress: (lessonIds) => {
        const done = lessonIds.filter((id) => get().completedLessonIds.includes(id)).length
        const total = lessonIds.length
        return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
      },
    }),
    { name: 'learngenai-progress-v1' },
  ),
)
