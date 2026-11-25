import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type PythonProgressState = {
  completedLessonIds: string[]
  lastPath: string | null
  markComplete: (lessonKey: string) => void
  setLastPath: (path: string) => void
}

export const usePythonProgress = create<PythonProgressState>()(
  persist(
    (set, get) => ({
      completedLessonIds: [],
      lastPath: null,
      markComplete: (lessonKey) => {
        const cur = get().completedLessonIds
        if (cur.includes(lessonKey)) return
        set({ completedLessonIds: [...cur, lessonKey] })
      },
      setLastPath: (path) => set({ lastPath: path }),
    }),
    { name: 'learngenai-python-progress' },
  ),
)
