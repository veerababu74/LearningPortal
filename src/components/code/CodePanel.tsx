import { useMemo, useState } from 'react'
import type { CodeSnippet, FrameworkTag } from '@/types/curriculum'
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
  const [copied, setCopied] = useState(false)

  const visible = snippets.filter((s) => s.framework === framework)
  const active = visible[0] || snippets[0]

  if (!snippets.length) return null

  async function copy() {
    if (!active) return
    await navigator.clipboard.writeText(active.code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

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
              onClick={() => setFramework(f)}
            >
              {LABELS[f]}
            </button>
          ))}
        </div>
      ) : null}
      <pre className="code-body">
        <code>{active?.code}</code>
      </pre>
    </div>
  )
}
