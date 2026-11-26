import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PROJECT_COURSE, PROJECT_LABS } from '@/content/project/course'
import { PROJECT_PATH_COURSE } from '@/content/paths/courses'
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

export function ProjectHome() {
  const completed = useProgress((s) => s.completedLessonIds)
  const [q, setQ] = useState('')
  const hits = useMemo(() => searchCourse(PROJECT_COURSE, q).slice(0, 30), [q])
  const searching = q.trim().length > 0
  const demo = getAnySim(PROJECT_COURSE.demoSimId)
  const path = PROJECT_PATH_COURSE.getPath()
  const allCount = path.topics.reduce((n, t) => n + t.lessons.length, 0)
  const doneCount = useMemo(() => {
    const seen = new Set<string>()
    for (const t of path.topics) for (const l of t.lessons) if (completed.includes(l.id)) seen.add(l.id)
    return seen.size
  }, [path, completed])

  return (
    <div className="py-page">
      <PathProgressHero
        course={PROJECT_PATH_COURSE}
        heading="Master JavaScript, TypeScript, Playwright, REST APIs & FastAPI — end to end"
        text={`A guided path of ${path.topics.length} sub-modules across ${path.stages.length} stages: JS Event Loop & Closures, strict TypeScript + Zod, Playwright Python & TS, BDD, Agentic Browser MCP, Enterprise REST Security, SSE & Redis scaling, FastAPI ASGI, Pydantic V2 and the 8-phase Capstone.`}
        chips={[`${allCount}+ core lessons`, `${path.topics.length} sub-modules`, `${PROJECT_COURSE.sims.length} simulations`, `${PROJECT_LABS.length} labs`, `${doneCount} completed`]}
      />

      <label className="py-search-wrap">
        <span className="py-kicker">Search</span>
        <input
          className="py-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={PROJECT_COURSE.searchPlaceholder}
          aria-label="Search VeeraProject lessons"
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
                to={`/learn/veeraproject/${lesson.id}`}
                className={completed.includes(lesson.id) ? 'py-browse-card done' : 'py-browse-card'}
              >
                <p className="py-kicker">{lesson.title.match(/^\d{2}\.\s*[^:]+/)?.[0] || 'VeeraProject'}</p>
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
                  <h2>Watch the JavaScript Event Loop & Playwright run live</h2>
                  <p className="py-muted">
                    Step through Call Stack, Microtasks vs Macrotasks, Zod boundaries, Playwright auto-wait and FastAPI ASGI with highlighted code.
                  </p>
                </div>
                <Link className="ag-cta soft" to={PROJECT_COURSE.visualizerBase}>
                  All {PROJECT_COURSE.sims.length} simulations →
                </Link>
              </div>
              <AgentSimPlayer sim={demo} />
            </section>
          ) : null}

          <section className="py-section">
            <div className="py-section-row">
              <h2>Your guided learning path (Stages & Sub-modules)</h2>
              <Link to="/project/learn" className="py-btn soft">
                Browse by original module (01–12)
              </Link>
            </div>
            <PathMap course={PROJECT_PATH_COURSE} />
          </section>

          <section className="py-section">
            <h2>Hands-on interactive labs</h2>
            <div className="ag-sim-grid">
              {PROJECT_LABS.map((lab) => (
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
            <h2>Practice, projects & interview banks</h2>
            <div className="py-phase-grid">
              {PROJECT_COURSE.phases
                .filter((p) => p.id !== 'learn')
                .map((phase) => {
                  const count = modulesForPhase(PROJECT_COURSE, phase.id).reduce((n, m) => n + m.lessons.length, 0)
                  const target = phase.id === 'interview' ? '/project/interview' : `/project/${phase.id}`
                  return (
                    <Link key={phase.id} to={target} className="py-phase-card" style={{ ['--phase-accent' as string]: phase.accent }}>
                      <p className="py-kicker">{count} sets</p>
                      <h2>{phase.title}</h2>
                      <p>{phase.blurb}</p>
                      <span className="py-phase-meta">{phase.id === 'interview' ? 'Interactive Q&A drill + 600+ answers' : `${count} lessons`}</span>
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

export function ProjectPhasePage() {
  return <CoursePhasePage cfg={PROJECT_COURSE} />
}

export function ProjectModulePage() {
  return <CourseModulePage cfg={PROJECT_COURSE} />
}

export function ProjectTopicPage() {
  return <TopicPage course={PROJECT_PATH_COURSE} />
}

export function ProjectInterviewHub() {
  return <InterviewHub course={PROJECT_PATH_COURSE} />
}
