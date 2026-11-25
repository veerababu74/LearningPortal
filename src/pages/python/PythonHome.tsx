import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurriculumIndex } from '@/content/loadCurriculum'
import {
  PYTHON_PHASES,
  cleanPreview,
  getModulesForPhase,
  lessonTopic,
  searchPythonLessons,
} from '@/content/python/catalog'
import { PYTHON_LABS } from '@/content/python/modules'
import { PYTHON_GALLERY } from '@/content/sims/registry'
import '@/components/agents/agents.css'
import { useProgress } from '@/store/progress'
import '@/components/python/python.css'

export function PythonHome() {
  const index = getCurriculumIndex()
  const track = index.tracks.find((t) => t.id === 'python')
  const completed = useProgress((s) => s.completedLessonIds)
  const [q, setQ] = useState('')

  const hits = useMemo(() => searchPythonLessons(q).slice(0, 24), [q])
  const searching = q.trim().length > 0

  return (
    <div className="py-page">
      <section className="py-hero">
        <p className="py-kicker">Python Mastery</p>
        <h1>Learn · Exercises · Projects · Interview</h1>
        <p>
          Pick a path card below. Open Learn for concept modules, then drill into a module card for
          lessons. Exercises, Projects, and Interview work the same way — one card per concept.
        </p>
        <p className="py-muted">
          {track?.lessonCount ?? 0} lessons · {PYTHON_LABS.length} labs · {PYTHON_GALLERY.length} animated simulations
        </p>
        <div className="ag-hero-cta">
          <Link className="ag-cta" to="/python/visualizer">
            ▶ Python Visualizer — watch code run step by step
          </Link>
        </div>
      </section>

      <label className="py-search-wrap">
        <span className="py-kicker">Search</span>
        <input
          className="py-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search lessons — inheritance, GIL, pydantic, FastAPI…"
          aria-label="Search Python lessons"
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
                <p className="py-kicker">{lesson.title.match(/^\d{2}\.\s*[^:]+/)?.[0] || 'Python'}</p>
                <h3>{cleanPreview(lessonTopic(lesson.title))}</h3>
                <p>{cleanPreview(lesson.summary)}</p>
              </Link>
            ))}
            {!hits.length ? <p className="py-muted">No lessons match “{q.trim()}”.</p> : null}
          </div>
        </section>
      ) : (
        <>
          <section className="py-section">
            <h2>Choose a path</h2>
            <div className="py-phase-grid">
              {PYTHON_PHASES.map((phase) => {
                const modules = getModulesForPhase(phase.id)
                const lessonCount = modules.reduce((n, m) => n + m.lessons.length, 0)
                return (
                  <Link
                    key={phase.id}
                    to={`/python/${phase.id}`}
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

          <section className="py-section">
            <h2>Deep dive</h2>
            <Link
              to="/async/learn/07"
              className="py-phase-card"
              style={{ ['--phase-accent' as string]: '#b45309' }}
            >
              <p className="py-kicker">CPython under the hood</p>
              <h2>How Python Works Internally</h2>
              <p>
                Source → bytecode → eval loop, the object model, dict and set internals, memory
                management (refcount, GC, pymalloc) and the GIL — 6 lessons with diagrams and exercises.
              </p>
              <span className="py-phase-meta">Open Python Internals →</span>
            </Link>
          </section>

          <section className="py-section">
            <div className="py-section-row">
              <h2>Interactive labs</h2>
              <Link to="/python/labs" className="py-btn soft">
                All labs
              </Link>
            </div>
            <div className="py-card-grid py-card-grid-labs">
              {PYTHON_LABS.map((lab) => (
                <Link key={lab.id} to={`/python/labs/${lab.id}`} className="py-browse-card">
                  <span className="py-sim-tag">Simulation</span>
                  <h3>{lab.title}</h3>
                  <p>{lab.blurb}</p>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
