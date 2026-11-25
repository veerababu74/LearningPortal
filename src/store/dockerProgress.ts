import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type DockerProgressState = {
  completedLessonIds: string[]
  lastPath: string | null
  markComplete: (lessonKey: string) => void
  setLastPath: (path: string) => void
}

export const useDockerProgress = create<DockerProgressState>()(
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
    { name: 'learngenai-docker-progress' },
  ),
)
