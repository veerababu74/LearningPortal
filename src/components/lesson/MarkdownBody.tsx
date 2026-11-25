import { Fragment, type ReactNode } from 'react'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { MermaidDiagram } from '@/components/visuals/MermaidDiagram'
import 'katex/dist/katex.min.css'
import './MarkdownBody.css'

type Segment =
  | { type: 'markdown'; text: string }
  | { type: 'mermaid'; chart: string }

function splitContent(raw: string): Segment[] {
  const text = normalizeContent(raw)
  const segments: Segment[] = []
  const re = /```mermaid\s*\n([\s\S]*?)```/gi
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) {
      segments.push({ type: 'markdown', text: text.slice(last, m.index) })
    }
    segments.push({ type: 'mermaid', chart: m[1].trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ type: 'markdown', text: text.slice(last) })
  if (!segments.length) segments.push({ type: 'markdown', text })
  return segments.filter((s) =>
    s.type === 'markdown' ? s.text.trim().length > 0 : s.chart.length > 0,
  )
}

function getText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getText).join('')
  if (typeof node === 'object' && node !== null && 'props' in node) {
    return getText((node as { props?: { children?: ReactNode } }).props?.children)
  }
  return ''
}

const components: Components = {
  code({ className, children, ...props }) {
    const text = getText(children).replace(/\n$/, '')
    const lang = /language-(\w+)/.exec(className || '')?.[1]
    if (lang === 'mermaid') return <MermaidDiagram chart={text} />
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
}

export function MarkdownBody({ content }: { content: string }) {
  const segments = splitContent(content)

  if (!segments.length) {
    return (
      <div className="md-body md-empty">
        <p>
          This section has no detailed text in the source roadmap yet. Use the flow diagram above and
          continue to the next section.
        </p>
      </div>
    )
  }

  return (
    <div className="md-body">
      {segments.map((seg, i) =>
        seg.type === 'mermaid' ? (
          <Fragment key={`m-${i}`}>
            <p className="diagram-label">Mermaid flow diagram</p>
            <MermaidDiagram chart={seg.chart} />
          </Fragment>
        ) : (
          <ReactMarkdown
            key={`t-${i}`}
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={components}
          >
            {seg.text}
          </ReactMarkdown>
        ),
      )}
    </div>
  )
}

function normalizeContent(raw: string) {
  let text = String(raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/^\s*---\s*$/gm, '')
    .replace(/\\:/g, ':')
    .replace(/&amp;/g, '&')

  // Convert common ChatGPT/export math wrappers to KaTeX-friendly forms
  text = text
    .replace(/\\\(\s*/g, '$')
    .replace(/\s*\\\)/g, '$')
    .replace(/\\\[\s*/g, '$$')
    .replace(/\s*\\\]/g, '$$')

  // Repair unfenced mermaid left over from export cleanup
  text = text.replace(
    /(^|\n)mermaid\s+(flowchart|sequenceDiagram|stateDiagram(?:-v2)?|classDiagram|erDiagram|gantt|pie)([\s\S]*?)(?=\n#{1,4}\s|\n```|\n\*\*[A-Z]|$)/g,
    (_full, lead, kind, rest) => `${lead}\`\`\`mermaid\n${kind}${rest}\n\`\`\`\n`,
  )

  return text.trim()
}
