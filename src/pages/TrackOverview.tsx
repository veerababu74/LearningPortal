import { Link, useParams } from 'react-router-dom'
import { getCurriculumIndex } from '@/content/loadCurriculum'
import type { TrackId } from '@/types/curriculum'
import { useProgress } from '@/store/progress'
import './Tracks.css'

export function TrackOverview() {
  const { trackId = '' } = useParams()
  const index = getCurriculumIndex()
  const track = index.tracks.find((t) => t.id === trackId)
  const lessons = index.lessonsByTrack[trackId as TrackId] || []
  const completed = useProgress((s) => s.completedLessonIds)

  if (!track) {
    return (
      <div className="track-page">
        <h1>Track not found</h1>
        <Link to="/tracks">Back to tracks</Link>
      </div>
    )
  }

  return (
    <div className="track-page">
      <header className="page-head">
        <p className="tagline" style={{ color: track.accent }}>
          {track.tagline}
        </p>
        <h1>{track.title}</h1>
        <p>{track.description}</p>
      </header>
      <div className="lesson-grid">
        {lessons.map((lesson) => (
          <Link
            key={lesson.id}
            to={`/learn/${trackId}/${lesson.id}`}
            className={completed.includes(lesson.id) ? 'lesson-link done' : 'lesson-link'}
          >
            <span className="num">{String(lesson.order).padStart(2, '0')}</span>
            <div>
              <h3>{lesson.title}</h3>
              <p>{lesson.summary}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
