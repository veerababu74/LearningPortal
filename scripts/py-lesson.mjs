/**
 * Teaching scripts → markdown lessons (shared by parse-ml and parse-system).
 *   pyToMd(code, rel, images)  module docstring → intro; code split at STEP banners or top-level defs;
 *                              figures saved with savefig() embedded after the code that draws them
 *   unprintFences(md)          print("""…""") prose inside python fences → real markdown
 */
import path from 'node:path'
import { cleanTitle, splitPython } from './course-kit.mjs'

export const humanFig = (file) =>
  path
    .basename(file)
    .replace(/\.(png|jpe?g)$/i, '')
    .replace(/^example\d+_/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

/**
 * A teaching script → markdown lesson. Module docstring becomes the intro; the code is split at
 * boxed "STEP N" banners when present, otherwise at top-level functions/classes. Figures the code
 * saves with savefig('x.png') are embedded right after the code that draws them.
 */
export function pyToMd(code, fileRel, images = { files: {} }) {
  const src = code.replace(/\r\n?/g, '\n')
  const dir = path.posix.dirname(fileRel)
  const fig = (unitCode) =>
    [...unitCode.matchAll(/savefig\(\s*['"]([^'"]+\.(?:png|jpe?g))['"]/g)]
      .map((m) => {
        const url = images.files[path.posix.normalize(path.posix.join(dir, m[1]))]
        return url ? `![${humanFig(m[1])}](${url})` : ''
      })
      .filter(Boolean)
      .join('\n\n')

  const doc = src.match(/^\s*(?:#.*\n)*\s*("""|''')([\s\S]*?)\1/)
  const intro = doc
    ? doc[2]
        .replace(/^[=─━-]{6,}$/gm, '')
        .split('\n')
        .map((l) => l.replace(/^\s{0,2}/, ''))
        .join('\n')
        .trim()
    : ''
  const body = doc ? src.slice(src.indexOf(doc[0]) + doc[0].length) : src

  // boxed banners:  # ║ STEP 3: EXPLORATORY DATA ANALYSIS ║   or   # ===== STEP 3 … =====
  const lines = body.split('\n')
  const steps = []
  lines.forEach((l, i) => {
    const m = l.match(/^#\s*[║|]?\s*((?:STEP|PART|SECTION|EXAMPLE|EXERCISE)\s*\d+[^║|]*?)\s*[║|]?\s*$/i)
    if (m && !/^#\s*[╔╚═]/.test(l)) steps.push({ i, title: cleanTitle(m[1]) })
  })
  const out = []
  if (intro) out.push(introToMd(intro))
  if (steps.length >= 3) {
    const pre = lines.slice(0, steps[0].i).join('\n').replace(/^#\s*[╔╚║═].*$/gm, '').trim()
    if (pre) out.push(`## Setup\n\n\`\`\`python\n${pre}\n\`\`\``)
    steps.forEach((s, k) => {
      const chunk = lines
        .slice(s.i + 1, k + 1 < steps.length ? steps[k + 1].i : lines.length)
        .join('\n')
        .replace(/^#\s*[╔╚║═].*$/gm, '')
        .trim()
      if (!chunk) return
      const title = s.title.replace(/\b([A-Z])([A-Z]+)\b/g, (w, a, b) => a + b.toLowerCase())
      out.push(`## ${title}\n\n\`\`\`python\n${chunk}\n\`\`\`${fig(chunk) ? `\n\n${fig(chunk)}` : ''}`)
    })
  } else {
    for (const u of splitPython(body)) {
      if (!u.code.trim()) continue
      const d = u.doc && u.title !== 'Overview' ? `${u.doc}\n\n` : ''
      out.push(`## ${u.title === 'Overview' ? 'Setup' : u.title}\n\n${d}\`\`\`python\n${u.code}\n\`\`\`${fig(u.code) ? `\n\n${fig(u.code)}` : ''}`)
    }
  }
  return out.join('\n\n')
}

/* ------------------------------------------------- print("""…""") lessons */

const CODEISH = /^(import |from \S+ import|def |class |return\b|for |if |while |with |@|#|[\w.\[\]]+\s*(=|\+=)\s*\S|[\w.]+\(.*\)\s*$|print\(|\)|\]|\})/

/** Text printed by a teaching script → markdown (headings, lists, small code blocks). */
export function printedToMd(text) {
  const lines = text.replace(/\t/g, '    ').split('\n')
  const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length), 99)
  const out = []
  let code = []
  const flush = () => {
    if (code.length) out.push('```python', ...code, '```')
    code = []
  }
  for (const raw of lines) {
    const l = raw.slice(Math.min(ind, raw.match(/^ */)[0].length))
    const t = l.trim()
    const deep = l.match(/^ */)[0].length >= 3
    if (t && deep && CODEISH.test(t) && !/^[•▸➜→✓✗✅❌⚠️-]/u.test(t)) {
      code.push(l.replace(/^ {3}/, ''))
      continue
    }
    flush()
    if (!t || /^[=─━*-]{5,}$/.test(t)) {
      out.push('')
      continue
    }
    const topic = t.match(/^[^\w(]*\s*(TOPICS?\s+\d+(?:\s*[-–]\s*\d+)?|STEP\s+\d+|PART\s+\d+)\s*[:.—–-]\s*(.+)$/i)
    if (topic) {
      const name = topic[2].replace(/[:\s]+$/, '')
      out.push('', `## ${topic[1].replace(/\b\w+/, (w) => w[0] + w.slice(1).toLowerCase())}: ${capsToTitle(name)}`, '')
      continue
    }
    const num = t.match(/^(\d)️?⃣\s*(.+)$/u)
    if (num) {
      out.push('', `**${num[1]}. ${num[2]}**`)
      continue
    }
    if (/^[•▸➜→-]\s+/u.test(t)) {
      out.push(`- ${t.replace(/^[•▸➜→-]\s+/u, '')}`)
      continue
    }
    if (/^[A-Z][A-Za-z0-9 ,'&/()+-]{2,60}:$/.test(t) && !/[.!?]\s/.test(t)) {
      out.push('', `**${capsToTitle(t.slice(0, -1))}:**`)
      continue
    }
    out.push(t)
  }
  flush()
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function capsToTitle(s) {
  const letters = s.replace(/[^A-Za-z]/g, '')
  if (letters.length < 4 || letters !== letters.toUpperCase()) return s
  return s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (m, a, b) => a + b.toUpperCase())
    .replace(/\b(Ml|Ai|Api|Gpu|Cpu|Onnx|Rest|Cnn|Rnn|Lstm|Gru|Nlp|Llm|Bert|Gpt|Sql|Ci|Cd|Mlops|Lora|Peft|Rag)\b/g, (w) => w.toUpperCase())
}

/**
 * Inside ```python fences that are mostly print("""…""") prose, turn the printed text into
 * markdown and keep the real code as smaller code blocks. Other fences are untouched.
 */
export function unprintFences(md) {
  return md.replace(/```python\n([\s\S]*?)```/g, (whole, body) => {
    const prints = body.match(/print\(\s*f?("""|''')[\s\S]*?\1\s*\)/g) || []
    const proseLen = prints.reduce((n, p) => n + p.length, 0)
    // mostly prose (2+ prints, ≥40%) or a long mixed lesson (3+ prints, ≥20%) — short demos stay untouched
    if (!((prints.length >= 2 && proseLen >= body.length * 0.4) || (prints.length >= 3 && proseLen >= body.length * 0.2))) return whole
    const out = []
    let code = []
    const flushCode = () => {
      const c = code.join('\n').trim()
      if (c && !/^(import \S+|from \S+ import .+|\s)*$/.test(c)) out.push('```python\n' + c + '\n```')
      else if (c) out.push('```python\n' + c + '\n```')
      code = []
    }
    const lines = body.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      const start = l.match(/^\s*print\(\s*f?("""|''')(.*)$/)
      if (start) {
        const q = start[1]
        let text = start[2]
        let closed = text.includes(q)
        if (closed) text = text.slice(0, text.indexOf(q))
        else {
          const buf = [text]
          while (++i < lines.length) {
            const k = lines[i].indexOf(q)
            if (k >= 0) {
              buf.push(lines[i].slice(0, k))
              break
            }
            buf.push(lines[i])
          }
          text = buf.join('\n')
        }
        flushCode()
        out.push(printedToMd(text))
        continue
      }
      // decorative prints
      if (/^\s*print\(\s*(["']\s*[=\-─*]+\s*["']\s*\*\s*\d+|["']\\n["']\s*\+\s*["'][=\-─]+["']\s*\*\s*\d+|\))?\s*\)\s*$/.test(l)) continue
      code.push(l)
    }
    flushCode()
    return out.join('\n\n')
  })
}

/** Docstring banner text ("WHAT YOU'LL LEARN:\n  - …") → readable markdown. */
export function introToMd(text) {
  return text
    .split('\n')
    .map((l) => {
      const t = l.trim()
      if (!t) return ''
      const head = t.match(/^([A-Z][A-Z0-9 '&/()-]{3,}):\s*(.*)$/)
      if (head) return `\n**${head[1].charAt(0) + head[1].slice(1).toLowerCase()}:** ${head[2]}`.trimEnd()
      if (/^[-•*]\s+/.test(t)) return `- ${t.replace(/^[-•*]\s+/, '')}`
      if (/^\d+[.)]\s+/.test(t)) return t
      return t
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
