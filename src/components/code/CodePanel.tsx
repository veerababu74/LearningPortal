import { useMemo, useState } from 'react'
import type { CodeSnippet, FrameworkTag } from '@/types/curriculum'
import { PythonHighlight } from './PythonHighlight'
import './CodePanel.css'

const LABELS: Record<FrameworkTag, string> = {
  plain: 'Plain Python',
  langchain: 'LangChain',
  langgraph: 'LangGraph',
  adk: 'Google ADK',
  pydantic: 'Pydantic',
  sql: 'SQL',
}

export function CodePanel({ snippets }: { snippets: CodeSnippet[] }) {
  const frameworks = useMemo(() => {
    const order: FrameworkTag[] = ['plain', 'langchain', 'langgraph', 'adk', 'pydantic', 'sql']
    return order.filter((f) => snippets.some((s) => s.framework === f))
  }, [snippets])

  const [framework, setFramework] = useState<FrameworkTag>(frameworks[0] || 'plain')
  const [idx, setIdx] = useState(0)
  const [copied, setCopied] = useState(false)

  const visible = snippets.filter((s) => s.framework === framework)
  const active = visible[Math.min(idx, Math.max(visible.length - 1, 0))] || snippets[0]

  if (!snippets.length) return null

  async function copy() {
    if (!active) return
    await navigator.clipboard.writeText(active.code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  const isPython = !active?.language || active.language === 'python'

  return (
    <div className="code-panel">
      <div className="code-head">
        <div>
          <p className="code-kicker">Code snippets</p>
          <h3>{active?.title || 'Python example'}</h3>
        </div>
        <button type="button" className="copy-btn" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {frameworks.length > 1 ? (
        <div className="framework-tabs" role="tablist">
          {frameworks.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={framework === f}
              className={framework === f ? 'tab active' : 'tab'}
              onClick={() => {
                setFramework(f)
                setIdx(0)
              }}
            >
              {LABELS[f]}
            </button>
          ))}
        </div>
      ) : null}
      {visible.length > 1 ? (
        <div className="framework-tabs snippet-tabs">
          {visible.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={i === idx ? 'tab active' : 'tab'}
              onClick={() => setIdx(i)}
            >
              {s.title}
            </button>
          ))}
        </div>
      ) : null}
      <pre className="code-body">
        {isPython ? <PythonHighlight code={active.code} /> : <code>{active.code}</code>}
      </pre>
      <div className="code-legend" aria-hidden>
        <span className="tok-keyword">keyword</span>
        <span className="tok-builtin">builtin</span>
        <span className="tok-string">string</span>
        <span className="tok-number">number</span>
        <span className="tok-comment">comment</span>
        <span className="tok-class">Class</span>
        <span className="tok-ident">variable</span>
      </div>
    </div>
  )
}
