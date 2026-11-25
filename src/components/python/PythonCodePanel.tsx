import { useState } from 'react'
import type { PyCodeSnippet } from '@/content/python/types'
import { PythonHighlight } from '@/components/code/PythonHighlight'
import './python.css'

type Props = {
  snippets: PyCodeSnippet[]
  highlightLines?: number[]
}

export function PythonCodePanel({ snippets }: Props) {
  const [idx, setIdx] = useState(0)
  const [copied, setCopied] = useState(false)
  const current = snippets[idx] || snippets[0]

  if (!snippets.length) return null

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="py-card">
      <div className="py-code-tabs">
        {snippets.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={i === idx ? 'py-btn' : 'py-btn soft'}
            onClick={() => setIdx(i)}
          >
            {s.title}
          </button>
        ))}
        <button type="button" className="py-btn soft" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="py-pre">
        <PythonHighlight code={current.code} />
      </pre>
      {current.notes?.length ? (
        <ul>
          {current.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
