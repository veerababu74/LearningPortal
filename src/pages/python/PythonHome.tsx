import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PYTHON_PHASES,
  cleanPreview,
  getModulesForPhase,
  lessonTopic,
  searchPythonLessons,
} from '@/content/python/catalog'
import { PYTHON_LABS } from '@/content/python/modules'
import { PYTHON_PATH_COURSE } from '@/content/paths/courses'
import { getPythonPath } from '@/content/python/path'
import { PYTHON_GALLERY } from '@/content/sims/registry'
import { useProgress } from '@/store/progress'
import { PathMap, PathProgressHero } from '@/pages/path/PathPages'
import '@/components/python/python.css'
import '@/components/agents/agents.css'
import './python-path.css'
import { tidyTitle } from '@/content/titles'

export function PythonHome() {
  const completed = useProgress((s) => s.completedLessonIds)
  const [q, setQ] = useState('')
  const hits = useMemo(() => searchPythonLessons(q).slice(0, 24), [q])
  const searching = q.trim().length > 0

  const { stages, order, topics } = getPythonPath()

  return (
    <div className="py-page">
      <PathProgressHero
        course={PYTHON_PATH_COURSE}
        heading="From your first variable to production backends — in the right order"
        text={`A guided path of ${topics.length} topics in ${stages.length} stages. Each topic gives you the lessons in order, a simulation to watch, a lab to try, practice examples and interview questions.`}
        chips={[`${order.length} lessons`, `${topics.length} topics`, `${PYTHON_GALLERY.length} simulations`, `${PYTHON_LABS.length + 2} labs`]}
      />

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
                <h3>{tidyTitle(cleanPreview(lessonTopic(lesson.title)))}</h3>
                <p>{cleanPreview(lesson.summary)}</p>
              </Link>
            ))}
            {!hits.length ? <p className="py-muted">No lessons match “{q.trim()}”.</p> : null}
          </div>
        </section>
      ) : (
        <>
          <section className="py-section">
            <div className="py-section-row">
              <h2>Your learning path</h2>
              <span className="py-muted">Core lessons count towards progress; practice and deep dives are optional.</span>
            </div>
            <PathMap course={PYTHON_PATH_COURSE} />
          </section>

          <section className="py-section">
            <h2>Practise what you learned</h2>
            <div className="py-phase-grid">
              {PYTHON_PHASES.filter((p) => p.id !== 'learn').map((phase) => {
                const count = getModulesForPhase(phase.id).reduce((n, m) => n + m.lessons.length, 0)
                return (
                  <Link key={phase.id} to={`/python/${phase.id}`} className="py-phase-card" style={{ ['--phase-accent' as string]: phase.accent }}>
                    <p className="py-kicker">{count} sets</p>
                    <h2>{phase.title}</h2>
                    <p>{phase.blurb}</p>
                    <span className="py-phase-meta">{count} lessons</span>
                  </Link>
                )
              })}
            </div>
          </section>

          <section className="py-section">
            <div className="ag-sim-head">
              <div>
                <h2>See the interpreter at work</h2>
                <p className="py-muted">Animated simulations of call stacks, references, generators, the event loop and the GIL.</p>
              </div>
              <Link className="ag-cta soft" to="/python/visualizer">
                All {PYTHON_GALLERY.length} simulations →
              </Link>
            </div>
            <div className="ag-sim-grid">
              {PYTHON_GALLERY.slice(0, 6).map((s) => (
                <Link key={s.id} to={`/python/visualizer/${s.id}`} className="ag-sim-card">
                  <div className="ag-tags">
                    <span className="ag-tag">▶ {s.framework}</span>
                    <span className="ag-tag lvl">{s.level}</span>
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.summary}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="py-section">
            <div className="py-section-row">
              <h2>Interactive labs</h2>
              <Link to="/labs?topic=python" className="py-btn soft">
                All labs
              </Link>
            </div>
            <div className="py-card-grid py-card-grid-labs">
              <Link to="/labs/hash-table" className="py-browse-card">
                <span className="py-sim-tag">Playground</span>
                <h3>Dict hash table</h3>
                <p>Insert your own keys and watch probing, tombstones and resizing.</p>
              </Link>
              <Link to="/labs/concurrency-playground" className="py-browse-card">
                <span className="py-sim-tag">Playground</span>
                <h3>Concurrency playground</h3>
                <p>Threads vs asyncio vs processes on your own task mix.</p>
              </Link>
              {PYTHON_LABS.map((lab) => (
                <Link key={lab.id} to={`/python/labs/${lab.id}`} className="py-browse-card">
                  <span className="py-sim-tag">Simulation</span>
                  <h3>{lab.title}</h3>
                  <p>{lab.blurb}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="py-section">
            <h2>Deep dive</h2>
            <Link to="/async/learn/07" className="py-phase-card" style={{ ['--phase-accent' as string]: '#b45309' }}>
              <p className="py-kicker">CPython under the hood</p>
              <h2>How Python Works Internally</h2>
              <p>
                Source → bytecode → eval loop, the object model, dict and set internals, memory management (refcount, GC,
                pymalloc) and the GIL.
              </p>
              <span className="py-phase-meta">Open Python Internals →</span>
            </Link>
          </section>
        </>
      )}
    </div>
  )
}
