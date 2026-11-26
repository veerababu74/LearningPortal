import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AgentSim, SimEdge, SimNode, SimNodeKind } from '@/content/agents/visualizer'
import { CodeHighlight } from '@/components/code/CodeHighlight'
import '@/components/code/CodePanel.css'
import './agents.css'

const NODE_W = 148
const NODE_H = 58
const VIEW_W = 820
const VIEW_H = 410

const KIND_ICON: Record<SimNodeKind, string> = {
  user: '👤',
  llm: '🧠',
  tool: '🔧',
  memory: '🗄️',
  router: '🔀',
  human: '🙋',
  guard: '🛡️',
  end: '⏺',
  agent: '⚙️',
  service: '📡',
}

/** Point where the segment from the node centre towards (tx, ty) leaves the node box. */
function borderPoint(n: SimNode, tx: number, ty: number) {
  const dx = tx - n.x
  const dy = ty - n.y
  if (!dx && !dy) return { x: n.x, y: n.y }
  const sx = (NODE_W / 2 + 4) / Math.abs(dx || 1e-6)
  const sy = (NODE_H / 2 + 4) / Math.abs(dy || 1e-6)
  const s = Math.min(sx, sy)
  return { x: n.x + dx * s, y: n.y + dy * s }
}

function edgeGeometry(e: SimEdge, byId: Map<string, SimNode>) {
  const a = byId.get(e.from)!
  const b = byId.get(e.to)!
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
  // perpendicular offset for the curve's control point
  const bend = e.bend ?? 0
  const cx = mx + (-(b.y - a.y) / len) * bend
  const cy = my + ((b.x - a.x) / len) * bend
  const p1 = borderPoint(a, cx, cy)
  const p2 = borderPoint(b, cx, cy)
  const d = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  // label position: point on the curve at t = 0.5
  const lx = 0.25 * p1.x + 0.5 * cx + 0.25 * p2.x
  const ly = 0.25 * p1.y + 0.5 * cy + 0.25 * p2.y
  return { d, lx, ly }
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return reduced
}

type Props = { sim: AgentSim; compact?: boolean }

