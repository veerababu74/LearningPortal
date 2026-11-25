import { useEffect, useId, useRef, useState } from 'react'
import mermaid from 'mermaid'
import './MermaidDiagram.css'

let mermaidReady = false

function ensureMermaid() {
  if (mermaidReady) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base',
    themeVariables: {
      primaryColor: '#1e3a8a',
      primaryTextColor: '#f8fafc',
      primaryBorderColor: '#93c5fd',
      lineColor: '#f97316',
      secondaryColor: '#122447',
      tertiaryColor: '#eff6ff',
      background: '#0b1220',
      mainBkg: '#1d4ed8',
      nodeBorder: '#93c5fd',
      clusterBkg: '#122447',
      titleColor: '#f8fafc',
      edgeLabelBackground: '#0b1220',
      fontFamily: 'Source Sans 3, sans-serif',
    },
    flowchart: { curve: 'basis', htmlLabels: true },
  })
  mermaidReady = true
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const reactId = useId().replace(/:/g, '')
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function render() {
      const source = chart.trim()
      if (!source) return
      try {
        ensureMermaid()
        const id = `mermaid-${reactId}-${Math.abs(hash(source))}`
        const { svg } = await mermaid.render(id, source)
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram')
        }
      }
    }
    void render()
    return () => {
      cancelled = true
    }
  }, [chart, reactId])

  if (error) {
    return (
      <div className="mermaid-fallback">
        <p className="mermaid-error">Diagram could not render. Showing source:</p>
        <pre>{chart}</pre>
      </div>
    )
  }

  return <div className="mermaid-wrap" ref={ref} />
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
