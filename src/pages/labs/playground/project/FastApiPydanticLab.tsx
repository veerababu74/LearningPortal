import { useMemo, useState } from 'react'
import { Check, PgHeader, Range, Stat } from '../common'

export function FastApiPydanticLab() {
  const [handlerMode, setHandlerMode] = useState<'async-good' | 'async-blocking-bug' | 'sync-threadpool'>('async-good')
  const [concurrentUsers, setConcurrentUsers] = useState(24)
  const [llmWaitMs, setLlmWaitMs] = useState(350)
  const [excludeUnset, setExcludeUnset] = useState(true)
  const [streamDisconnect, setStreamDisconnect] = useState(true)

  const perf = useMemo(() => {
    if (handlerMode === 'async-good') {
      return { totalMs: llmWaitMs + 12, note: 'Event loop multiplexes all 24 awaits concurrently on 1 Uvicorn worker!', tone: 'ok' as const }
    }
    if (handlerMode === 'async-blocking-bug') {
      return { totalMs: concurrentUsers * llmWaitMs, note: 'BUG: sync requests.get() inside async def froze the event loop — every user waited in single-file line!', tone: 'bad' as const }
    }
    const waves = Math.ceil(concurrentUsers / 40)
    return { totalMs: waves * llmWaitMs + 25, note: 'FastAPI dispatches plain def to AnyIO worker threadpool (~40 threads), keeping the event loop unblocked.', tone: 'ok' as const }
  }, [handlerMode, concurrentUsers, llmWaitMs])

  const existingModel = { model: 'gpt-4o', temperature: 0.7, max_steps: 10 }
  const patchPayload = excludeUnset ? { temperature: 0.0 } : { model: null, temperature: 0.0, max_steps: null }
  const merged = { ...existingModel, ...patchPayload }

  return (
    <div className="pg">
      <PgHeader kicker="VeeraProject Lab · FA-1, FA-2 & REST-5" title="FastAPI ASGI, Pydantic V2 PATCH & SSE Streaming Lab">
        Compare <code>async def</code> non-blocking awaits vs accidental event-loop blocking vs AnyIO threadpools, and see
        why <code>model_dump(exclude_unset=True)</code> prevents Pydantic V2 PATCH data loss.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>1. FastAPI Concurrency Simulator (1 Uvicorn Worker)</h2>
          <div className="pg-row" style={{ marginBottom: '0.65rem' }}>
            <button type="button" className={handlerMode === 'async-good' ? 'pg-chip on' : 'pg-chip'} onClick={() => setHandlerMode('async-good')}>
              async def + await httpx
            </button>
            <button type="button" className={handlerMode === 'async-blocking-bug' ? 'pg-chip on' : 'pg-chip'} onClick={() => setHandlerMode('async-blocking-bug')}>
              async def + sync requests (BUG!)
            </button>
            <button type="button" className={handlerMode === 'sync-threadpool' ? 'pg-chip on' : 'pg-chip'} onClick={() => setHandlerMode('sync-threadpool')}>
              def (AnyIO threadpool)
            </button>
          </div>
          <Range label="Concurrent requests" value={concurrentUsers} min={1} max={50} onChange={setConcurrentUsers} />
          <Range label="Downstream LLM latency" value={llmWaitMs} min={100} max={1000} step={50} onChange={setLlmWaitMs} fmt={(v) => `${v} ms`} />
          <div className="pg-stats" style={{ marginTop: '0.75rem' }}>
            <Stat label="Wall time for batch" value={`${(perf.totalMs / 1000).toFixed(2)}s`} tone={perf.tone} />
            <Stat label="Throughput" value={`${((concurrentUsers * 1000) / perf.totalMs).toFixed(1)} req/s`} />
          </div>
          <p className="pg-note">{perf.note}</p>
        </div>

        <div className="pg-card">
          <h2>2. Pydantic V2 PATCH & SSE Disconnect Savings</h2>
          <Check
            label="Use patch.model_dump(exclude_unset=True)"
            hint="Toggle OFF to see optional defaults wipe existing fields!"
            checked={excludeUnset}
            onChange={setExcludeUnset}
          />
          <pre className="pg-code">{`// Incoming PATCH JSON: { "temperature": 0.0 }\n// Resulting DB record:\n${JSON.stringify(merged, null, 2)}`}</pre>
          <div style={{ marginTop: '0.75rem' }}>
            <Check
              label="Cancel upstream LLM stream on request.is_disconnected()"
              hint="Stops paying for tokens when the user closes the tab at 20% generation"
              checked={streamDisconnect}
              onChange={setStreamDisconnect}
            />
            <div className="pg-stats">
              <Stat label="Wasted Tokens on Early Close" value={streamDisconnect ? '0 tokens (saved 80%)' : '1,600 wasted tokens'} tone={streamDisconnect ? 'ok' : 'bad'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
