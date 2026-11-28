import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SD_COURSE, SD_LABS } from '@/content/system/course'
import { SD_PATH_COURSE } from '@/content/paths/courses'
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

export function SystemHome() {
  const completed = useProgress((s) => s.completedLessonIds)
  const [q, setQ] = useState('')
  const hits = useMemo(() => searchCourse(SD_COURSE, q).slice(0, 30), [q])
  const searching = q.trim().length > 0
  const demo = getAnySim(SD_COURSE.demoSimId)
  const path = SD_PATH_COURSE.getPath()
  const allCount = path.topics.reduce((n, t) => n + t.lessons.length, 0)
  const doneCount = useMemo(() => {
    const seen = new Set<string>()
    for (const t of path.topics) for (const l of t.lessons) if (completed.includes(l.id)) seen.add(l.id)
    return seen.size
  }, [path, completed])

  return (
    <div className="py-page">
      <PathProgressHero
        course={SD_PATH_COURSE}
        heading="Learn system design from first principles — and watch every mechanism work"
        text={`A guided path of ${path.topics.length} sub-modules in ${path.stages.length} stages: requirements and trade-offs, networking and APIs, databases and caching, load balancing, distributed systems and messaging, microservices, security, observability and cloud — then scaling to millions, low-level design and full case studies.`}
        chips={[`${allCount} lessons`, `${path.topics.length} sub-modules`, `${SD_COURSE.sims.length} simulations`, `${SD_LABS.length} labs`, `${doneCount} completed`]}
      />

      <label className="py-search-wrap">
        <span className="py-kicker">Search</span>
        <input
          className="py-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={SD_COURSE.searchPlaceholder}
          aria-label="Search VeeraSystem lessons"
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
                to={`/learn/veerasys/${lesson.id}`}
                className={completed.includes(lesson.id) ? 'py-browse-card done' : 'py-browse-card'}
              >
                <p className="py-kicker">{lesson.title.match(/^\d{2}\.\s*[^:]+/)?.[0] || 'VeeraSystem'}</p>
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
                  <h2>Follow one request through the whole stack</h2>
                  <p className="py-muted">Press play: DNS, CDN, load balancer, app server, cache and database — with the latency each hop adds.</p>
                </div>
                <Link className="ag-cta soft" to={SD_COURSE.visualizerBase}>
                  All {SD_COURSE.sims.length} simulations →
                </Link>
              </div>
              <AgentSimPlayer sim={demo} />
            </section>
          ) : null}

          <section className="py-section">
            <div className="py-section-row">
              <h2>Your guided system design path</h2>
              <Link to="/system-design/learn/01" className="py-btn soft">
                Browse by module (01–15)
              </Link>
            </div>
            <PathMap course={SD_PATH_COURSE} />
          </section>

          <section className="py-section">
            <h2>Hands-on system design labs</h2>
            <div className="ag-sim-grid">
              {SD_LABS.map((lab) => (
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
            <h2>Practice, projects & interview</h2>
            <div className="py-phase-grid">
              {SD_COURSE.phases
                .filter((p) => p.id !== 'learn')
                .map((phase) => {
                  const count = modulesForPhase(SD_COURSE, phase.id).reduce((n, m) => n + m.lessons.length, 0)
                  const target = phase.id === 'interview' ? '/system-design/interview' : `/system-design/${phase.id}`
                  return (
                    <Link key={phase.id} to={target} className="py-phase-card" style={{ ['--phase-accent' as string]: phase.accent }}>
                      <p className="py-kicker">{count} lessons</p>
                      <h2>{phase.title}</h2>
                      <p>{phase.blurb}</p>
                      <span className="py-phase-meta">{phase.id === 'interview' ? 'Interactive Q&A drill' : `Open ${phase.title.toLowerCase()} →`}</span>
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

export function SystemPhasePage() {
  return <CoursePhasePage cfg={SD_COURSE} />
}

export function SystemModulePage() {
  return <CourseModulePage cfg={SD_COURSE} />
}

export function SystemTopicPage() {
  return <TopicPage course={SD_PATH_COURSE} />
}

export function SystemInterviewHub() {
  return <InterviewHub course={SD_PATH_COURSE} />
}
