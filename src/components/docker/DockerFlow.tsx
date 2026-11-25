import { useState } from 'react'
import type { DockerFlowStep } from '@/content/docker/types'
import './docker.css'

export function DockerFlow({ title, steps }: { title: string; steps: DockerFlowStep[] }) {
  const [i, setI] = useState(0)
  const current = steps[i]

  if (!steps.length) return null

  return (
    <div className="dk-flow">
      <div className="dk-flow-head">
        <h3>{title}</h3>
        <div className="dk-flow-controls">
          <button type="button" onClick={() => setI((x) => (x - 1 + steps.length) % steps.length)}>
            Previous
          </button>
          <span>
            {i + 1}/{steps.length}
          </span>
          <button type="button" onClick={() => setI((x) => (x + 1) % steps.length)}>
            Next
          </button>
        </div>
      </div>
      <div className="dk-flow-nodes">
        {steps.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            className={idx === i ? 'dk-node active' : 'dk-node'}
            onClick={() => setI(idx)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="dk-flow-detail">
        <strong>
          Step {i + 1}: {current.label}
        </strong>
        <p>{current.detail}</p>
      </div>
    </div>
  )
}
