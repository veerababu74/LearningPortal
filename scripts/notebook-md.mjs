/**
 * Jupyter notebook → markdown (shared by the course parsers).
 */
import path from 'node:path'
import { headingsOf } from './course-kit.mjs'

/* --------------------------------------------------------------- notebooks */

export function htmlToMd(src) {
  let s = String(src)
  if (!/<(div|span|h[1-6]|p|table|br|b|strong|code)\b/i.test(s)) return s
  s = s
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, '\n#### $1\n')
    .replace(/<(b|strong)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(i|em)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(div|p|li|tr|ul|ol|table)>/gi, '\n')
    .replace(/<\/(td|th)>/gi, ' · ')
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, ' $1 ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
  return s
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^✓\s*/gm, '- ')
}

function cellText(src) {
  return Array.isArray(src) ? src.join('') : String(src || '')
}

function outputText(outputs = []) {
  const parts = []
  for (const o of outputs) {
    if (o.output_type === 'stream') parts.push(cellText(o.text))
    else if (o.data?.['text/plain'] && !o.data['image/png']) parts.push(cellText(o.data['text/plain']))
    else if (o.output_type === 'error') parts.push(`${o.ename}: ${o.evalue}`)
  }
  let t = parts.join('\n').replace(/\x1b\[[0-9;]*m/g, '').trim()
  if (!t) return ''
  if (t.length > 1500) t = `${t.slice(0, 1500)}\n… (output truncated)`
  return t
}

/**
 * Notebook → markdown. Returns { md, title } (title from the banner H1 when present).
 * `opts.image(base64Text)` may return a URL for an image/png output; it is embedded after the cell.
 */
export function notebookToMd(raw, file, opts = {}) {
  let nb
  try {
    nb = JSON.parse(raw)
  } catch {
    return null
  }
  const lang = nb.metadata?.kernelspec?.language || 'python'
  const out = []
  let title = ''
  for (const cell of nb.cells || []) {
    const src = cellText(cell.source)
    if (!src.trim()) continue
    if (cell.cell_type === 'markdown') {
      const md = htmlToMd(src)
      if (!title) {
        const h1 = headingsOf(md, 1)[0]
        if (h1) title = h1.title
      }
      out.push(md.trim())
    } else if (cell.cell_type === 'code') {
      const fence = /^\s*[!%]/.test(src) && !/\n\s*[^!%\s]/.test(src) ? 'bash' : lang
      out.push(`\`\`\`${fence}\n${src.replace(/^\s*[!%]+/gm, '').trimEnd()}\n\`\`\``)
      const o = outputText(cell.outputs)
      if (o) out.push(`**Output**\n\n\`\`\`text\n${o.replace(/```/g, "'''")}\n\`\`\``)
      if (opts.image) {
        for (const output of cell.outputs || []) {
          const png = output.data?.['image/png']
          if (!png) continue
          const url = opts.image(cellText(png))
          if (url) out.push(`![Plot produced by the cell above](${url})`)
        }
      }
    }
  }
  return { md: out.join('\n\n'), title: title || path.basename(file, '.ipynb') }
}

