import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  cleanPreview,
  getModulesForPhase,
  getPhase,
  lessonTopic,
  searchPythonLessons,
  type PyPhaseId,
} from '@/content/python/catalog'
import { useProgress } from '@/store/progress'
import { SeriesCards } from '@/components/python/SeriesCards'
import '@/components/python/python.css'

export function PythonPhasePage() {
  const { phaseId = '' } = useParams()
  const phase = getPhase(phaseId)
  const completed = useProgress((s) => s.completedLessonIds)
  const [q, setQ] = useState('')

  const modules = useMemo(() => getModulesForPhase(phaseId), [phaseId])
  const isLearn = phaseId === 'learn'

  const hits = useMemo(
    () => searchPythonLessons(q, { phaseId }),
    [q, phaseId],
  )
  const searching = q.trim().length > 0

  if (!phase) return <Navigate to="/python" replace />

  return (
    <div className="py-page">
      <nav className="py-crumbs" aria-label="Breadcrumb">
        <Link to="/python">Python</Link>
        <span>/</span>
        <span>{phase.title}</span>
      </nav>

      <section className="py-hero" style={{ borderLeft: `5px solid ${phase.accent}` }}>
        <p className="py-kicker" style={{ color: phase.accent }}>
          {phase.title}
        </p>
        <h1>{isLearn ? 'Concept modules' : `${phase.title} by concept`}</h1>
        <p>{phase.blurb}</p>
      </section>

      <label className="py-search-wrap">
        <span className="py-kicker">Search in {phase.title}</span>
        <input
          className="py-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Filter ${phase.title.toLowerCase()}…`}
          aria-label={`Search ${phase.title}`}
        />
      </label>

      {searching ? (
        <section className="py-section">
          <h2>
            Results <span className="py-count">{hits.length}</span>
          </h2>
          <div className="py-card-grid">
            {hits.map((lesson) => (
              <Link
                key={lesson.id}
                to={`/learn/python/${lesson.id}`}
                className={completed.includes(lesson.id) ? 'py-browse-card done' : 'py-browse-card'}
              >
                <h3>{cleanPreview(lessonTopic(lesson.title))}</h3>
                <p>{cleanPreview(lesson.summary)}</p>
              </Link>
            ))}
            {!hits.length ? <p className="py-muted">No matches.</p> : null}
          </div>
        </section>
      ) : isLearn ? (
        <section className="py-section">
          <h2>
            Modules <span className="py-count">{modules.length}</span>
          </h2>
          <div className="py-card-grid">
            {modules.map((mod) => (
              <Link
                key={mod.id}
                to={`/python/learn/${mod.id}`}
                className="py-browse-card py-module-card"
              >
                <p className="py-kicker">Module {mod.id}</p>
                <h3>
                  {mod.id}. {mod.name}
                </h3>
                <p>{mod.lessons.length} lessons — open to pick a topic card.</p>
                <span className="py-phase-meta">{mod.lessons.length} lessons</span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="py-section">
          <h2>
            Topics <span className="py-count">{modules[0]?.lessons.length || 0}</span>
          </h2>
          <SeriesCards
            lessons={modules[0]?.lessons || []}
            hrefBase="/learn/python"
            completed={completed}
            topicOf={lessonTopic}
            preview={cleanPreview}
          />
        </section>
      )}
    </div>
  )
}

export function isPyPhaseId(value: string): value is PyPhaseId {
  return ['learn', 'exercises', 'projects', 'interview'].includes(value)
}
