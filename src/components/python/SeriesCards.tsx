import { useState } from 'react'
import { Link } from 'react-router-dom'
import '@/components/common/Pager.css'

const PAGE = 9

export type SeriesLessonRef = {
  id: string
  title: string
  summary: string
  series?: string
}

type Props = {
  lessons: SeriesLessonRef[]
  /** Route prefix for a lesson, e.g. "/learn/python". */
  hrefBase: string
  completed: string[]
  topicOf: (title: string) => string
  preview: (text: string) => string
  /** Show a "jump to series" bar when there are at least this many series. */
  jumpAt?: number
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Lesson cards grouped by the course / guide they come from, in learning order. */
export function SeriesCards({ lessons, hrefBase, completed, topicOf, preview, jumpAt = 3 }: Props) {
  const groups: Array<{ series: string; lessons: SeriesLessonRef[] }> = []
  const index = new Map<string, number>()
  for (const lesson of lessons) {
    const series = lesson.series || 'Lessons'
    if (!index.has(series)) {
      index.set(series, groups.length)
      groups.push({ series, lessons: [] })
    }
    groups[index.get(series)!].lessons.push(lesson)
  }

  if (!lessons.length) return <p className="py-muted">No lessons match.</p>

  return (
    <div className="py-series-stack">
      {groups.length >= jumpAt ? (
        <nav className="py-series-jump" aria-label="Jump to a course">
          {groups.map((g) => (
            <a key={g.series} href={`#series-${slug(g.series)}`}>
              {g.series} <span>{g.lessons.length}</span>
            </a>
          ))}
        </nav>
      ) : null}
      {groups.map((g) => (
        <SeriesSection
          key={g.series}
          series={g.series}
          lessons={g.lessons}
          hrefBase={hrefBase}
          completed={completed}
          topicOf={topicOf}
          preview={preview}
        />
      ))}
    </div>
  )
}

function SeriesSection({
  series,
  lessons,
  hrefBase,
  completed,
  topicOf,
  preview,
}: {
  series: string
  lessons: SeriesLessonRef[]
  hrefBase: string
  completed: string[]
  topicOf: (title: string) => string
  preview: (text: string) => string
}) {
  const [limit, setLimit] = useState(PAGE)
  const done = lessons.filter((l) => completed.includes(l.id)).length
  const shown = lessons.slice(0, limit)
  const left = lessons.length - shown.length
  return (
    <section id={`series-${slug(series)}`} className="py-series">
      <header className="py-series-head">
        <h3>{series}</h3>
        <span className="py-count">
          {done ? `${done}/` : ''}
          {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
        </span>
      </header>
      <div className="py-card-grid">
        {shown.map((lesson, i) => (
          <Link
            key={lesson.id}
            to={`${hrefBase}/${lesson.id}`}
            className={completed.includes(lesson.id) ? 'py-browse-card done' : 'py-browse-card'}
          >
            <p className="py-kicker">{lessons.length > 1 ? String(i + 1).padStart(2, '0') : series}</p>
            <h3>{preview(topicOf(lesson.title))}</h3>
            <p>{preview(lesson.summary)}</p>
          </Link>
        ))}
      </div>
      {left > 0 || limit > PAGE ? (
        <div className="show-more">
          {left > 0 ? (
            <>
              <button type="button" onClick={() => setLimit((n) => n + PAGE)}>
                Show {Math.min(PAGE, left)} more ({left} left)
              </button>
              {left > PAGE ? (
                <button type="button" onClick={() => setLimit(lessons.length)}>
                  Show all {lessons.length}
                </button>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setLimit(PAGE)
                document.getElementById(`series-${slug(series)}`)?.scrollIntoView({ block: 'start' })
              }}
            >
              Show fewer
            </button>
          )}
        </div>
      ) : null}
    </section>
  )
}
