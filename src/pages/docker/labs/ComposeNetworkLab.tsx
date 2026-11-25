import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '@/components/docker/docker.css'

export function ComposeNetworkLab() {
  const [dbHost, setDbHost] = useState<'qdrant' | 'localhost'>('qdrant')
  const [ready, setReady] = useState(true)
  const [step, setStep] = useState(0)

  const result = useMemo(() => {
    if (dbHost === 'localhost') {
      return {
        ok: false,
        message:
          'API called localhost:6333 — that is itself, not the Qdrant service. Connection refused.',
      }
    }
    if (!ready) {
      return {
        ok: false,
        message:
          'depends_on finished, but Qdrant is still booting. Client needs retries/healthcheck.',
      }
    }
    return { ok: true, message: 'Browser → api:8000 → qdrant:6333 → retrieved passages → answer.' }
  }, [dbHost, ready])

  const steps = [
    'Browser calls http://localhost:8000/query (published port on host)',
    'Compose routes host:8000 → api container:8000',
    `FastAPI embeds query and calls ${dbHost}:6333`,
    result.ok ? 'Qdrant returns nearest resume chunks' : result.message,
    result.ok ? 'API builds grounded answer from retrieved context' : 'Request fails before generation',
  ]

  return (
    <div className="dk-page">
      <p className="dk-sim-tag">Browser simulation</p>
      <h1>Compose network explorer</h1>
      <p className="dk-muted">
        Follow a request from the browser to FastAPI to the vector database. Break hostname or
        readiness on purpose and diagnose the result.
      </p>

      <div className="dk-card" style={{ marginTop: '1rem' }}>
        <p className="dk-kicker">Fault injection</p>
        <div className="dk-row">
          <button
            type="button"
            className={dbHost === 'qdrant' ? 'dk-btn' : 'dk-btn soft'}
            onClick={() => {
              setDbHost('qdrant')
              setStep(0)
            }}
          >
            QDRANT_URL=http://qdrant:6333
          </button>
          <button
            type="button"
            className={dbHost === 'localhost' ? 'dk-btn' : 'dk-btn soft'}
            onClick={() => {
              setDbHost('localhost')
              setStep(0)
            }}
          >
            Wrong: localhost:6333
          </button>
          <button
            type="button"
            className={ready ? 'dk-btn soft' : 'dk-btn'}
            onClick={() => {
              setReady((r) => !r)
              setStep(0)
            }}
          >
            {ready ? 'Mark Qdrant not ready' : 'Qdrant ready'}
          </button>
        </div>
      </div>

      <div className="dk-flow" style={{ marginTop: '0.85rem' }}>
        <div className="dk-flow-head">
          <h3>Trace the request</h3>
          <div className="dk-flow-controls">
            <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Previous
            </button>
            <span>
              {step + 1}/{steps.length}
            </span>
            <button type="button" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>
              Next
            </button>
          </div>
        </div>
        <div className="dk-flow-nodes">
          {['Browser', 'Host :8000', 'FastAPI', 'Vector DB', 'Answer'].map((label, i) => (
            <button
              key={label}
              type="button"
              className={i === step ? 'dk-node active' : 'dk-node'}
              onClick={() => setStep(i)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="dk-flow-detail">
          <strong>Step {step + 1}</strong>
          <p>{steps[step]}</p>
        </div>
        <p className={result.ok ? 'dk-ok' : 'dk-bad'} style={{ marginTop: '0.75rem' }}>
          Outcome: {result.message}
        </p>
      </div>

      <div className="dk-lesson-nav">
        <Link to="/docker/m5/compose-fastapi-qdrant">Back to lesson</Link>
        <Link to="/docker/labs/debug-lab">Next lab →</Link>
      </div>
    </div>
  )
}
