import { useEffect, useMemo, useState } from 'react'
import type { FlowSpec } from '@/types/curriculum'
import './FlowPlayer.css'

type Props = {
  diagram: FlowSpec
  compact?: boolean
  onStepChange?: (stepIndex: number, step: FlowSpec['steps'][number]) => void
}

function shortTitle(title?: string) {
  const t = (title || 'Concept flow').replace(/\s+/g, ' ').trim()
  if (t.length <= 48) return t
  return `${t.slice(0, 48).replace(/\s+\S*$/, '').trim()}…`
}

export function FlowPlayer({ diagram, compact = false, onStepChange }: Props) {
  const [step, setStep] = useState(0)
  const safeDiagram = diagram || { title: 'Flow', nodes: [], edges: [], steps: [] }
  const steps = safeDiagram.steps?.length ? safeDiagram.steps : []
  const current = steps[step] || steps[0]

  useEffect(() => {
    setStep(0)
  }, [safeDiagram.title, safeDiagram.nodes?.length])

  useEffect(() => {
    if (current) onStepChange?.(step, current)
  }, [step, current, onStepChange])

  const activeNodes = useMemo(() => new Set(current?.activeNodeIds || []), [current])
  const activeEdges = useMemo(() => new Set(current?.activeEdgeIds || []), [current])

  const nodeCount = Math.max(safeDiagram.nodes?.length || 0, 1)
  const nodeW = 100
  const gap = 28
  const padX = 16
  const width = padX * 2 + nodeCount * nodeW + (nodeCount - 1) * gap
  const height = 100

  if (!safeDiagram.nodes?.length) return null

  function go(next: number) {
    const bounded = (next + steps.length) % steps.length
    setStep(bounded)
  }

  return (
    <div className={compact ? 'flow-player compact' : 'flow-player'}>
      <div className="flow-head">
        <div className="flow-title-wrap">
          <p className="flow-kicker">Flow diagram</p>
          <h3 title={safeDiagram.title}>{shortTitle(safeDiagram.title)}</h3>
        </div>
        {steps.length > 1 ? (
          <div className="flow-controls">
            <button type="button" onClick={() => go(step - 1)}>
              Previous
            </button>
            <span className="step-count">
              {step + 1}/{steps.length}
            </span>
            <button type="button" onClick={() => go(step + 1)}>
              Next
            </button>
          </div>
        ) : null}
      </div>

      <div className="flow-stage">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="flow-svg"
          role="img"
          aria-label={safeDiagram.title || 'Flow diagram'}
          preserveAspectRatio="xMidYMid meet"
        >
          {(safeDiagram.edges || []).map((e, ei) => {
            const sIdx = safeDiagram.nodes.findIndex((n) => n.id === e.source)
            const tIdx = safeDiagram.nodes.findIndex((n) => n.id === e.target)
            if (sIdx < 0 || tIdx < 0) return null
            const x1 = padX + sIdx * (nodeW + gap) + nodeW
            const x2 = padX + tIdx * (nodeW + gap)
            const y = 42
            const active = activeEdges.has(e.id)
            return (
              <line
                key={e.id || `e${ei}`}
                x1={x1}
                y1={y}
                x2={x2}
                y2={y}
                className={active ? 'edge active' : 'edge'}
              />
            )
          })}
          {safeDiagram.nodes.map((n, i) => {
            const active = activeNodes.has(n.id)
            const x = padX + i * (nodeW + gap)
            const label = n.label.length > 12 ? `${n.label.slice(0, 11)}…` : n.label
            return (
              <g
                key={n.id}
                transform={`translate(${x}, 20)`}
                className="node-hit"
                onClick={() => setStep(Math.min(i, steps.length - 1))}
              >
                <rect
                  width={nodeW}
                  height="44"
                  rx="10"
                  className={`node ${n.kind || 'process'} ${active ? 'active' : ''}`}
                />
                <text x={nodeW / 2} y="27" textAnchor="middle" className="node-label">
                  {label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {current ? (
        <div className="flow-current">
          <strong>
            Step {step + 1}: {current.label}
          </strong>
          <p>{current.narration}</p>
        </div>
      ) : null}

      {steps.length > 1 ? (
        <div className="flow-step-chips" role="tablist" aria-label="Diagram steps">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === step}
              className={i === step ? 'chip active' : 'chip'}
              onClick={() => setStep(i)}
              title={s.label}
            >
              {i + 1}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
