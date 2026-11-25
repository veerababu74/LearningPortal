import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Pager, usePaged } from '@/components/common/Pager'
import { getCurriculumIndex } from '@/content/loadCurriculum'
import type { TrackId } from '@/types/curriculum'
import { useProgress } from '@/store/progress'
import { simHref, simsForTrack } from '@/content/sims/registry'
import './Tracks.css'
import '@/components/agents/agents.css'

function cleanPreview(text: string) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/`+/g, '')
    .replace(/[#*_>|]/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function moduleFromTitle(title: string) {
  const m = title.match(/^(\d{2})\.\s*([^:]+):/)
  if (m) return { id: m[1], name: m[2].trim() }
  return { id: '99', name: 'More' }
}

const PYTHON_PHASES: { id: string; title: string; blurb: string; moduleIds: string[] }[] = [
  {
    id: 'learn',
    title: '1 · Learn',
    blurb: 'Concept modules — diagrams, code, and scenarios first.',
    moduleIds: ['01', '02', '03', '04', '05', '06', '07', '08', '09'],
  },
  {
    id: 'exercises',
    title: '2 · Exercises',
    blurb: 'Per-concept drills. Write code, then check edge cases.',
    moduleIds: ['10'],
  },
  {
    id: 'projects',
    title: '3 · Projects',
    blurb: 'Mini-projects and challenges that apply each concept end-to-end.',
    moduleIds: ['11'],
  },
  {
    id: 'interview',
    title: '4 · Interview',
    blurb: 'Per-concept conceptual + scenario Q&A with model answers (C-S-E-T).',
    moduleIds: ['12'],
  },
]

export function TrackOverview() {
  const { trackId = '' } = useParams()
  const index = getCurriculumIndex()
  const track = index.tracks.find((t) => t.id === trackId)
  const lessons = index.lessonsByTrack[trackId as TrackId] || []
  const completed = useProgress((s) => s.completedLessonIds)
  const [filter, setFilter] = useState('')
  const filtered = useMemo(() => {
    const words = filter.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return lessons
    return lessons.filter((l) => words.every((w) => `${l.title} ${l.summary}`.toLowerCase().includes(w)))
  }, [lessons, filter])
  const paged = usePaged(filtered, 20, `${trackId}|${filter}`)

  if (!track) {
    return (
      <div className="track-page">
        <h1>Track not found</h1>
        <Link to="/tracks">Back to tracks</Link>
      </div>
    )
  }

  const isPython = trackId === 'python'
  const doneCount = lessons.filter((l) => completed.includes(l.id)).length
  const nextUp = lessons.find((l) => !completed.includes(l.id))
  const groups = new Map<string, { id: string; name: string; items: typeof lessons }>()
  if (isPython) {
    for (const lesson of lessons) {
      const mod = moduleFromTitle(lesson.title)
      const key = `${mod.id}. ${mod.name}`
      if (!groups.has(key)) groups.set(key, { id: mod.id, name: mod.name, items: [] })
      groups.get(key)!.items.push(lesson)
    }
  }

  const orderedGroups = [...groups.entries()].sort((a, b) => a[1].id.localeCompare(b[1].id))

  return (
    <div className="track-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/tracks">Generative AI</Link>
        <span>/</span>
        <span>{track.title}</span>
      </nav>
      <header className="page-head">
        <p className="tagline" style={{ color: track.accent }}>
          {track.tagline}
        </p>
        <h1>{track.title}</h1>
        <p>{track.description}</p>
        {!isPython && lessons.length ? (
          <div className="track-progress-row">
            <div className="track-progress" aria-label={`${doneCount} of ${lessons.length} lessons complete`}>
              <i style={{ width: `${Math.round((doneCount / lessons.length) * 100)}%`, background: track.accent }} />
            </div>
            <span>
              {doneCount}/{lessons.length} done
            </span>
            <Link className="btn solid" to={`/learn/${trackId}/${(nextUp || lessons[0]).id}`}>
              {doneCount ? 'Continue →' : 'Start track →'}
            </Link>
          </div>
        ) : null}
        {isPython ? (
          <p className="coverage-note">
            {lessons.length} lessons · path: Learn → Exercises → Projects → Interview
          </p>
        ) : null}
      </header>

      {simsForTrack(track.id).length ? (
        <section className="track-sims">
          <h2>Watch it run · animated simulations</h2>
          <p className="coverage-note">
            Step-by-step animations with live state, highlighted code and predict-the-next-step questions. They also
            appear inside the matching lessons.
          </p>
          <div className="ag-sim-grid">
            {simsForTrack(track.id).map((s) => (
              <Link key={s.id} to={simHref(s)} className="ag-sim-card">
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
      ) : null}

      {isPython ? (
        <>
          <nav className="python-path" aria-label="Python learning path">
            {PYTHON_PHASES.map((phase) => {
              const count = orderedGroups
                .filter(([, g]) => phase.moduleIds.includes(g.id))
                .reduce((n, [, g]) => n + g.items.length, 0)
              return (
                <a key={phase.id} href={`#phase-${phase.id}`} className="python-path-step">
                  <strong>{phase.title}</strong>
                  <span>{count} lessons</span>
                </a>
              )
            })}
          </nav>

          {PYTHON_PHASES.map((phase) => {
            const phaseGroups = orderedGroups.filter(([, g]) => phase.moduleIds.includes(g.id))
            if (!phaseGroups.length) return null
            return (
              <div key={phase.id} id={`phase-${phase.id}`} className="python-phase">
                <header className="python-phase-head">
                  <h2>{phase.title}</h2>
                  <p>{phase.blurb}</p>
                </header>
                {phaseGroups.map(([group, meta]) => (
                  <section key={group} className="module-block">
                    <h3 className="module-heading">
                      {meta.id}. {meta.name}
                      <span className="module-count">{meta.items.length}</span>
                    </h3>
                    <div className="lesson-grid">
                      {meta.items.map((lesson, i) => (
                        <Link
                          key={lesson.id}
                          to={`/learn/${trackId}/${lesson.id}`}
                          className={
                            completed.includes(lesson.id) ? 'lesson-link done' : 'lesson-link'
                          }
                        >
                          <span className="num">{String(i + 1).padStart(2, '0')}</span>
                          <div>
                            <h3>
                              {cleanPreview(lesson.title.replace(/^\d{2}\.\s*[^:]+:\s*/, ''))}
                            </h3>
                            <p>{cleanPreview(lesson.summary)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )
          })}
        </>
      ) : (
        <section id="track-lessons">
          <div className="track-list-head">
            <h2>Lessons</h2>
            <input
              className="search-input track-filter"
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={`Filter ${lessons.length} lessons…`}
              aria-label={`Filter ${track.title} lessons`}
            />
          </div>
          <Pager {...paged} onChange={paged.setPage} label="lessons" scrollTo="track-lessons" />
        <div className="lesson-grid">
          {paged.slice.map((lesson) => (
            <Link
              key={lesson.id}
              to={`/learn/${trackId}/${lesson.id}`}
              className={completed.includes(lesson.id) ? 'lesson-link done' : 'lesson-link'}
            >
              <span className="num">{String(lesson.order).padStart(2, '0')}</span>
              <div>
                <h3>{cleanPreview(lesson.title)}</h3>
                <p>{cleanPreview(lesson.summary)}</p>
              </div>
            </Link>
          ))}
          {!filtered.length ? <p className="search-empty">No lessons match “{filter.trim()}”.</p> : null}
        </div>
          <Pager {...paged} onChange={paged.setPage} label="lessons" scrollTo="track-lessons" />
        </section>
      )}
    </div>
  )
}