export function AgentSimPlayer({ sim, compact = false }: Props) {
  const [step, setStep] = useState(-1) // -1 = scenario intro
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [predictMode, setPredictMode] = useState(true)
  const [asking, setAsking] = useState<number | null>(null) // step index whose question is shown
  const [picked, setPicked] = useState<Record<number, number>>({})
  const [score, setScore] = useState({ right: 0, total: 0 })
  const codeRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const motionRef = useRef<SVGAnimateMotionElement>(null)
  const reduced = usePrefersReducedMotion()

  const byId = useMemo(() => new Map(sim.nodes.map((n) => [n.id, n])), [sim])
  const geo = useMemo(() => new Map(sim.edges.map((e) => [e.id, edgeGeometry(e, byId)])), [sim, byId])
  const codeLines = useMemo(() => sim.code.split('\n'), [sim])

  // reset when the simulation changes
  useEffect(() => {
    setStep(-1)
    setPlaying(false)
    setAsking(null)
    setPicked({})
    setScore({ right: 0, total: 0 })
  }, [sim.id])

  const last = sim.steps.length - 1
  const cur = step >= 0 ? sim.steps[step] : null
  const activeEdge = cur?.edge
  const activeNode = cur ? cur.node || (cur.edge ? sim.edges.find((e) => e.id === cur.edge)?.to : undefined) : undefined

  const visitedEdges = useMemo(() => {
    const s = new Set<string>()
    for (let i = 0; i < step; i++) if (sim.steps[i].edge) s.add(sim.steps[i].edge!)
    return s
  }, [sim, step])

  const snapshot = useMemo(() => {
    for (let i = step; i >= 0; i--) if (sim.steps[i].state) return sim.steps[i].state!
    return sim.steps.find((s) => s.state)?.state
      ? Object.fromEntries(Object.keys(sim.steps.find((s) => s.state)!.state!).map((k) => [k, '—']))
      : {}
  }, [sim, step])

  const logs = useMemo(() => sim.steps.slice(0, step + 1).map((s, i) => ({ i, text: s.log, tone: s.tone })).filter((l) => l.text), [sim, step])

  const hlLines = useMemo(() => {
    const out = new Set<number>()
    for (const snip of cur?.hl || []) {
      const idx = codeLines.findIndex((l) => l.includes(snip))
      if (idx >= 0) out.add(idx)
    }
    return out
  }, [cur, codeLines])

  // SMIL animations inserted after load must be started explicitly
  useLayoutEffect(() => {
    motionRef.current?.beginElement?.()
  }, [step, sim.id])

  // On narrow screens the diagram keeps a readable size and scrolls sideways:
  // follow the active part of the diagram like a camera.
  useEffect(() => {
    const box = stageRef.current
    if (!box || box.scrollWidth <= box.clientWidth + 4) return
    const node = activeNode ? byId.get(activeNode) : undefined
    const edge = cur?.edge ? sim.edges.find((e) => e.id === cur.edge) : undefined
    const from = edge ? byId.get(edge.from) : undefined
    const x = node && from ? (node.x + from.x) / 2 : node ? node.x : VIEW_W / 2
    const left = (x / VIEW_W) * box.scrollWidth - box.clientWidth / 2
    box.scrollTo({ left: Math.max(0, left), behavior: reduced ? 'auto' : 'smooth' })
  }, [activeNode, cur, byId, sim, reduced])

  // keep the highlighted code line in view (scroll the code pane only, never the page)
  useEffect(() => {
    const box = codeRef.current
    if (!box || !hlLines.size) return
    const first = Math.min(...hlLines)
    const el = box.querySelector<HTMLElement>(`[data-line="${first}"]`)
    if (!el) return
    const top = el.offsetTop - box.clientHeight / 3
    box.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' })
  }, [hlLines, reduced])

  function goTo(next: number) {
    if (next > last) {
      setPlaying(false)
      return
    }
    if (next < -1) return
    const target = sim.steps[next]
    if (predictMode && next > step && target?.predict && picked[next] === undefined) {
      setAsking(next)
      setPlaying(false)
      return
    }
    setAsking(null)
    setStep(next)
  }

  // autoplay
  useEffect(() => {
    if (!playing || asking !== null) return
    if (step >= last) {
      setPlaying(false)
      return
    }
    const t = window.setTimeout(() => goTo(step + 1), step < 0 ? 400 : 2600 / speed)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, step, speed, asking])

  function answer(i: number) {
    if (asking === null || picked[asking] !== undefined) return
    const q = sim.steps[asking].predict!
    setPicked((p) => ({ ...p, [asking]: i }))
    setScore((s) => ({ right: s.right + (i === q.answer ? 1 : 0), total: s.total + 1 }))
  }

  function continueAfterPredict() {
    if (asking === null) return
    const n = asking
    setAsking(null)
    setStep(n)
    setPlaying(true)
  }

  const moveDur = `${(1.05 / speed).toFixed(2)}s`
  // packet tag: flip to the left of the dot when the packet is heading to the right edge of the canvas
  const packetText = cur?.packet ? (cur.packet.length > 36 ? `${cur.packet.slice(0, 35)}…` : cur.packet) : ''
  const tagW = Math.min(270, packetText.length * 7 + 16)
  const edgeTo = cur?.edge ? byId.get(sim.edges.find((e) => e.id === cur.edge)?.to || '') : undefined
  const tagX = edgeTo && edgeTo.x + 12 + tagW > VIEW_W - 8 ? -(tagW + 12) : 12
  const question = asking !== null ? sim.steps[asking].predict! : null
  const answered = asking !== null ? picked[asking] : undefined

  return (
    <div className={compact ? 'agsim compact' : 'agsim'}>
      <div className="agsim-stage-col">
        <div className="agsim-toolbar">
          <div className="agsim-btns">
            <button type="button" className="agsim-btn" onClick={() => goTo(step - 1)} disabled={step < 0} aria-label="Previous step">
              ◀
            </button>
            <button
              type="button"
              className="agsim-btn primary"
              onClick={() => {
                if (step >= last) {
                  setStep(-1)
                  setPlaying(true)
                  return
                }
                setPlaying((p) => !p)
              }}
            >
              {playing ? '❚❚ Pause' : step >= last ? '↺ Replay' : step < 0 ? '▶ Play' : '▶ Resume'}
            </button>
            <button type="button" className="agsim-btn" onClick={() => goTo(step + 1)} disabled={step >= last || asking !== null} aria-label="Next step">
              ▶
            </button>
            <button
              type="button"
              className="agsim-btn ghost"
              onClick={() => {
                setPlaying(false)
                setAsking(null)
                setStep(-1)
              }}
            >
              Reset
            </button>
          </div>
          <div className="agsim-opts">
            <label>
              Speed
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                <option value={0.5}>0.5×</option>
                <option value={1}>1×</option>
                <option value={1.6}>1.6×</option>
              </select>
            </label>
            <label className="agsim-check">
              <input type="checkbox" checked={predictMode} onChange={(e) => setPredictMode(e.target.checked)} />
              Predict mode
            </label>
          </div>
        </div>

        <div className="agsim-stage" ref={stageRef}>
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label={`${sim.title} — animated diagram`}>
            <defs>
              <marker id={`arr-${sim.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="agsim-arrowhead" />
              </marker>
              <marker id={`arr-on-${sim.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="agsim-arrowhead on" />
              </marker>
            </defs>

            {sim.edges.map((e) => {
              const g = geo.get(e.id)!
              const on = e.id === activeEdge
              const seen = visitedEdges.has(e.id)
              return (
                <g key={e.id}>
                  <path
                    d={g.d}
                    className={on ? 'agsim-edge on' : seen ? 'agsim-edge seen' : 'agsim-edge'}
                    markerEnd={`url(#${on ? `arr-on-${sim.id}` : `arr-${sim.id}`})`}
                  />
                  {e.label ? (
                    <text x={g.lx} y={g.ly - 6} className="agsim-edge-label" textAnchor="middle">
                      {e.label}
                    </text>
                  ) : null}
                </g>
              )
            })}

            {sim.nodes.map((n) => {
              const on = n.id === activeNode
              return (
                <g key={n.id} className={`agsim-node kind-${n.kind}${on ? ' on' : ''}${on && cur?.tone ? ` tone-${cur.tone}` : ''}`} transform={`translate(${n.x - NODE_W / 2} ${n.y - NODE_H / 2})`}>
                  {on ? <rect className="agsim-halo" x={-6} y={-6} width={NODE_W + 12} height={NODE_H + 12} rx={16} /> : null}
                  <rect className="agsim-box" width={NODE_W} height={NODE_H} rx={12} />
                  <text x={14} y={n.sub ? 24 : 34} className="agsim-node-icon">
                    {KIND_ICON[n.kind]}
                  </text>
                  <text
                    x={38}
                    y={n.sub ? 25 : 34}
                    className="agsim-node-label"
                    {...(n.label.length > 13 ? { textLength: 102, lengthAdjust: 'spacingAndGlyphs' as const } : {})}
                  >
                    {n.label}
                  </text>
                  {n.sub ? (
                    <text
                      x={38}
                      y={43}
                      className="agsim-node-sub"
                      {...(n.sub.length > 17 ? { textLength: 102, lengthAdjust: 'spacingAndGlyphs' as const } : {})}
                    >
                      {n.sub.length > 22 ? `${n.sub.slice(0, 21)}…` : n.sub}
                    </text>
                  ) : null}
                </g>
              )
            })}

            {cur?.edge && geo.get(cur.edge) ? (
              <g key={`pk-${step}`} className={`agsim-packet${cur.tone ? ` tone-${cur.tone}` : ''}`}>
                {reduced ? null : <animateMotion ref={motionRef} begin="indefinite" dur={moveDur} fill="freeze" path={geo.get(cur.edge)!.d} calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />}
                <circle r={9} cx={0} cy={0} transform={reduced ? `translate(${geo.get(cur.edge)!.lx} ${geo.get(cur.edge)!.ly})` : undefined} />
                {cur.packet ? (
                  <g transform={reduced ? `translate(${geo.get(cur.edge)!.lx} ${geo.get(cur.edge)!.ly})` : undefined}>
                    <rect x={tagX} y={-24} rx={7} height={22} width={tagW} className="agsim-packet-tag" />
                    <text x={tagX + 8} y={-9} className="agsim-packet-text">
                      {packetText}
                    </text>
                  </g>
                ) : null}
              </g>
            ) : null}
          </svg>
        </div>

        <p className="agsim-swipe-hint">↔ Swipe the diagram — it follows the active step.</p>
        <div className="agsim-dots" role="tablist" aria-label="Steps">
          {sim.steps.map((s, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === step}
              title={`${i + 1}. ${s.title}`}
              className={`agsim-dot${i === step ? ' on' : i < step ? ' done' : ''}${s.predict ? ' q' : ''}`}
              onClick={() => {
                setPlaying(false)
                setAsking(null)
                setStep(i)
              }}
            />
          ))}
          <span className="agsim-stepcount">{step < 0 ? `${sim.steps.length} steps` : `Step ${step + 1} / ${sim.steps.length}`}</span>
          {score.total ? (
            <span className="agsim-score">
              Predictions {score.right}/{score.total}
            </span>
          ) : null}
        </div>

        <div className={`agsim-narration${cur?.tone ? ` tone-${cur.tone}` : ''}`} aria-live="polite">
          {question ? (
            <div className="agsim-predict">
              <p className="agsim-kicker">🤔 Predict the next step</p>
              <h4>{question.question}</h4>
              <div className="agsim-options">
                {question.options.map((o, i) => {
                  const state = answered === undefined ? '' : i === question.answer ? ' right' : i === answered ? ' wrong' : ' dim'
                  return (
                    <button key={o} type="button" className={`agsim-option${state}`} onClick={() => answer(i)} disabled={answered !== undefined}>
                      {o}
                    </button>
                  )
                })}
              </div>
              {answered !== undefined ? (
                <>
                  <p className="agsim-explain">
                    <strong>{answered === question.answer ? 'Correct. ' : 'Not quite. '}</strong>
                    {question.explain}
                  </p>
                  <button type="button" className="agsim-btn primary" onClick={continueAfterPredict}>
                    Watch it happen ▶
                  </button>
                </>
              ) : null}
            </div>
          ) : cur ? (
            <>
              <p className="agsim-kicker">
                Step {step + 1} · {cur.title}
              </p>
              <p>{cur.narration}</p>
            </>
          ) : (
            <>
              <p className="agsim-kicker">Scenario</p>
              <p>{sim.scenario}</p>
              <p className="agsim-hint">Press ▶ Play to animate, or use ◀ ▶ to go one step at a time. Questions pause the animation so you can predict first.</p>
            </>
          )}
        </div>
      </div>

      <div className="agsim-side">
        <div className="agsim-panel">
          <p className="agsim-panel-title">Live state</p>
          <dl className="agsim-state">
            {Object.entries(snapshot).map(([k, v]) => {
              const flash = cur?.changed?.includes(k)
              return (
                <div key={`${k}-${flash ? step : 'x'}`} className={flash ? 'agsim-kv flash' : 'agsim-kv'}>
                  <dt>{k}</dt>
                  <dd>
                    {Array.isArray(v) ? (
                      v.length ? (
                        <ol>
                          {v.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ol>
                      ) : (
                        <span className="agsim-empty">[ ]</span>
                      )
                    ) : (
                      v
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>

        <div className="agsim-panel">
          <p className="agsim-panel-title">
            Code <span className="agsim-fw">{sim.framework}</span>
          </p>
          <div className="agsim-code" ref={codeRef}>
            {codeLines.map((line, i) => (
              <div key={i} data-line={i} className={hlLines.has(i) ? 'agsim-line on' : 'agsim-line'}>
                <span className="agsim-ln">{i + 1}</span>
                <CodeHighlight code={line || ' '} language={sim.framework} />
              </div>
            ))}
          </div>
        </div>

        <div className="agsim-panel">
          <p className="agsim-panel-title">Event log</p>
          <ol className="agsim-log">
            {logs.length ? (
              logs.map((l) => (
                <li key={l.i} className={`${l.i === step ? 'now' : ''}${l.tone ? ` tone-${l.tone}` : ''}`}>
                  {l.text}
                </li>
              ))
            ) : (
              <li className="agsim-empty">Nothing yet — press Play.</li>
            )}
          </ol>
        </div>
      </div>
    </div>
  )
}
