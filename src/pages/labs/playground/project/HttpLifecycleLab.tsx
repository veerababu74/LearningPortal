import { useState } from 'react'
import { Check, PgHeader, Range, Stat } from '../common'

export function HttpLifecycleLab() {
  const [keepAlive, setKeepAlive] = useState(true)
  const [dnsCached, setDnsCached] = useState(true)
  const [backendMs, setBackendMs] = useState(85)
  const [fault, setFault] = useState<'none' | 'dns' | 'tls' | '429' | '503'>('none')

  // Token bucket simulator state
  const [capacity, setCapacity] = useState(10)
  const [tokens, setTokens] = useState(10)
  const [history, setHistory] = useState<string[]>([])

  const dnsMs = fault === 'dns' ? 1200 : dnsCached ? 0 : 18
  const tcpTlsMs = fault === 'tls' ? 90 : keepAlive ? 0 : 48
  const totalMs = fault === 'dns' || fault === 'tls' ? dnsMs + tcpTlsMs : dnsMs + tcpTlsMs + backendMs

  function fireBurst(n: number) {
    let cur = tokens
    const next: string[] = []
    for (let i = 0; i < n; i++) {
      if (cur > 0) {
        cur--
        next.push(`200 OK (remaining=${cur})`)
      } else {
        next.push('429 Too Many Requests · Retry-After: 2s')
      }
    }
    setTokens(cur)
    setHistory((h) => [...next, ...h].slice(0, 8))
  }

  const rfc9457 =
    fault === '429'
      ? { type: 'https://api.example.com/errors/rate-limited', title: 'Rate limit exceeded', status: 429, detail: 'Tenant exceeded 10 req/sec burst', retry_after: 2 }
      : fault === '503'
        ? { type: 'https://api.example.com/errors/upstream-unavailable', title: 'Vector DB unavailable', status: 503, detail: 'Upstream timed out after 3000ms' }
        : null

  return (
    <div className="pg">
      <PgHeader kicker="VeeraProject Lab · REST-1 to REST-5" title="HTTP Lifecycle, RFC 9457 & Token Bucket Lab">
        Compare cold connections vs Keep-Alive connection pools, inject DNS/TLS/429/503 faults, inspect RFC 9457 Problem
        Details errors, and fire burst traffic at a Token Bucket rate limiter.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>1. HTTP Connection & Fault Injector</h2>
          <Check label="Reuse Keep-Alive connection pool (httpx.AsyncClient)" checked={keepAlive} onChange={setKeepAlive} />
          <Check label="DNS response cached locally" checked={dnsCached} onChange={setDnsCached} />
          <Range label="FastAPI + DB handler latency" value={backendMs} min={10} max={800} step={5} onChange={setBackendMs} fmt={(v) => `${v} ms`} />
          <div className="pg-row" style={{ marginTop: '0.6rem' }}>
            {(['none', 'dns', 'tls', '429', '503'] as const).map((f) => (
              <button key={f} type="button" className={fault === f ? 'pg-chip on' : 'pg-chip'} onClick={() => setFault(f)}>
                {f === 'none' ? 'Healthy' : `Fault: ${f.toUpperCase()}`}
              </button>
            ))}
          </div>
          <div className="pg-stats" style={{ marginTop: '0.8rem' }}>
            <Stat label="Network Overhead" value={`${dnsMs + tcpTlsMs} ms`} tone={dnsMs + tcpTlsMs === 0 ? 'ok' : 'warn'} />
            <Stat label="Total Latency" value={`${totalMs} ms`} tone={fault === 'none' ? 'ok' : 'bad'} />
          </div>
          {rfc9457 ? <pre className="pg-code" style={{ marginTop: '0.65rem' }}>{JSON.stringify(rfc9457, null, 2)}</pre> : null}
        </div>

        <div className="pg-card">
          <h2>2. Token Bucket Rate Limiter</h2>
          <Range label="Bucket Capacity (Burst)" value={capacity} min={3} max={20} onChange={(c) => { setCapacity(c); setTokens(Math.min(tokens, c)) }} />
          <div className="pg-stats" style={{ marginBottom: '0.75rem' }}>
            <Stat label="Tokens Available" value={`${tokens} / ${capacity}`} tone={tokens > 0 ? 'ok' : 'bad'} />
          </div>
          <div className="pg-row" style={{ marginBottom: '0.75rem' }}>
            <button type="button" className="pg-btn" onClick={() => fireBurst(1)}>Send 1 Req</button>
            <button type="button" className="pg-btn" onClick={() => fireBurst(5)}>Fire 5x Burst</button>
            <button type="button" className="pg-btn soft" onClick={() => setTokens((t) => Math.min(capacity, t + 3))}>+3 Refill</button>
            <button type="button" className="pg-btn soft" onClick={() => { setTokens(capacity); setHistory([]) }}>Reset</button>
          </div>
          <ul className="pg-list">
            {history.length ? history.map((h, i) => (
              <li key={i} className={h.startsWith('200') ? 'ok' : 'bad'}>{h}</li>
            )) : <li className="pg-note">Click Send 1 Req or Fire 5x Burst to watch tokens drain and 429s trigger.</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
