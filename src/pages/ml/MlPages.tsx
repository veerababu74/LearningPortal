import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ML_COURSE, ML_LABS } from '@/content/ml/course'
import { ML_PATH_COURSE } from '@/content/paths/courses'
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

export function MlHome() {
  const completed = useProgress((s) => s.completedLessonIds)
  const [q, setQ] = useState('')
  const hits = useMemo(() => searchCourse(ML_COURSE, q).slice(0, 30), [q])
  const searching = q.trim().length > 0
  const demo = getAnySim(ML_COURSE.demoSimId)
  const path = ML_PATH_COURSE.getPath()
  const allCount = path.topics.reduce((n, t) => n + t.lessons.length, 0)
  const doneCount = useMemo(() => {
    const seen = new Set<string>()
    for (const t of path.topics) for (const l of t.lessons) if (completed.includes(l.id)) seen.add(l.id)
    return seen.size
  }, [path, completed])

  return (
    <div className="py-page">
      <PathProgressHero
        course={ML_PATH_COURSE}
        heading="Learn machine learning from the math up — and see every idea work"
        text={`A guided path of ${path.topics.length} sub-modules in ${path.stages.length} stages: the ML workflow and the math, data preparation, regression, classification and ensembles, clustering and PCA, evaluation and tuning, deep learning, NLP and LLMs, and MLOps — with real plots, flow diagrams, simulations and labs.`}
        chips={[`${allCount} lessons`, `${path.topics.length} sub-modules`, `${ML_COURSE.sims.length} simulations`, `${ML_LABS.length} labs`, `${doneCount} completed`]}
      />

      <label className="py-search-wrap">
        <span className="py-kicker">Search</span>
        <input
          className="py-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={ML_COURSE.searchPlaceholder}
          aria-label="Search VeeraML lessons"
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
                to={`/learn/veeraml/${lesson.id}`}
                className={completed.includes(lesson.id) ? 'py-browse-card done' : 'py-browse-card'}
              >
                <p className="py-kicker">{lesson.title.match(/^\d{2}\.\s*[^:]+/)?.[0] || 'VeeraML'}</p>
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
                  <h2>Watch gradient descent learn</h2>
                  <p className="py-muted">Press play: follow w and b downhill with the real numbers at every step, then see what a too-large learning rate does.</p>
                </div>
                <Link className="ag-cta soft" to={ML_COURSE.visualizerBase}>
                  All {ML_COURSE.sims.length} simulations →
                </Link>
              </div>
              <AgentSimPlayer sim={demo} />
            </section>
          ) : null}

          <section className="py-section">
            <div className="py-section-row">
              <h2>Your guided ML learning path</h2>
              <Link to="/ml/learn/01" className="py-btn soft">
                Browse by module (01–11)
              </Link>
            </div>
            <PathMap course={ML_PATH_COURSE} />
          </section>

          <section className="py-section">
            <h2>Hands-on ML labs</h2>
            <div className="ag-sim-grid">
              {ML_LABS.map((lab) => (
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
              {ML_COURSE.phases
                .filter((p) => p.id !== 'learn')
                .map((phase) => {
                  const count = modulesForPhase(ML_COURSE, phase.id).reduce((n, m) => n + m.lessons.length, 0)
                  const target = phase.id === 'interview' ? '/ml/interview' : `/ml/${phase.id}`
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

export function MlPhasePage() {
  return <CoursePhasePage cfg={ML_COURSE} />
}

export function MlModulePage() {
  return <CourseModulePage cfg={ML_COURSE} />
}

export function MlTopicPage() {
  return <TopicPage course={ML_PATH_COURSE} />
}

export function MlInterviewHub() {
  return <InterviewHub course={ML_PATH_COURSE} />
}
