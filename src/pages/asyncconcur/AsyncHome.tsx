import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurriculumIndex } from '@/content/loadCurriculum'
import {
  ASYNC_PHASES,
  cleanPreview,
  getModulesForPhase,
  lessonTopic,
  searchAsyncLessons,
} from '@/content/asyncconcur/catalog'
import { useProgress } from '@/store/progress'
import '@/components/python/python.css'

export function AsyncHome() {
  const index = getCurriculumIndex()
  const track = index.tracks.find((t) => t.id === 'asyncconcur')
  const completed = useProgress((s) => s.completedLessonIds)
  const [q, setQ] = useState('')
  const hits = useMemo(() => searchAsyncLessons(q).slice(0, 24), [q])
  const searching = q.trim().length > 0

  return (
    <div className="py-page">
      <section className="py-hero" style={{ borderLeft: '5px solid #0f766e' }}>
        <p className="py-kicker" style={{ color: '#0f766e' }}>
          Async & Concurrency
        </p>
        <h1>Learn · Exercises · Projects · Interview</h1>
        <p>
          Structured course from the <code>asyncconcur</code> pack: threading, multiprocessing,
          asyncio, production patterns — same card path and GenAI lesson shell as Python.
        </p>
        <p className="py-muted">{track?.lessonCount ?? 0} lessons · sourced from .md / .py / .ipynb</p>
      </section>

      <label className="py-search-wrap">
        <span className="py-kicker">Search</span>
        <input
          className="py-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search — GIL, asyncio gather, ProcessPool, race condition…"
          aria-label="Search async lessons"
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
                to={`/learn/asyncconcur/${lesson.id}`}
                className={completed.includes(lesson.id) ? 'py-browse-card done' : 'py-browse-card'}
              >
                <p className="py-kicker">{lesson.title.match(/^\d{2}\.\s*[^:]+/)?.[0] || 'Async'}</p>
                <h3>{cleanPreview(lessonTopic(lesson.title))}</h3>
                <p>{cleanPreview(lesson.summary)}</p>
              </Link>
            ))}
            {!hits.length ? <p className="py-muted">No lessons match “{q.trim()}”.</p> : null}
          </div>
        </section>
      ) : (
        <section className="py-section">
          <h2>Choose a path</h2>
          <div className="py-phase-grid">
            {ASYNC_PHASES.map((phase) => {
              const modules = getModulesForPhase(phase.id)
              const lessonCount = modules.reduce((n, m) => n + m.lessons.length, 0)
              return (
                <Link
                  key={phase.id}
                  to={`/async/${phase.id}`}
                  className="py-phase-card"
                  style={{ ['--phase-accent' as string]: phase.accent }}
                >
                  <p className="py-kicker">
                    {phase.id === 'learn' ? `${modules.length} modules` : `${lessonCount} topics`}
                  </p>
                  <h2>{phase.title}</h2>
                  <p>{phase.blurb}</p>
                  <span className="py-phase-meta">{lessonCount} lessons</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
