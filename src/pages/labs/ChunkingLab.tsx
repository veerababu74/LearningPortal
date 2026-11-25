import { useMemo, useState } from 'react'
import './LabShared.css'

const SAMPLE = `Retrieval-Augmented Generation connects an LLM to external knowledge. Documents are loaded, cleaned, chunked, embedded, and indexed. At query time, relevant chunks are retrieved and passed into the prompt so answers stay grounded in evidence.`

export function ChunkingLab() {
  const [size, setSize] = useState(60)
  const [overlap, setOverlap] = useState(15)

  const chunks = useMemo(() => {
    const out: string[] = []
    let i = 0
    const step = Math.max(1, size - overlap)
    while (i < SAMPLE.length) {
      out.push(SAMPLE.slice(i, i + size))
      i += step
      if (out.length > 40) break
    }
    return out
  }, [size, overlap])

  return (
    <div className="lab">
      <h1>Chunking simulator</h1>
      <p className="lede">
        Adjust chunk size and overlap. Overlap preserves boundary context but increases storage and
        duplicate risk.
      </p>
      <div className="lab-panel">
        <div className="lab-controls">
          <label>
            Chunk size: {size} chars
            <input
              type="range"
              min={20}
              max={160}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </label>
          <label>
            Overlap: {overlap} chars
            <input
              type="range"
              min={0}
              max={Math.min(80, size - 1)}
              value={overlap}
              onChange={(e) => setOverlap(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="viz-box">
          <p style={{ marginTop: 0 }}>
            {chunks.length} chunks · step {Math.max(1, size - overlap)}
          </p>
          {chunks.map((c, i) => (
            <span key={`${i}-${c.slice(0, 8)}`} className="chunk">
              #{i + 1} {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
