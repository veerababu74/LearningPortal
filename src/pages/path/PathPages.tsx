import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getCurriculumIndex } from '@/content/loadCurriculum'
import {
  classifyQuestions,
  loadInterviewMap,
  nextLesson,
  topicProgress,
  type ResolvedPath,
  type TopicQuestions,
} from '@/content/paths/engine'
import { getAnySim, simHref } from '@/content/sims/registry'
import { useProgress } from '@/store/progress'
import '@/components/python/python.css'
import '@/pages/python/python-path.css'
import { tidyTitle } from '@/content/titles'

export type PathCourse = {
  /** curriculum track id, e.g. "python" */
  track: string
  /** course home, e.g. "/python" */
  base: string
  title: string
  getPath: () => ResolvedPath
  /** module ids (title prefixes) of exercise / project / interview lessons, for "check yourself" */
  companions: Record<string, string>
}

const lessonHref = (c: PathCourse, id: string) => `/learn/${c.track}/${id}`
const GENERIC_SERIES = /^(Core Guides|Topic Workshops|Deep-Dive Notes|Interview Rebuild Plan|Advanced Python Topics|Reference Scripts|Interview Banks)$/

/** Interview questions grouped by topic for one course (loaded lazily). */
export function useTopicQuestions(course: PathCourse) {
  const [groups, setGroups] = useState<TopicQuestions[] | null>(null)
  useEffect(() => {
    let alive = true
    loadInterviewMap().then((map) => {
      if (alive) setGroups(classifyQuestions(course.getPath(), map, course.track))
    })
    return () => {
      alive = false
    }
  }, [course])
  return groups
}

/* ------------------------------------------------------------------ stage map */

