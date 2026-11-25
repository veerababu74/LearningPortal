import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurriculumIndex } from '@/content/loadCurriculum'
import {
  AGENT_MODULE_INFO,
  AGENT_PHASES,
  cleanPreview,
  getModulesForPhase,
  lessonTopic,
  searchAgentLessons,
} from '@/content/agents/catalog'
import { getSim } from '@/content/agents/visualizer'
import { AGENT_GALLERY as AGENT_SIMS } from '@/content/sims/registry'
import { AgentSimPlayer } from '@/components/agents/AgentSimPlayer'
import { useProgress } from '@/store/progress'
import '@/components/python/python.css'
import '@/components/agents/agents.css'

export function AgentsHome() {
  const index = getCurriculumIndex()
  const track = index.tracks.find((t) => t.id === 'agents')
  const completed = useProgress((s) => s.completedLessonIds)
  const [q, setQ] = useState('')
  const hits = useMemo(() => searchAgentLessons(q).slice(0, 30), [q])
  const searching = q.trim().length > 0
  const learnModules = getModulesForPhase('learn')
  const demo = getSim('react-loop')!
  const allIds = (index.lessonsByTrack.agents || []).map((l) => l.id)
  const doneCount = allIds.filter((id) => completed.includes(id)).length

  return (
    <div className="py-page">
      <section className="ag-hero">
        <p className="py-kicker" style={{ color: '#7c3aed' }}>
          VeeraAgents
        </p>
        <h1>Learn AI agents by watching them run</h1>
        <p>
          Agentic AI from first principles to production — tool calling, agents without frameworks, LangChain,
          LangGraph, memory and human-in-the-loop, Google ADK, multi-agent patterns, guardrails and evaluation. Every
          core idea has a diagram, an animated step-by-step simulation, real code and interview questions.
        </p>
        <div className="ag-hero-stats">
          <span>{track?.lessonCount ?? 0} lessons</span>
          <span>{learnModules.length} modules</span>
          <span>{AGENT_SIMS.length} animated simulations</span>
          <span>400+ interview questions</span>
          {doneCount ? <span>{doneCount} completed</span> : null}
        </div>
        <div className="ag-hero-cta">
          <Link className="ag-cta" to="/agents/learn/01">
            Start with module 01 →
          </Link>
          <Link className="ag-cta soft" to="/agents/visualizer">
            ▶ Agent Visualizer
          </Link>
          <Link className="ag-cta soft" to="/agents/interview">
            🎯 Interview prep
          </Link>
        </div>
      </section>

      <label className="py-search-wrap">
        <span className="py-kicker">Search</span>
        <input
          className="py-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search — ReAct, reducers, interrupt, ADK runner, MCP, guardrails…"
          aria-label="Search agent lessons"
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
                to={`/learn/agents/${lesson.id}`}
                className={completed.includes(lesson.id) ? 'py-browse-card done' : 'py-browse-card'}
              >
                <p className="py-kicker">{lesson.title.match(/^\d{2}\.\s*[^:]+/)?.[0] || 'Agents'}</p>
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
            <div className="ag-sim-head">
              <div>
                <h2>See an agent think — live</h2>
                <p className="py-muted">
                  Press play. The packet shows what moves where, the state panel shows memory changing, and the code
                  line that runs lights up.
                </p>
              </div>
              <Link className="ag-cta soft" to="/agents/visualizer">
                All {AGENT_SIMS.length} simulations →
              </Link>
            </div>
            <AgentSimPlayer sim={demo} />
          </section>

          <section className="py-section">
            <h2>
              Learning roadmap <span className="py-count">{learnModules.length}</span>
            </h2>
            <div className="ag-roadmap">
              {learnModules.map((mod) => {
                const info = AGENT_MODULE_INFO[mod.id]
                const done = mod.lessons.filter((l) => completed.includes(l.id)).length
                const pct = mod.lessons.length ? Math.round((done / mod.lessons.length) * 100) : 0
                const sims = AGENT_SIMS.filter((s) => s.module === mod.id).length
                return (
                  <Link
                    key={mod.id}
                    to={`/agents/learn/${mod.id}`}
                    className="ag-mod-card"
                    style={{ ['--mod' as string]: info?.color || '#7c3aed' }}
                  >
                    <span className="ag-mod-num">
                      {info?.icon} Module {mod.id}
                    </span>
                    <h3>{mod.name}</h3>
                    <p>{info?.blurb}</p>
                    <div className="ag-mod-meta">
                      <span>{mod.lessons.length} lessons</span>
                      {sims ? <span>{sims} simulations</span> : null}
                      {pct ? <span>{pct}% done</span> : null}
                    </div>
                    <div className="ag-mod-progress" aria-label={`${pct}% complete`}>
                      <i style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

          <section className="py-section">
            <h2>Practice paths</h2>
            <div className="py-phase-grid">
              {AGENT_PHASES.filter((p) => p.id !== 'learn').map((phase) => {
                const count = getModulesForPhase(phase.id).reduce((n, m) => n + m.lessons.length, 0)
                return (
                  <Link
                    key={phase.id}
                    to={`/agents/${phase.id}`}
                    className="py-phase-card"
                    style={{ ['--phase-accent' as string]: phase.accent }}
                  >
                    <p className="py-kicker">{count} topics</p>
                    <h2>{phase.title}</h2>
                    <p>{phase.blurb}</p>
                    <span className="py-phase-meta">{count} lessons</span>
                  </Link>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
