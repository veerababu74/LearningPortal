import { Link } from 'react-router-dom'
import { getCurriculumIndex } from '@/content/loadCurriculum'
import { useProgress } from '@/store/progress'
import './Tracks.css'

export function ProgressPage() {
  const index = getCurriculumIndex()
  const { completedLessonIds, bookmarks, quizScores, lastLessonId } = useProgress()

  return (
    <div className="progress-page">
      <header className="page-head">
        <h1>Your progress</h1>
        <p>Progress is stored in this browser. Complete quizzes or mark lessons done as you learn.</p>
      </header>

      <div className="track-list">
        {index.tracks.map((track) => {
          const ids = index.lessonsByTrack[track.id]?.map((l) => l.id) || []
          const done = ids.filter((id) => completedLessonIds.includes(id)).length
          const pct = ids.length ? Math.round((done / ids.length) * 100) : 0
          return (
            <article key={track.id} className="track-row" style={{ ['--accent' as string]: track.accent }}>
              <div className="track-copy">
                <h2>{track.title}</h2>
                <div className="track-meta">
                  <span>
                    {done}/{ids.length}
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="bar">
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
              <Link to={`/tracks/${track.id}`} className="btn soft">
                Open
              </Link>
            </article>
          )
        })}
      </div>

      <section style={{ marginTop: '2rem' }}>
        <h2>Bookmarks</h2>
        {bookmarks.length === 0 ? <p>No bookmarks yet.</p> : null}
        <ul>
          {bookmarks.map((id) => {
            let href = '#'
            for (const [trackId, list] of Object.entries(index.lessonsByTrack)) {
              if (list.some((l) => l.id === id)) {
                href = `/learn/${trackId}/${id}`
                break
              }
            }
            return (
              <li key={id}>
                <Link to={href}>{id}</Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2>Quiz scores</h2>
        {Object.keys(quizScores).length === 0 ? <p>No quiz scores yet.</p> : null}
        <ul>
          {Object.entries(quizScores).map(([id, score]) => (
            <li key={id}>
              {id}: {score}%
            </li>
          ))}
        </ul>
        {lastLessonId ? <p>Last lesson: {lastLessonId}</p> : null}
      </section>
    </div>
  )
}
