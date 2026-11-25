import { useState } from 'react'
import { FlowPlayer } from '@/components/visuals/FlowPlayer'
import { pickFlowClient } from '@/content/flowClient'
import './LabShared.css'

const PHASES = [
  { title: 'Thought', text: 'I need the leave policy. I should call the knowledge search tool.' },
  { title: 'Action', text: 'search_docs(query="maternity leave policy")' },
  { title: 'Observation', text: 'Retrieved: Eligible employees receive 26 weeks of maternity leave.' },
]

export function AgentLoopLab() {
  const [i, setI] = useState(0)

  return (
    <div className="lab">
      <h1>Agent ReAct loop</h1>
      <p className="lede">
        Agents alternate reasoning, tool use, and observation. Click each phase to inspect it —
        nothing autoplays.
      </p>
      <div className="lab-panel">
        <FlowPlayer diagram={pickFlowClient('agent')} />
        <div className="viz-box" style={{ marginTop: '1rem' }}>
          <div className="step-list" style={{ marginBottom: '0.8rem' }}>
            {PHASES.map((p, idx) => (
              <button
                key={p.title}
                type="button"
                className={idx === i ? 'step-chip active' : 'step-chip'}
                onClick={() => setI(idx)}
              >
                {p.title}
              </button>
            ))}
          </div>
          <div className="agent-cycle">
            {PHASES.map((p, idx) => (
              <div key={p.title} className={idx === i ? 'agent-node active' : 'agent-node'}>
                <strong>{p.title}</strong>
                <p style={{ margin: '0.4rem 0 0' }}>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
