import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RAG_COURSE, RAG_LABS } from '@/content/rag/course'
import { RAG_PATH_COURSE } from '@/content/paths/courses'
import { cleanPreview, lessonTopic, modulesForPhase, searchCourse } from '@/content/courseKit'
import { getAnySim } from '@/content/sims/registry'
import { CourseModulePage, CoursePhasePage } from '@/pages/course/CoursePages'
import { InterviewHub } from '@/pages/path/InterviewHub'
import { PathMap, PathProgressHero, TopicPage } from '@/pages/path/PathPages'
import { AgentSimPlayer } from '@/components/agents/AgentSimPlayer'
import { useProgress } from '@/store/progress'
import { tidyTitle } from '@/content/titles'
import '@/components/python/python.css'
import '@/components/agents/agents.css'

export function RagHome() {
  const completed = useProgress((s) => s.completedLessonIds)
  const [q, setQ] = useState('')
  const hits = useMemo(() => searchCourse(RAG_COURSE, q).slice(0, 30), [q])
  const searching = q.trim().length > 0
  const demo = getAnySim(RAG_COURSE.demoSimId)
  const path = RAG_PATH_COURSE.getPath()
  const allCount = path.topics.reduce((n, t) => n + t.lessons.length, 0)
  const doneCount = useMemo(() => {
    const seen = new Set<string>()
    for (const t of path.topics) for (const l of t.lessons) if (completed.includes(l.id)) seen.add(l.id)
    return seen.size
  }, [path, completed])

  return (
    <div className="py-page">
      <PathProgressHero
        course={RAG_PATH_COURSE}
        heading="Build, evaluate and scale production RAG systems — step by step"
        text={`A guided path of ${path.topics.length} sub-modules in ${path.stages.length} stages: ingestion & chunking, embeddings & vector DBs, BM25 & hybrid reranking, Agentic RAG & MCP, GraphRAG, RAGAS evaluation gates, OpenTelemetry tracing & production security.`}
        chips={[`${allCount}+ core lessons`, `${path.topics.length} sub-modules`, `${RAG_COURSE.sims.length} simulations`, `${RAG_LABS.length} labs`, `${doneCount} completed`]}
      />

      <label className="py-search-wrap">
        <span className="py-kicker">Search</span>
        <input
          className="py-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={RAG_COURSE.searchPlaceholder}
          aria-label="Search VeeraRAG lessons"
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
                to={`/learn/veerarag/${lesson.id}`}
                className={completed.includes(lesson.id) ? 'py-browse-card done' : 'py-browse-card'}
              >
                <p className="py-kicker">{lesson.title.match(/^\d{2}\.\s*[^:]+/)?.[0] || 'VeeraRAG'}</p>
                <h3>{tidyTitle(cleanPreview(lessonTopic(lesson.title)))}</h3>
                <p>{cleanPreview(lesson.summary)}</p>
              </Link>
            ))}
            {!hits.length ? <p className="py-muted">No lessons match “{q.trim()}”.</p> : null}
          </div>
        </section>
      ) : (
        <>
          {demo ? (
            <section className="py-section">
              <div className="ag-sim-head">
                <div>
                  <h2>Watch a RAG request run</h2>
                  <p className="py-muted">Press play: follow the question through retrieval, reranking and generation, with live state and the code that runs.</p>
                </div>
                <Link className="ag-cta soft" to={RAG_COURSE.visualizerBase}>
                  All {RAG_COURSE.sims.length} simulations →
                </Link>
              </div>
              <AgentSimPlayer sim={demo} />
            </section>
          ) : null}

          <section className="py-section">
            <div className="py-section-row">
              <h2>Your guided RAG learning path (Stages & Sub-modules)</h2>
              <Link to="/rag/learn" className="py-btn soft">
                Browse by original module (01–11)
              </Link>
            </div>
            <PathMap course={RAG_PATH_COURSE} />
          </section>

          <section className="py-section">
            <h2>Hands-on RAG labs (Eval, Monitoring, Hybrid & Chunking)</h2>
            <div className="ag-sim-grid">
              {RAG_LABS.map((lab) => (
                <Link key={lab.to} to={lab.to} className="ag-sim-card">
                  <span style={{ fontSize: '1.5rem' }} aria-hidden>
                    {lab.icon}
                  </span>
                  <h3>{lab.title}</h3>
                  <p>{lab.text}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="py-section">
            <h2>Practice paths & interview drill</h2>
            <div className="py-phase-grid">
              {RAG_COURSE.phases
                .filter((p) => p.id !== 'learn')
                .map((phase) => {
                  const count = modulesForPhase(RAG_COURSE, phase.id).reduce((n, m) => n + m.lessons.length, 0)
                  const target = phase.id === 'interview' ? '/rag/interview' : `/rag/${phase.id}`
                  return (
                    <Link key={phase.id} to={target} className="py-phase-card" style={{ ['--phase-accent' as string]: phase.accent }}>
                      <p className="py-kicker">{count} topics</p>
                      <h2>{phase.title}</h2>
                      <p>{phase.blurb}</p>
                      <span className="py-phase-meta">{phase.id === 'interview' ? 'Interactive Q&A drill + 440+ answers' : `${count} lessons`}</span>
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

export function RagPhasePage() {
  return <CoursePhasePage cfg={RAG_COURSE} />
}

export function RagModulePage() {
  return <CourseModulePage cfg={RAG_COURSE} />
}

export function RagTopicPage() {
  return <TopicPage course={RAG_PATH_COURSE} />
}

export function RagInterviewHub() {
  return <InterviewHub course={RAG_PATH_COURSE} />
}
