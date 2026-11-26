import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCurriculumIndex, loadLesson } from '@/content/loadCurriculum'
import type { Lesson, TrackId } from '@/types/curriculum'
import { LessonShell } from '@/components/lesson/LessonShell'
import { courseHomeFor } from '@/content/courses'
import { pathForTrack } from '@/content/paths/courses'

export function LessonPage() {
  const { trackId = '', lessonId = '' } = useParams()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // prev / next come from the small index — no need to download the whole track
  const siblings = getCurriculumIndex().lessonsByTrack[trackId as TrackId] || []

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    loadLesson(trackId as TrackId, lessonId)
      .then((found) => {
        if (!alive) return
        setLesson(found || null)
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
      <div className="track-page" aria-busy="true">
        <div className="page-loading">
          <span className="spinner" aria-hidden />
          Loading lesson…
        </div>
      </div>
    )
  }

  if (error || !lesson) {
    const home = courseHomeFor(trackId)
    return (
      <div className="track-page">
        <h1>{error || 'Lesson not found'}</h1>
        <p>
          <Link to={home.to}>← Back to {home.label}</Link>
        </p>
      </div>
    )
  }

  // Learn lessons of courses with a learning path follow the path order; everything else follows the index order
  const pathOrder = pathForTrack(trackId)?.getPath().order ?? null
  const ordered = pathOrder && pathOrder.includes(lesson.id) ? pathOrder.map((id) => ({ id })) : siblings
  const idx = ordered.findIndex((l) => l.id === lesson.id)
  const prevId = idx > 0 ? ordered[idx - 1]?.id : undefined
  const nextId = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1]?.id : undefined

  return <LessonShell lesson={lesson} prevId={prevId} nextId={nextId} />
}