export function PathMap({ course }: { course: PathCourse }) {
  const completed = useProgress((s) => s.completedLessonIds)
  const path = course.getPath()
  const here = nextLesson(path, completed)?.topic.id

  return (
    <div className="pp-stages" id="path">
      {path.stages.map((st) => {
        const prog = st.topics.map((t) => topicProgress(t, completed))
        const done = prog.reduce((n, p) => n + p.done, 0)
        const total = prog.reduce((n, p) => n + p.total, 0)
        const pct = total ? Math.round((done / total) * 100) : 0
        return (
          <section key={st.id} className="pp-stage" style={{ ['--stage' as string]: st.color }} aria-labelledby={`stage-${st.id}`}>
            <div className="pp-stage-head">
              <h3 id={`stage-${st.id}`}>{st.title}</h3>
              <span className="pp-level">
                {st.level} · {st.topics.length} topics
              </span>
            </div>
            <p>{st.blurb}</p>
            <div className="pp-bar" aria-label={`${pct}% of ${st.title} complete`}>
              <i style={{ width: `${pct}%` }} />
            </div>
            <div className="pp-topics">
              {st.topics.map((t, i) => {
                const p = prog[i]
                const cls = t.id === here ? 'pp-topic here' : p.pct === 100 ? 'pp-topic done' : 'pp-topic'
                return (
                  <Link key={t.id} to={`${course.base}/path/${t.id}`} className={cls}>
                    <span className="pp-node" style={{ ['--p' as string]: p.pct }} aria-hidden>
                      <span>{p.pct === 100 ? '✓' : t.icon}</span>
                    </span>
                    <span>
                      <strong>
                        {t.number}. {t.title}
                        {t.id === here ? <span className="pp-here-tag">you are here</span> : null}
                      </strong>
                      <small>
                        {p.done}/{p.total} core lessons{t.sims?.length ? ' · ▶ simulation' : ''}
                      </small>
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/** Big "start / continue" call to action with an overall progress ring. */
export function PathProgressHero({ course, heading, text, chips }: { course: PathCourse; heading: string; text: string; chips: string[] }) {
  const completed = useProgress((s) => s.completedLessonIds)
  const path = course.getPath()
  const prog = path.topics.map((t) => topicProgress(t, completed))
  const done = prog.reduce((n, p) => n + p.done, 0)
  const all = prog.reduce((n, p) => n + p.total, 0)
  const pct = all ? Math.round((done / all) * 100) : 0
  const next = nextLesson(path, completed)
  return (
    <section className="pp-hero">
      <div>
        <p className="py-kicker">{course.title}</p>
        <h1>{heading}</h1>
        <p>{text}</p>
        <div className="pp-chips">
          {chips.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <div className="pp-row-cta">
          {next ? (
            <Link className="pp-cta" to={lessonHref(course, next.lesson.id)}>
              {done ? 'Continue' : 'Start learning'} →{' '}
              <small>
                {next.topic.title}: {tidyTitle(next.lesson.title)}
              </small>
            </Link>
          ) : (
            <Link className="pp-cta" to={`${course.base}/interview`}>
              Path complete — practise interviews →
            </Link>
          )}
          <Link className="pp-cta soft" to={`${course.base}/interview`}>
            🎯 Interview prep
          </Link>
        </div>
      </div>
      <div className="pp-ring" style={{ ['--p' as string]: pct }} role="img" aria-label={`${pct}% of the core path complete`}>
        <div>
          <span>
            <strong>{pct}%</strong>
            <br />
            <small>
              {done}/{all} core
            </small>
          </span>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ topic page */

export function TopicPage({ course }: { course: PathCourse }) {
  const { topicId = '' } = useParams()
  const completed = useProgress((s) => s.completedLessonIds)
  const groups = useTopicQuestions(course)
  const path = course.getPath()
  const topic = path.topics.find((t) => t.id === topicId)
  if (!topic) return <Navigate to={course.base} replace />

  const stage = path.stages.find((s) => s.id === topic.stageId)!
  const idx = path.topics.findIndex((t) => t.id === topic.id)
  const prev = path.topics[idx - 1]
  const next = path.topics[idx + 1]
  const core = topic.lessons.filter((l) => l.role === 'core')
  const practice = topic.lessons.filter((l) => l.role === 'practice')
  const deeper = topic.lessons.filter((l) => l.role === 'deeper')
  const prog = topicProgress(topic, completed)
  const nextCore = core.find((l) => !completed.includes(l.id))
  const startId = (nextCore || core[0] || topic.lessons[0])?.id
  const questions = groups?.find((g) => g.topic?.id === topic.id)?.questions || []

  const seriesSet = new Set(topic.lessons.map((l) => l.series).filter((s): s is string => !!s && !GENERIC_SERIES.test(s)))
  const companions = (getCurriculumIndex().lessonsByTrack[course.track as keyof ReturnType<typeof getCurriculumIndex>['lessonsByTrack']] || [])
    .filter((l) => course.companions[l.title.slice(0, 2)] && course.companions[l.title.slice(0, 2)] !== 'Interview' && l.series && seriesSet.has(l.series))
    .slice(0, 8)
  const sims = (topic.sims || []).map((id) => getAnySim(id)).filter((s): s is NonNullable<typeof s> => Boolean(s))

  return (
    <div className="py-page" style={{ ['--stage' as string]: stage.color }}>
      <nav className="py-crumbs" aria-label="Breadcrumb">
        <Link to={course.base}>{course.title}</Link>
        <span>/</span>
        <Link to={course.base}>{stage.title}</Link>
        <span>/</span>
        <span>{topic.title}</span>
      </nav>

      <header className="pp-topic-hero">
        <p className="py-kicker" style={{ color: stage.color }}>
          {topic.icon} Topic {topic.number} of {path.topics.length} · {stage.title}
        </p>
        <h1>{topic.title}</h1>
        <p>{topic.blurb}</p>
        <div className="pp-meta-row">
          <div className="pp-bar" aria-label={`${prog.pct}% complete`}>
            <i style={{ width: `${prog.pct}%` }} />
          </div>
          <span className="py-muted" style={{ fontWeight: 700 }}>
            {prog.done}/{prog.total} core lessons done
          </span>
          {startId ? (
            <Link className="pp-cta" to={lessonHref(course, startId)}>
              {prog.done === 0 ? 'Start topic →' : prog.pct === 100 ? 'Review topic →' : 'Continue →'}
            </Link>
          ) : null}
        </div>
      </header>

      {sims.length || topic.labs?.length ? (
        <section className="py-section">
          <h2>Watch it, then try it</h2>
          <div className="pp-watch">
            {sims.map((s) => (
              <Link key={s.id} to={simHref(s)}>
                <span aria-hidden>▶</span> {s.title}
              </Link>
            ))}
            {(topic.labs || []).map((l) => (
              <Link key={l.to} to={l.to} className="lab">
                <span aria-hidden>🧪</span> {l.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="py-section">
        <h2>
          Learn in this order <span className="py-count">{core.length}</span>
        </h2>
        <ol className="pp-steps">
          {core.map((l, i) => {
            const done = completed.includes(l.id)
            const isNext = !done && l.id === nextCore?.id
            return (
              <li key={l.id}>
                <Link to={lessonHref(course, l.id)} className={`pp-step${done ? ' done' : isNext ? ' next' : ''}`}>
                  <span className="pp-step-n">{done ? '✓' : i + 1}</span>
                  <span>
                    <strong>{tidyTitle(l.title)}</strong>
                    <small>{l.summary.replace(/[#*`>|]/g, ' ')}</small>
                  </span>
                  <span className="pp-step-state">{done ? 'Done' : isNext ? 'Up next' : ''}</span>
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      {practice.length ? (
        <details className="pp-more" open>
          <summary>
            Practice with runnable examples <span className="py-count">{practice.length}</span>
          </summary>
          <div className="pp-mini-list">
            {practice.map((l) => (
              <Link key={l.id} to={lessonHref(course, l.id)} className={completed.includes(l.id) ? 'pp-mini done' : 'pp-mini'}>
                <span>{tidyTitle(l.title)}</span>
                <small>{completed.includes(l.id) ? '✓ done' : 'practice'}</small>
              </Link>
            ))}
          </div>
        </details>
      ) : null}

      <details className="pp-more" open style={{ marginTop: '0.8rem' }}>
        <summary>
          Check yourself: interview questions {groups ? <span className="py-count">{questions.length}</span> : null}
        </summary>
        <div className="pp-mini-list">
          {!groups ? <p className="py-muted">Loading questions…</p> : null}
          {groups && !questions.length ? <p className="py-muted">No interview questions are tagged to this topic yet.</p> : null}
          {questions.slice(0, 6).map((q, i) => (
            <Link key={i} to={`${lessonHref(course, q.lessonId)}#${q.sectionId}`} className="pp-mini">
              <span>{q.text}</span>
              <small>answer →</small>
            </Link>
          ))}
          {questions.length ? (
            <div className="pp-row-cta">
              <Link className="pp-cta" to={`${course.base}/interview?topic=${topic.id}&mode=drill`}>
                🎯 Drill all {questions.length} questions
              </Link>
              <Link className="pp-cta soft" to={`${course.base}/interview?topic=${topic.id}`}>
                Browse them
              </Link>
            </div>
          ) : null}
          {companions.map((l) => (
            <Link key={l.id} to={lessonHref(course, l.id)} className={completed.includes(l.id) ? 'pp-mini done' : 'pp-mini'}>
              <span>{l.title.replace(/^\d{2}\.\s*[^:]+:\s*/, '')}</span>
              <small>{course.companions[l.title.slice(0, 2)]}</small>
            </Link>
          ))}
        </div>
      </details>

      {deeper.length ? (
        <details className="pp-more" style={{ marginTop: '0.8rem' }}>
          <summary>
            Go deeper: deep dives & alternative explanations <span className="py-count">{deeper.length}</span>
          </summary>
          <div className="pp-mini-list">
            {deeper.map((l) => (
              <Link key={l.id} to={lessonHref(course, l.id)} className={completed.includes(l.id) ? 'pp-mini done' : 'pp-mini'}>
                <span>{tidyTitle(l.title)}</span>
                <small>{l.series}</small>
              </Link>
            ))}
          </div>
        </details>
      ) : null}

      <nav className="pp-nav py-section" aria-label="Topic navigation">
        {prev ? (
          <Link to={`${course.base}/path/${prev.id}`}>
            <small>← Previous topic</small>
            {prev.icon} {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`${course.base}/path/${next.id}`}>
            <small>Next topic →</small>
            {next.icon} {next.title}
          </Link>
        ) : null}
      </nav>
    </div>
  )
}
