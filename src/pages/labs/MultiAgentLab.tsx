import { useState } from 'react'
import { FlowPlayer } from '@/components/visuals/FlowPlayer'
import { pickFlowClient } from '@/content/flowClient'
import './LabShared.css'

export function MultiAgentLab() {
  const [deadlock, setDeadlock] = useState(false)

  return (
    <div className="lab">
      <h1>Multi-agent handoff lab</h1>
      <p className="lede">
        Orchestrators delegate to specialists. Without clear ownership and termination rules, agents
        can wait on each other forever.
      </p>
      <div className="lab-panel">
        <div className="step-list">
          <button
            type="button"
            className={!deadlock ? 'step-chip active' : 'step-chip'}
            onClick={() => setDeadlock(false)}
          >
            Healthy handoff
          </button>
          <button
            type="button"
            className={deadlock ? 'step-chip active' : 'step-chip'}
            onClick={() => setDeadlock(true)}
          >
            Deadlock risk
          </button>
        </div>
        <FlowPlayer diagram={pickFlowClient('multiagent')} />
        <div className="viz-box" style={{ marginTop: '1rem' }}>
          {deadlock ? (
            <p>
              Specialist A waits for B’s output. Specialist B waits for A’s approval. No progress
              detector, timeout, or orchestrator break → coordination deadlock.
            </p>
          ) : (
            <p>
              Orchestrator assigns non-circular dependencies, merges results, and enforces a global
              deadline so the workflow always terminates.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
