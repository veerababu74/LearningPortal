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
import { AGENTS_PATH_COURSE } from '@/content/paths/courses'
import { PathMap, PathProgressHero } from '@/pages/path/PathPages'
import '@/components/python/python.css'
import '@/components/agents/agents.css'
import { tidyTitle } from '@/content/titles'

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
  const agentsPath = AGENTS_PATH_COURSE.getPath()

  return (
    <div className="py-page">
      <PathProgressHero
        course={AGENTS_PATH_COURSE}
        heading="Learn AI agents by watching them run — in the right order"
        text={`A guided path of ${agentsPath.topics.length} topics in ${agentsPath.stages.length} stages: LLM foundations, the agent loop and tool calling, frameworks, memory and humans, Google ADK, multi-agent patterns and production safety. Every topic has a simulation, labs and interview questions.`}
        chips={[`${track?.lessonCount ?? 0} lessons`, `${agentsPath.topics.length} topics`, `${AGENT_SIMS.length} simulations`, `${doneCount} completed`]}
      />

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
            <div className="py-section-row">
              <h2>Your learning path</h2>
              <Link to="/agents/learn" className="py-btn soft">
                Browse by original module
              </Link>
            </div>
            <PathMap course={AGENTS_PATH_COURSE} />
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
