import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { loadTrackLessons } from '@/content/loadCurriculum'
import type { Lesson, TrackId } from '@/types/curriculum'
import { LessonShell } from '@/components/lesson/LessonShell'

export function LessonPage() {
  const { trackId = '', lessonId = '' } = useParams()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [siblings, setSiblings] = useState<Lesson[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    loadTrackLessons(trackId as TrackId)
      .then((list) => {
        if (!alive) return
        setSiblings(list)
        const found = list.find((l) => l.id === lessonId) || null
        setLesson(found)
        if (!found) setError('Lesson not found')
      })
      .catch(() => {
        if (alive) setError('Failed to load lesson content')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [trackId, lessonId])

  if (loading) {
    return (
      <div className="track-page">
        <p>Loading lesson…</p>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="track-page">
        <h1>{error || 'Lesson not found'}</h1>
        <Link to={`/tracks/${trackId}`}>Back to track</Link>
      </div>
    )
  }

  const idx = siblings.findIndex((l) => l.id === lesson.id)
  const prevId = idx > 0 ? siblings[idx - 1]?.id : undefined
  const nextId = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1]?.id : undefined

  return <LessonShell lesson={lesson} prevId={prevId} nextId={nextId} />
}
