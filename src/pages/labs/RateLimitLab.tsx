import { useEffect, useState } from 'react'
import './LabShared.css'

export function RateLimitLab() {
  const capacity = 10
  const refillPerTick = 1
  const [tokens, setTokens] = useState(capacity)
  const [log, setLog] = useState<string[]>([])
  const [cost, setCost] = useState(3)

  useEffect(() => {
    const id = window.setInterval(() => {
      setTokens((t) => Math.min(capacity, t + refillPerTick))
    }, 900)
    return () => window.clearInterval(id)
  }, [])

  function request() {
    setTokens((t) => {
      if (t >= cost) {
        setLog((l) => [`ALLOWED (−${cost} tokens)`, ...l].slice(0, 8))
        return t - cost
      }
      setLog((l) => [`REJECTED 429 — need ${cost}, have ${t}`, ...l].slice(0, 8))
      return t
    })
  }

  return (
    <div className="lab">
      <h1>Token bucket rate limit</h1>
      <p className="lede">
        Gateways admit requests only when enough tokens remain. Tokens refill over time — the core of
        RPM/TPM style protection.
      </p>
      <div className="lab-panel">
        <div className="lab-controls">
          <label>
            Request cost: {cost} tokens
            <input
              type="range"
              min={1}
              max={8}
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
            />
          </label>
          <button type="button" className="btn solid" onClick={request}>
            Send request
          </button>
        </div>
        <div className="viz-box" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
          <div>
            <div className="bucket">
              <div className="bucket-fill" style={{ height: `${(tokens / capacity) * 100}%` }} />
            </div>
            <strong>
              {tokens}/{capacity} tokens
            </strong>
          </div>
          <div>
            {log.map((line, i) => (
              <div key={`${line}-${i}`}>{line}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
