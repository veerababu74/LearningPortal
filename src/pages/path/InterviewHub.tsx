import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { loadLesson } from '@/content/loadCurriculum'
import type { Question } from '@/content/paths/engine'
import type { TrackId } from '@/types/curriculum'
import { MarkdownBody } from '@/components/lesson/MarkdownBody'
import { useTopicQuestions, type PathCourse } from './PathPages'
import '@/components/python/python.css'
import '@/pages/python/python-path.css'
import './interview.css'

const qKey = (q: Question) => `${q.lessonId}|${q.sectionId}|${q.text.slice(0, 60)}`

/** Questions the learner marked as known — kept in this browser only. */
function useKnown(track: string) {
  const storageKey = `interview-known:${track}`
  const [known, setKnown] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'))
    } catch {
      return new Set()
    }
  })
  const toggle = useCallback(
    (key: string, value?: boolean) =>
      setKnown((prev) => {
        const next = new Set(prev)
        const on = value ?? !next.has(key)
        if (on) next.add(key)
        else next.delete(key)
        try {
          localStorage.setItem(storageKey, JSON.stringify([...next]))
        } catch {
          /* storage unavailable: keep in memory */
        }
        return next
      }),
    [storageKey],
  )
  return { known, toggle }
}

const GENERIC_Q = /^#{2,6}\s+(\d+\.\s*)?(conceptual |scenario[- ]based |the )?(question|scenario|q)(\s*#?\d+)?\s*:?\s*$/i

