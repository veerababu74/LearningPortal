import { Fragment, useMemo, type ReactNode } from 'react'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { MermaidDiagram } from '@/components/visuals/MermaidDiagram'
import { CodeHighlight, resolveHighlightLang } from '@/components/code/CodeHighlight'
import 'katex/dist/katex.min.css'
import './MarkdownBody.css'

type Segment =
  | { type: 'markdown'; text: string }
  | { type: 'mermaid'; chart: string }
  | { type: 'svg'; markup: string }

function splitContent(raw: string): Segment[] {
  const src = String(raw || '').replace(/\r\n/g, '\n')
  const svgs: string[] = []
  const withPlaceholders = src.replace(/```svg\s*\n([\s\S]*?)```/gi, (_m, body) => {
    const idx = svgs.length
    svgs.push(body.trim())
    return `\n\n@@SVG_BLOCK_${idx}@@\n\n`
  })
  const text = normalizeContent(withPlaceholders)
  const segments: Segment[] = []
  const re = /(```mermaid\s*\n([\s\S]*?)```|@@SVG_BLOCK_(\d+)@@)/gi
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) {
      segments.push({ type: 'markdown', text: text.slice(last, m.index) })
    }
    if (m[3] !== undefined) {
      segments.push({ type: 'svg', markup: svgs[Number(m[3])] || '' })
    } else {
      segments.push({ type: 'mermaid', chart: (m[2] || '').trim() })
    }
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ type: 'markdown', text: text.slice(last) })
  if (!segments.length) segments.push({ type: 'markdown', text })
  return segments.filter((s) =>
    s.type === 'markdown' ? s.text.trim().length > 0 : (s.type === 'mermaid' ? s.chart : s.markup).length > 0,
  )
}

function sanitizeSvg(raw: string): string | null {
  const trimmed = raw
    .trim()
    // Escape bare ampersands in SVG text nodes without touching valid XML entities
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
  if (!/^<svg\b/i.test(trimmed) || !/<\/svg>\s*$/i.test(trimmed)) return null
  if (typeof DOMParser === 'undefined') return null
  try {
    const doc = new DOMParser().parseFromString(trimmed, 'image/svg+xml')
    const root = doc.documentElement
    if (!root || root.tagName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return null
    for (const bad of Array.from(root.querySelectorAll('script, foreignObject, iframe, object, embed'))) {
      bad.remove()
    }
    const all = [root, ...Array.from(root.querySelectorAll('*'))]
    for (const el of all) {
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase()
        const val = attr.value.trim().toLowerCase()
        if (name.startsWith('on') || val.startsWith('javascript:') || val.startsWith('data:text/html')) {
          el.removeAttribute(attr.name)
        }
      }
    }
    root.removeAttribute('height')
    root.setAttribute('width', '100%')
    return root.outerHTML
  } catch {
    return null
  }
}

function SvgDiagram({ markup }: { markup: string }) {
  const safe = useMemo(() => sanitizeSvg(markup), [markup])
  if (!safe) {
    return (
      <pre className="md-code-block md-plain">
        <code>{markup}</code>
      </pre>
    )
  }
  return (
    <figure className="md-svg-figure">
      <p className="diagram-label">Visual diagram</p>
      <div className="md-svg-diagram" dangerouslySetInnerHTML={{ __html: safe }} />
    </figure>
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

const PLAIN_LANGS = new Set(['text', 'txt', 'plaintext', 'ascii', 'diagram', 'none', 'output', 'console'])

/** Box-drawing / arrow art used for hand-drawn diagrams in the source notes. */
function isAsciiArt(text: string) {
  if (/[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╭╮╰╯▶►▼▲◀]/.test(text)) return true
  return /(-{3,}>|={3,}>|\+-{3,}\+|\|\s{3,}\|)/.test(text) && !/\b(def|import|return|print|const|let|function|interface|async)\b/.test(text)
}

const components: Components = {
  // Fenced blocks arrive here (react-markdown wraps them in <pre><code>); inline code goes to `code`.
  pre({ children }) {
    const child = (Array.isArray(children) ? children[0] : children) as
      | { props?: { className?: string; children?: ReactNode } }
      | undefined
    const className = String(child?.props?.className || '')
    const text = getText(child?.props?.children).replace(/\n$/, '')
    const lang = /language-([\w+-]+)/.exec(className)?.[1]?.toLowerCase()
    if (lang === 'mermaid') return <MermaidDiagram chart={text} />
    if (lang === 'svg') return <SvgDiagram markup={text} />
    if ((!lang || PLAIN_LANGS.has(lang)) && isAsciiArt(text)) {
      return (
        <pre className="md-code-block md-ascii">
          <code>{text}</code>
        </pre>
      )
    }
    const hl = resolveHighlightLang(lang || 'python')
    if (hl !== 'plain') {
      return (
        <pre className={`md-code-block language-${lang || 'python'}`}>
          <CodeHighlight code={text} language={lang || 'python'} />
        </pre>
      )
    }
    return (
      <pre className={`md-code-block md-plain language-${lang || 'text'}`}>
        <code>{text}</code>
      </pre>
    )
  },
  code({ className, children, ...props }) {
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
            <p className="diagram-label">Diagram</p>
            <MermaidDiagram chart={seg.chart} />
          </Fragment>
        ) : seg.type === 'svg' ? (
          <SvgDiagram key={`s-${i}`} markup={seg.markup} />
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
