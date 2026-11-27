import { Link } from 'react-router-dom'
import { getCurriculumIndex } from '@/content/loadCurriculum'
import { useProgress } from '@/store/progress'
import './Tracks.css'

export function Tracks() {
  const index = getCurriculumIndex()
  const completedIds = useProgress((s) => s.completedLessonIds)

  return (
    <div className="tracks-page">
      <header className="page-head">
        <h1>Learning tracks</h1>
        <p>Seven complete tracks built from your full roadmap corpus. Pick a path and learn visually.</p>
      </header>
      <div className="track-list">
        {index.tracks.map((track) => {
          const ids = index.lessonsByTrack[track.id]?.map((l) => l.id) || []
          const done = ids.filter((id) => completedIds.includes(id)).length
          const pct = ids.length ? Math.round((done / ids.length) * 100) : 0
          const first = index.lessonsByTrack[track.id]?.[0]
          return (
            <article key={track.id} className="track-row" style={{ ['--accent' as string]: track.accent }}>
              <div className="track-copy">
                <h2>{track.title}</h2>
                <p className="tagline">{track.tagline}</p>
                <p>{track.description}</p>
                <div className="track-meta">
                  <span>{track.lessonCount} lessons</span>
                  <span>{pct}% complete</span>
                </div>
                <div className="bar">
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="track-actions">
                <Link
                  to={
                    track.id === 'python'
                      ? '/python'
                      : track.id === 'veerarag'
                      ? '/rag'
                      : track.id === 'veeraproject'
                      ? '/project'
                      : track.id === 'veeraml'
                      ? '/ml'
                      : track.id === 'agents'
                      ? '/agents'
                      : track.id === 'asyncconcur'
                        ? '/async'
                        : `/tracks/${track.id}`
                  }
                  className="btn soft"
                >
                  Overview
                </Link>
                {first ? (
                  <Link to={`/learn/${track.id}/${first.id}`} className="btn solid">
                    Start
                  </Link>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
