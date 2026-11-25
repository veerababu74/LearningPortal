import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  AGENT_MODULE_INFO,
  cleanPreview,
  getModule,
  lessonTopic,
  phaseForModule,
  searchAgentLessons,
} from '@/content/agents/catalog'
import { AGENT_GALLERY as AGENT_SIMS } from '@/content/sims/registry'
import { useProgress } from '@/store/progress'
import { SeriesCards } from '@/components/python/SeriesCards'
import '@/components/python/python.css'
import '@/components/agents/agents.css'

export function AgentsModuleBrowsePage() {
  const { moduleId = '' } = useParams()
  const mod = getModule(moduleId)
  const info = AGENT_MODULE_INFO[moduleId]
  const completed = useProgress((s) => s.completedLessonIds)
  const [q, setQ] = useState('')
  const hits = useMemo(() => searchAgentLessons(q, { moduleId }), [q, moduleId])
  const searching = q.trim().length > 0
  const sims = AGENT_SIMS.filter((s) => s.module === moduleId)

  if (!mod || phaseForModule(moduleId) !== 'learn') return <Navigate to="/agents/learn" replace />

  const lessons = searching ? hits : mod.lessons
  const next = String(Number(moduleId) + 1).padStart(2, '0')
  const hasNext = phaseForModule(next) === 'learn'

  return (
    <div className="py-page">
      <nav className="py-crumbs" aria-label="Breadcrumb">
        <Link to="/agents">VeeraAgents</Link>
        <span>/</span>
        <Link to="/agents/learn">Learn</Link>
        <span>/</span>
        <span>
          {mod.id}. {mod.name}
        </span>
      </nav>

      <section className="py-hero" style={{ borderLeft: `5px solid ${info?.color || '#7c3aed'}` }}>
        <p className="py-kicker" style={{ color: info?.color }}>
          {info?.icon} Module {mod.id}
        </p>
        <h1>{mod.name}</h1>
        <p>{info?.blurb}</p>
        <p className="py-muted">
          Suggested order: watch the simulation first, then read the curriculum lesson, then the deeper guides and
          notebooks in the same series.
        </p>
      </section>

      {sims.length ? (
        <section className="py-section">
          <h2>
            Watch first <span className="py-count">{sims.length}</span>
          </h2>
          <div className="ag-sim-grid">
            {sims.map((s) => (
              <Link key={s.id} to={`/agents/visualizer/${s.id}`} className="ag-sim-card">
                <div className="ag-tags">
                  <span className="ag-tag">▶ {s.framework}</span>
                  <span className="ag-tag lvl">{s.level}</span>
                  <span className="ag-tag lvl">{s.steps.length} steps</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <label className="py-search-wrap">
        <span className="py-kicker">Search in this module</span>
        <input
          className="py-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Filter ${mod.name} lessons…`}
          aria-label={`Search ${mod.name}`}
        />
      </label>

      <section className="py-section">
        <h2>
          Lessons <span className="py-count">{lessons.length}</span>
        </h2>
        <SeriesCards
          lessons={lessons}
          hrefBase="/learn/agents"
          completed={completed}
          topicOf={lessonTopic}
          preview={cleanPreview}
        />
      </section>

      {hasNext ? (
        <p>
          <Link className="ag-cta soft" to={`/agents/learn/${next}`}>
            Next module {next} →
          </Link>
        </p>
      ) : null}
    </div>
  )
}
