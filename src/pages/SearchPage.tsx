import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getCurriculumIndex, searchLessons } from '@/content/loadCurriculum'
import { AGENT_GALLERY, PYTHON_GALLERY, RAG_GALLERY, PROJECT_GALLERY, simHref } from '@/content/sims/registry'
import { Pager, usePaged } from '@/components/common/Pager'
import { courseHomeFor } from '@/content/courses'
import './Tracks.css'

const SUGGESTIONS = ['prompt injection', 'event loop', 'playwright route', 'pydantic v2', 'bm25', 'langgraph reducer', 'rag evaluation', 'fastapi asgi']

function clean(text: string) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_>`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const track = params.get('track') || 'all'
  const index = getCurriculumIndex()

  const set = (next: Record<string, string>) => {
    const merged = { q, track, ...next }
    const out: Record<string, string> = {}
    if (merged.q) out.q = merged.q
    if (merged.track && merged.track !== 'all') out.track = merged.track
    setParams(out, { replace: true })
  }

  const all = useMemo(() => searchLessons(q), [q])
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const h of all) m.set(h.trackId, (m.get(h.trackId) || 0) + 1)
    return m
  }, [all])
  const hits = useMemo(() => (track === 'all' ? all : all.filter((h) => h.trackId === track)), [all, track])
  const paged = usePaged(hits, 20, `${q}|${track}`)

  const sims = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return []
    return [...AGENT_GALLERY, ...PYTHON_GALLERY, ...RAG_GALLERY, ...PROJECT_GALLERY]
      .filter((s) => words.every((w) => `${s.title} ${s.summary} ${s.framework}`.toLowerCase().includes(w)))
      .slice(0, 6)
  }, [q])

  const trackTitle = (id: string) => index.tracks.find((t) => t.id === id)?.title || id

  return (
    <div className="search-page" id="search-top">
      <header className="page-head">
        <h1>Search</h1>
        <p>Search every lesson and simulator across Python, Async, VeeraAgents and the Generative AI tracks.</p>
      </header>
      <input
        className="search-input"
        type="search"
        value={q}
        onChange={(e) => set({ q: e.target.value })}
        placeholder="Try: prompt injection, chunking, langgraph, decorator…"
        aria-label="Search lessons"
        autoFocus
      />

      {!q.trim() ? (
        <div className="search-suggest">
          <span>Popular:</span>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => set({ q: s, track: 'all' })}>
              {s}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="search-filters" role="group" aria-label="Filter by course">
            <button type="button" className={track === 'all' ? 'on' : ''} onClick={() => set({ track: 'all' })}>
              All <span>{all.length}</span>
            </button>
            {[...counts.entries()].map(([id, n]) => (
              <button key={id} type="button" className={track === id ? 'on' : ''} onClick={() => set({ track: id })}>
                {trackTitle(id)} <span>{n}</span>
              </button>
            ))}
          </div>

          {sims.length && track === 'all' ? (
            <section className="search-sims">
              <h2>Simulations</h2>
              <div className="search-sim-row">
                {sims.map((s) => (
                  <Link key={s.id} to={simHref(s)} className="search-sim">
                    ▶ {s.title}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {hits.length ? (
            <>
              <Pager {...paged} onChange={paged.setPage} label="lessons" scrollTo="search-top" />
              <div className="lesson-grid">
                {paged.slice.map((h) => (
                  <Link key={`${h.trackId}-${h.id}`} to={`/learn/${h.trackId}/${h.id}`} className="lesson-link">
                    <span className="num">→</span>
                    <div>
                      <h3>{h.title}</h3>
                      <p>
                        <strong>{courseHomeFor(h.trackId).label}</strong> · {clean(h.summary)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <Pager {...paged} onChange={paged.setPage} label="lessons" scrollTo="search-top" />
            </>
          ) : (
            <p className="search-empty">No lessons match “{q.trim()}”. Try fewer or different words.</p>
          )}
        </>
      )}
    </div>
  )
}
