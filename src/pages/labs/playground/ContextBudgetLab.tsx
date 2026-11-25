import { useMemo, useState } from 'react'
import { PgHeader, Range, Stat } from './common'

const MODELS = [
  { id: 'small', label: '8K context · $0.15 / 1M in', ctx: 8_000, price: 0.15 },
  { id: 'mid', label: '128K context · $2.50 / 1M in', ctx: 128_000, price: 2.5 },
  { id: 'large', label: '200K context · $3.00 / 1M in', ctx: 200_000, price: 3 },
]

const PARTS = [
  { key: 'system', label: 'System prompt', color: '#7c3aed' },
  { key: 'tools', label: 'Tool schemas', color: '#ea580c' },
  { key: 'history', label: 'Chat history', color: '#0ea5e9' },
  { key: 'rag', label: 'Retrieved chunks', color: '#16a34a' },
  { key: 'output', label: 'Reserved for output', color: '#94a3b8' },
] as const

type Strategy = 'none' | 'truncate' | 'summarize'

export function ContextBudgetLab() {
  const [modelId, setModelId] = useState('small')
  const model = MODELS.find((m) => m.id === modelId)!
  const [system, setSystem] = useState(900)
  const [nTools, setNTools] = useState(12)
  const [turns, setTurns] = useState(20)
  const [k, setK] = useState(6)
  const [chunk, setChunk] = useState(500)
  const [output, setOutput] = useState(1000)
  const [strategy, setStrategy] = useState<Strategy>('none')
  const [convs, setConvs] = useState(1000)

  const r = useMemo(() => {
    const tools = nTools * 150
    const rawHistory = turns * 180
    let history = rawHistory
    const rag = k * chunk
    const fixed = system + tools + rag + output
    let dropped = 0
    let note = ''
    if (strategy === 'summarize' && turns > 6) {
      history = 6 * 180 + 400
      note = `Older ${turns - 6} turns compressed into a ~400-token summary.`
    }
    if (strategy === 'truncate' && fixed + history > model.ctx) {
      const room = Math.max(0, model.ctx - fixed)
      const keepTurns = Math.floor(room / 180)
      dropped = Math.max(0, turns - keepTurns)
      history = Math.min(history, keepTurns * 180)
      note = dropped ? `Dropped the oldest ${dropped} turns to fit.` : ''
    }
    const parts = { system, tools, history, rag, output }
    const total = system + tools + history + rag + output
    const input = total - output
    const overflow = total > model.ctx
    const costPerCall = (input / 1_000_000) * model.price
    return { parts, total, input, overflow, costPerCall, note, dropped, rawHistory, saved: rawHistory - history }
  }, [model, system, nTools, turns, k, chunk, output, strategy])

  const scale = Math.max(r.total, model.ctx)
  const usedPct = Math.round((r.total / model.ctx) * 100)
  const callsPerConv = Math.max(1, turns)

  const warnings: string[] = []
  if (r.overflow) warnings.push(`Over the ${model.ctx.toLocaleString()}-token window by ${(r.total - model.ctx).toLocaleString()} tokens — the API call would be rejected.`)
  if (k > 10) warnings.push('More than ~10 chunks invites “lost in the middle”: models attend best to the start and end of the context. Rerank and keep fewer.')
  if (nTools > 25) warnings.push('25+ tool schemas cost tokens on every call and make tool selection less accurate. Route to a smaller tool subset per task.')
  if (r.parts.tools > r.parts.rag && k > 0) warnings.push('Tool schemas use more tokens than the retrieved knowledge. Trim descriptions or load tools dynamically.')
  if (!r.overflow && usedPct > 80) warnings.push('Above 80% of the window: latency and cost grow, and quality often drops before the hard limit.')

  return (
    <div className="pg">
      <PgHeader kicker="AI agent playground" title="Context Window Budget">
        Everything the model sees has to fit in one window — system prompt, tool schemas, history, retrieved chunks and
        room for the answer. Move the sliders, pick a strategy, and see what overflows and what it costs.
      </PgHeader>

      <div className="pg-grid">
        <div className="pg-card">
          <h2>Model</h2>
          <label className="pg-field">
            <select value={modelId} onChange={(e) => setModelId(e.target.value)} aria-label="Model">
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <Range label="System prompt tokens" value={system} min={100} max={6000} step={100} onChange={setSystem} />
          <Range label="Tool schemas (≈150 tok each)" value={nTools} min={0} max={40} onChange={setNTools} />
          <Range label="History turns (≈180 tok each)" value={turns} min={0} max={80} onChange={setTurns} />
          <Range label="Retrieved chunks (k)" value={k} min={0} max={20} onChange={setK} />
          <Range label="Chunk size (tokens)" value={chunk} min={100} max={1500} step={50} onChange={setChunk} />
          <Range label="Reserved output tokens" value={output} min={256} max={8000} step={128} onChange={setOutput} />
          <h3 style={{ marginTop: '0.6rem' }}>When history grows</h3>
          <div className="pg-row">
            {(['none', 'truncate', 'summarize'] as Strategy[]).map((s) => (
              <button key={s} type="button" className={s === strategy ? 'pg-chip on' : 'pg-chip'} onClick={() => setStrategy(s)}>
                {s === 'none' ? 'Keep everything' : s === 'truncate' ? 'Drop oldest' : 'Summarize old turns'}
              </button>
            ))}
          </div>
        </div>

        <div className="pg-stack">
          <div className="pg-card">
            <h2>
              {r.total.toLocaleString()} / {model.ctx.toLocaleString()} tokens ({usedPct}%)
            </h2>
            <div className="pg-stackbar" role="img" aria-label={`Context usage ${usedPct}%`}>
              {PARTS.map((p) => (
                <i key={p.key} style={{ width: `${(r.parts[p.key] / scale) * 100}%`, background: p.color }} title={`${p.label}: ${r.parts[p.key]}`} />
              ))}
              {r.overflow ? (
                <span
                  style={{
                    position: 'absolute',
                    left: `${(model.ctx / scale) * 100}%`,
                    top: -4,
                    bottom: -4,
                    borderLeft: '3px dashed #dc2626',
                  }}
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="pg-legend">
              {PARTS.map((p) => (
                <span key={p.key}>
                  <i style={{ background: p.color }} /> {p.label}: {r.parts[p.key].toLocaleString()}
                </span>
              ))}
            </div>
            {r.note ? <p className="pg-note">✂ {r.note}</p> : null}
          </div>

          <div className="pg-stats">
            <Stat label="Fits?" value={r.overflow ? 'No' : 'Yes'} tone={r.overflow ? 'bad' : 'ok'} />
            <Stat label="Input tokens / call" value={r.input.toLocaleString()} />
            <Stat label="Cost / call" value={`$${r.costPerCall.toFixed(4)}`} />
            <Stat label={`Cost / ${convs.toLocaleString()} chats`} value={`$${(r.costPerCall * callsPerConv * convs).toFixed(2)}`} />
            {r.saved > 0 ? <Stat label="Tokens saved" value={r.saved.toLocaleString()} tone="ok" /> : null}
          </div>
          <div className="pg-card">
            <Range label="Conversations per day" value={convs} min={100} max={50000} step={100} onChange={setConvs} fmt={(v) => v.toLocaleString()} />
            <p className="pg-note">
              A chat of {callsPerConv} turns re-sends the whole context on every turn, so cost grows with turns × context size.
            </p>
          </div>

          {warnings.length ? (
            <div className="pg-banner bad">
              Problems with this budget
              <ul className="pg-insights" style={{ marginTop: '0.4rem', fontWeight: 500, color: 'var(--ink-soft)' }}>
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="pg-banner ok">
              Healthy budget
              <p>Fits with headroom. Now try 80 history turns on the 8K model and compare the three strategies.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