/** Cut one question's answer out of a lesson section. */
function extractAnswer(body: string, heading: string | null) {
  if (!heading) return body.slice(0, 14000)
  const lines = body.split('\n')
  const i = lines.findIndex((l) => l.trim() === heading.trim())
  if (i < 0) return body.slice(0, 14000)
  const level = (heading.match(/^#+/) || ['##'])[0].length
  const genericStart = GENERIC_Q.test(heading.trim())
  let j = i + 1
  let inFence = false
  for (; j < lines.length; j++) {
    if (/^\s*(```|~~~)/.test(lines[j])) inFence = !inFence
    if (inFence) continue
    const m = lines[j].match(/^(#+)\s/)
    if (!m) continue
    if (m[1].length < level) break
    if (m[1].length === level && (!genericStart || GENERIC_Q.test(lines[j].trim()))) break
  }
  return lines.slice(i, j).join('\n').slice(0, 14000)
}

function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function InterviewHub({ course }: { course: PathCourse }) {
  const groups = useTopicQuestions(course)
  const [params, setParams] = useSearchParams()
  const topicId = params.get('topic') || 'all'
  const mode = params.get('mode') === 'drill' ? 'drill' : 'browse'
  const { known, toggle } = useKnown(course.track)
  const path = course.getPath()

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }

  const all = useMemo(() => (groups || []).flatMap((g) => g.questions.map((q) => ({ q, topicId: g.topic?.id || 'general' }))), [groups])
  const selected = useMemo(() => all.filter((x) => topicId === 'all' || x.topicId === topicId), [all, topicId])
  const knownCount = selected.filter((x) => known.has(qKey(x.q))).length
  const titleOf = (id: string) => (id === 'general' ? 'General & system design' : path.topics.find((t) => t.id === id)?.title || id)

  return (
    <div className="py-page">
      <nav className="py-crumbs" aria-label="Breadcrumb">
        <Link to={course.base}>{course.title}</Link>
        <span>/</span>
        <span>Interview prep</span>
      </nav>

      <section className="pp-hero" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
        <div>
          <p className="py-kicker">{course.title} · Interview prep</p>
          <h1>Interview questions, in learning order</h1>
          <p>
            Every question from the interview banks, grouped under the same topics as the learning path. Browse a topic,
            or drill: answer out loud first, then reveal the model answer and mark whether you knew it.
          </p>
          <div className="pp-chips">
            <span>{groups ? all.length : '…'} questions</span>
            <span>{path.topics.length} topics</span>
            <span>
              {known.size} marked known
            </span>
          </div>
          <div className="iv-tabs" role="tablist" aria-label="Mode">
            <button type="button" role="tab" aria-selected={mode === 'browse'} className={mode === 'browse' ? 'on' : ''} onClick={() => setParam('mode', null)}>
              📚 Browse by topic
            </button>
            <button type="button" role="tab" aria-selected={mode === 'drill'} className={mode === 'drill' ? 'on' : ''} onClick={() => setParam('mode', 'drill')}>
              🎯 Drill mode
            </button>
            <label className="iv-select">
              <span>Topic</span>
              <select value={topicId} onChange={(e) => setParam('topic', e.target.value === 'all' ? null : e.target.value)}>
                <option value="all">All topics</option>
                {path.stages.map((st) => (
                  <optgroup key={st.id} label={st.title}>
                    {st.topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.number}. {t.title} ({groups?.find((g) => g.topic?.id === t.id)?.questions.length ?? 0})
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value="general">General & system design ({groups?.find((g) => !g.topic)?.questions.length ?? 0})</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      {!groups ? (
        <div className="page-loading">
          <span className="spinner" aria-hidden />
          Loading questions…
        </div>
      ) : mode === 'drill' ? (
        <Drill course={course} items={selected} known={known} toggle={toggle} titleOf={titleOf} knownCount={knownCount} />
      ) : (
        <Browse course={course} groups={groups} topicId={topicId} known={known} toggle={toggle} setParam={setParam} />
      )}
    </div>
  )
}

function Browse({
  course,
  groups,
  topicId,
  known,
  toggle,
  setParam,
}: {
  course: PathCourse
  groups: NonNullable<ReturnType<typeof useTopicQuestions>>
  topicId: string
  known: Set<string>
  toggle: (k: string, v?: boolean) => void
  setParam: (k: string, v: string | null) => void
}) {
  const path = course.getPath()
  const [limits, setLimits] = useState<Record<string, number>>({})
  const block = (id: string, title: string, icon: string, qs: Question[]) => {
    if (!qs.length) return null
    const limit = limits[id] || 8
    const done = qs.filter((q) => known.has(qKey(q))).length
    return (
      <details key={id} className="pp-more iv-topic" open={topicId === id}>
        <summary>
          <span>
            {icon} {title}
          </span>
          <span className="iv-count">
            {done ? `${done}/` : ''}
            {qs.length}
          </span>
        </summary>
        <div className="pp-row-cta" style={{ margin: '0.2rem 0 0.6rem' }}>
          <button
            type="button"
            className="pp-cta"
            onClick={() => {
              setParam('topic', id)
              setParam('mode', 'drill')
            }}
          >
            🎯 Drill these {qs.length}
          </button>
        </div>
        <ol className="iv-list">
          {qs.slice(0, limit).map((q, i) => {
            const k = qKey(q)
            return (
              <li key={k + i} className={known.has(k) ? 'known' : ''}>
                <button type="button" className="iv-check" aria-pressed={known.has(k)} aria-label={known.has(k) ? 'Mark as not known' : 'Mark as known'} onClick={() => toggle(k)}>
                  {known.has(k) ? '✓' : ''}
                </button>
                <Link to={`/learn/${course.track}/${q.lessonId}#${q.sectionId}`}>{q.text}</Link>
                <small>{q.lessonTitle}</small>
              </li>
            )
          })}
        </ol>
        {qs.length > limit ? (
          <div className="show-more">
            <button type="button" onClick={() => setLimits((l) => ({ ...l, [id]: limit + 20 }))}>
              Show {Math.min(20, qs.length - limit)} more ({qs.length - limit} left)
            </button>
          </div>
        ) : null}
      </details>
    )
  }

  return (
    <div className="iv-browse">
      {path.stages.map((st) => {
        const blocks = st.topics
          .filter((t) => topicId === 'all' || topicId === t.id)
          .map((t) => block(t.id, `${t.number}. ${t.title}`, t.icon, groups.find((g) => g.topic?.id === t.id)?.questions || []))
          .filter(Boolean)
        if (!blocks.length) return null
        return (
          <section key={st.id} className="iv-stage" style={{ ['--stage' as string]: st.color }}>
            <h2>{st.title}</h2>
            {blocks}
          </section>
        )
      })}
      {topicId === 'all' || topicId === 'general' ? (
        <section className="iv-stage" style={{ ['--stage' as string]: '#475569' }}>
          <h2>General</h2>
          {block('general', 'General & system design', '🧭', groups.find((g) => !g.topic)?.questions || [])}
        </section>
      ) : null}
    </div>
  )
}

