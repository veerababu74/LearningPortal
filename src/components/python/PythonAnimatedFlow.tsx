import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { PyFlow } from '@/content/python/types'
import './python.css'

type Props = {
  flow: PyFlow
  autoPlayMs?: number
  onStepChange?: (index: number) => void
}

export function PythonAnimatedFlow({ flow, autoPlayMs = 2200, onStepChange }: Props) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)
  const steps = flow.steps
  const current = steps[step] || steps[0]

  useEffect(() => {
    setStep(0)
    setPlaying(true)
  }, [flow.title])

  useEffect(() => {
    onStepChange?.(step)
  }, [step, onStepChange])

  useEffect(() => {
    if (!playing || steps.length < 2) return
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % steps.length)
    }, autoPlayMs)
    return () => window.clearInterval(id)
  }, [playing, steps.length, autoPlayMs])

  const activeNodes = useMemo(() => new Set(current?.activeNodeIds || []), [current])
  const activeEdges = useMemo(() => new Set(current?.activeEdgeIds || []), [current])

  const nodeW = 108
  const gap = 26
  const padX = 18
  const width = padX * 2 + Math.max(flow.nodes.length, 1) * nodeW + (flow.nodes.length - 1) * gap
  const height = 118

  function go(delta: number) {
    setPlaying(false)
    setStep((s) => (s + delta + steps.length) % steps.length)
  }

  return (
    <div className="py-flow">
      <div className="py-flow-head">
        <div>
          <p className="py-kicker" style={{ color: '#fdba74' }}>
            Animated flow
          </p>
          <h3>{flow.title}</h3>
        </div>
        <div className="py-flow-controls">
          <button type="button" onClick={() => go(-1)}>
            Previous
          </button>
          <button type="button" onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <span>
            {step + 1}/{steps.length}
          </span>
          <button type="button" onClick={() => go(1)}>
            Next
          </button>
        </div>
      </div>

      <div className="py-flow-stage">
        <svg viewBox={`0 0 ${width} ${height}`} className="py-flow-svg" role="img" aria-label={flow.title}>
          {flow.edges.map((e) => {
            const sIdx = flow.nodes.findIndex((n) => n.id === e.source)
            const tIdx = flow.nodes.findIndex((n) => n.id === e.target)
            if (sIdx < 0 || tIdx < 0) return null
            const x1 = padX + sIdx * (nodeW + gap) + nodeW
            const x2 = padX + tIdx * (nodeW + gap)
            const y = 48
            const active = activeEdges.has(e.id)
            return (
              <g key={e.id}>
                <line x1={x1} y1={y} x2={x2} y2={y} className={active ? 'py-edge active' : 'py-edge'} />
                {e.label ? (
                  <text x={(x1 + x2) / 2} y={y - 8} fill="#cbd5e1" fontSize="10" textAnchor="middle">
                    {e.label}
                  </text>
                ) : null}
              </g>
            )
          })}
          {flow.nodes.map((n, i) => {
            const active = activeNodes.has(n.id)
            const x = padX + i * (nodeW + gap)
            return (
              <g key={n.id}>
                <motion.rect
                  x={x}
                  y={22}
                  width={nodeW}
                  height={52}
                  rx={10}
                  className={active ? 'py-node-box active' : 'py-node-box'}
                  animate={{ scale: active ? 1.04 : 1 }}
                  style={{ transformOrigin: `${x + nodeW / 2}px 48px` }}
                />
                <text x={x + nodeW / 2} y={52} className="py-node-label">
                  {n.label.length > 14 ? `${n.label.slice(0, 13)}…` : n.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <input
        className="py-progress"
        type="range"
        min={0}
        max={Math.max(steps.length - 1, 0)}
        value={step}
        onChange={(e) => {
          setPlaying(false)
          setStep(Number(e.target.value))
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={current?.id || step}
          className="py-narration"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          <strong>
            Step {step + 1}: {current?.label}
          </strong>
          <p>{current?.narration}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
