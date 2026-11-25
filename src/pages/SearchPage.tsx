import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { searchLessons } from '@/content/loadCurriculum'
import './Tracks.css'

export function SearchPage() {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Awaited<ReturnType<typeof searchLessons>>>([])

  useEffect(() => {
    let alive = true
    searchLessons(q).then((res) => {
      if (alive) setHits(res)
    })
    return () => {
      alive = false
    }
  }, [q])

  return (
    <div className="search-page">
      <header className="page-head">
        <h1>Search concepts</h1>
        <p>Find any lesson across RAG, agents, security, gateways, and production failures.</p>
      </header>
      <input
        className="search-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Try: prompt injection, chunking, rate limit, langgraph…"
        aria-label="Search lessons"
      />
      <div className="lesson-grid">
        {hits.map((h) => (
          <Link key={h.id} to={`/learn/${h.trackId}/${h.id}`} className="lesson-link">
            <span className="num">→</span>
            <div>
              <h3>{h.title}</h3>
              <p>
                {h.trackId} · {h.summary}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