function Drill({
  course,
  items,
  known,
  toggle,
  titleOf,
  knownCount,
}: {
  course: PathCourse
  items: { q: Question; topicId: string }[]
  known: Set<string>
  toggle: (k: string, v?: boolean) => void
  titleOf: (id: string) => string
  knownCount: number
}) {
  const [skipKnown, setSkipKnown] = useState(true)
  const [deck, setDeck] = useState<typeof items>([])
  const [pos, setPos] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // build a shuffled deck whenever the topic selection changes
  useEffect(() => {
    const pool = items.filter((x) => !skipKnown || !known.has(qKey(x.q)))
    setDeck(shuffle(pool.length ? pool : items))
    setPos(0)
    setAnswer(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, skipKnown])

  const cur = deck[pos]
  const go = (p: number) => {
    setPos(Math.max(0, Math.min(deck.length - 1, p)))
    setAnswer(null)
  }

  const reveal = async () => {
    if (!cur) return
    setLoading(true)
    try {
      const lesson = await loadLesson(course.track as TrackId, cur.q.lessonId)
      const sec = lesson?.sections.find((s) => s.id === cur.q.sectionId)
      setAnswer(sec ? extractAnswer(sec.body, cur.q.heading) : 'Answer not found — open the full lesson.')
    } finally {
      setLoading(false)
    }
  }

  if (!items.length) return <p className="py-muted">No questions for this topic yet.</p>
  if (!cur) return null
  const k = qKey(cur.q)
  const isKnown = known.has(k)
  const pct = Math.round((knownCount / items.length) * 100)

  return (
    <section className="iv-drill">
      <div className="iv-drill-top">
        <span>
          Card {pos + 1} / {deck.length}
        </span>
        <div className="pp-bar" style={{ flex: '1 1 160px', margin: 0 }} aria-label={`${pct}% known`}>
          <i style={{ width: `${pct}%`, background: 'var(--growth)' }} />
        </div>
        <span>
          {knownCount}/{items.length} known
        </span>
        <label className="iv-skip">
          <input type="checkbox" checked={skipKnown} onChange={(e) => setSkipKnown(e.target.checked)} /> Skip known
        </label>
      </div>

      <article className={`iv-card${isKnown ? ' known' : ''}`}>
        <p className="py-kicker">
          {titleOf(cur.topicId)} · {cur.q.lessonTitle}
        </p>
        <h2>{cur.q.text}</h2>
        {!answer ? (
          <div className="pp-row-cta">
            <button type="button" className="pp-cta" onClick={reveal} disabled={loading}>
              {loading ? 'Loading…' : 'Reveal answer'}
            </button>
            <span className="py-muted">Say your answer out loud first: concept → example → trade-off.</span>
          </div>
        ) : (
          <div className="iv-answer">
            <MarkdownBody content={answer} />
          </div>
        )}
        <div className="iv-actions">
          <button type="button" className="iv-btn" onClick={() => go(pos - 1)} disabled={pos === 0}>
            ← Previous
          </button>
          <button
            type="button"
            className="iv-btn review"
            onClick={() => {
              toggle(k, false)
              setDeck((d) => [...d.slice(0, pos), ...d.slice(pos + 1), d[pos]])
              setAnswer(null)
            }}
          >
            ↻ Review again later
          </button>
          <button
            type="button"
            className="iv-btn knew"
            onClick={() => {
              toggle(k, true)
              go(pos + 1)
            }}
          >
            ✓ Knew it
          </button>
          <button type="button" className="iv-btn" onClick={() => go(pos + 1)} disabled={pos >= deck.length - 1}>
            Next →
          </button>
        </div>
        <Link className="iv-open" to={`/learn/${course.track}/${cur.q.lessonId}#${cur.q.sectionId}`}>
          Open the full lesson →
        </Link>
      </article>
    </section>
  )
}
