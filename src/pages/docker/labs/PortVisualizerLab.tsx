import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '@/components/docker/docker.css'

export function PortVisualizerLab() {
  const [hostPort, setHostPort] = useState(8000)
  const [containerPort, setContainerPort] = useState(8000)
  const [bind, setBind] = useState<'0.0.0.0' | '127.0.0.1'>('0.0.0.0')
  const [predicted, setPredicted] = useState<'ok' | 'fail' | null>(null)
  const [revealed, setRevealed] = useState(false)

  const success = bind === '0.0.0.0' && containerPort === 8000

  const path = useMemo(
    () => [
      `Browser → http://localhost:${hostPort}/health`,
      `Host publishes ${hostPort} → container ${containerPort}`,
      `Uvicorn listens on ${bind}:8000 inside the container`,
      success
        ? 'Request reaches FastAPI → {"status":"ok"}'
        : bind === '127.0.0.1'
          ? 'Published traffic hits the container NIC, but the app only accepts loopback → connection fails'
          : `Mapping targets ${containerPort}, but the app listens on 8000 → nothing answers`,
    ],
    [hostPort, containerPort, bind, success],
  )

  return (
    <div className="dk-page">
      <p className="dk-sim-tag">Browser simulation</p>
      <h1>Port mapping visualizer</h1>
      <p className="dk-muted">
        The FastAPI process always listens on container port <strong>8000</strong>. Change the publish
        mapping and bind address, predict the result, then reveal the path.
      </p>

      <div className="dk-card" style={{ marginTop: '1rem' }}>
        <label>
          Host port (−p left side): {hostPort}
          <input
            type="range"
            min={8000}
            max={8010}
            value={hostPort}
            onChange={(e) => {
              setHostPort(Number(e.target.value))
              setRevealed(false)
              setPredicted(null)
            }}
            style={{ width: '100%' }}
          />
        </label>
        <label style={{ display: 'block', marginTop: '0.75rem' }}>
          Container port (−p right side): {containerPort}
          <input
            type="range"
            min={8000}
            max={8010}
            value={containerPort}
            onChange={(e) => {
              setContainerPort(Number(e.target.value))
              setRevealed(false)
              setPredicted(null)
            }}
            style={{ width: '100%' }}
          />
        </label>
        <div className="dk-row" style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className={bind === '0.0.0.0' ? 'dk-btn' : 'dk-btn soft'}
            onClick={() => {
              setBind('0.0.0.0')
              setRevealed(false)
              setPredicted(null)
            }}
          >
            Bind 0.0.0.0
          </button>
          <button
            type="button"
            className={bind === '127.0.0.1' ? 'dk-btn' : 'dk-btn soft'}
            onClick={() => {
              setBind('127.0.0.1')
              setRevealed(false)
              setPredicted(null)
            }}
          >
            Bind 127.0.0.1
          </button>
        </div>
        <pre className="dk-pre">{`docker run --rm -p ${hostPort}:${containerPort} resume-api:dev
# CMD uses --host ${bind} --port 8000`}</pre>
      </div>

      <div className="dk-card">
        <p className="dk-kicker">Predict</p>
        <p>Will <code>curl http://localhost:{hostPort}/health</code> succeed?</p>
        <div className="dk-row">
          <button type="button" className="dk-btn soft" onClick={() => setPredicted('ok')}>
            Yes
          </button>
          <button type="button" className="dk-btn soft" onClick={() => setPredicted('fail')}>
            No
          </button>
          <button
            type="button"
            className="dk-btn"
            disabled={!predicted}
            onClick={() => setRevealed(true)}
          >
            Reveal path
          </button>
        </div>
        {predicted && revealed ? (
          <p className={predicted === (success ? 'ok' : 'fail') ? 'dk-ok' : 'dk-bad'}>
            Your prediction was {predicted === (success ? 'ok' : 'fail') ? 'correct' : 'incorrect'}.
            Actual result: {success ? 'success' : 'failure'}.
          </p>
        ) : null}
      </div>

      {revealed ? (
        <div className="dk-flow">
          <h3>Request path</h3>
          <div className="dk-flow-nodes">
            {path.map((step, i) => (
              <div key={step} className="dk-node active" style={{ maxWidth: '100%' }}>
                {i + 1}. {step}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="dk-lesson-nav">
        <Link to="/docker/m1/works-on-my-laptop">Back to lesson</Link>
        <Link to="/docker/labs/storage-lab">Next lab →</Link>
      </div>
    </div>
  )
}
