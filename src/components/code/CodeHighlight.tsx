type Tok = { type: string; value: string }

export type HighlightLang = 'python' | 'ts' | 'json' | 'http' | 'gherkin' | 'bash' | 'sql' | 'yaml' | 'plain'

const PY_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
  'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import',
  'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with',
  'yield', 'match', 'case',
])

const PY_BUILTINS = new Set([
  'print', 'len', 'range', 'type', 'id', 'isinstance', 'issubclass', 'list', 'dict', 'set', 'tuple',
  'str', 'int', 'float', 'bool', 'open', 'enumerate', 'zip', 'map', 'filter', 'sum', 'min', 'max',
  'sorted', 'reversed', 'any', 'all', 'super', 'property', 'staticmethod', 'classmethod',
  'Exception', 'ValueError', 'TypeError', 'KeyError', 'AttributeError',
])

const TS_KEYWORDS = new Set([
  'abstract', 'any', 'as', 'async', 'await', 'boolean', 'break', 'case', 'catch', 'class', 'const',
  'continue', 'declare', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false',
  'finally', 'for', 'from', 'function', 'if', 'implements', 'import', 'in', 'infer', 'instanceof',
  'interface', 'is', 'keyof', 'let', 'never', 'new', 'null', 'number', 'object', 'of', 'private',
  'protected', 'public', 'readonly', 'return', 'satisfies', 'static', 'string', 'super', 'switch',
  'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined', 'unknown', 'var', 'void', 'while',
  'yield',
])

const TS_BUILTINS = new Set([
  'console', 'Promise', 'Array', 'Object', 'Map', 'Set', 'Record', 'Partial', 'Required', 'Readonly',
  'Pick', 'Omit', 'ReturnType', 'Parameters', 'Awaited', 'Exclude', 'Extract', 'NonNullable',
  'fetch', 'AbortController', 'Response', 'Request', 'Headers', 'URL', 'JSON', 'Math', 'Date', 'Error',
  'z', 'expect', 'test', 'describe', 'page', 'browser', 'context', 'request',
])

const GHERKIN_KEYWORDS = new Set([
  'Feature', 'Rule', 'Background', 'Scenario', 'Outline', 'Examples', 'Given', 'When', 'Then', 'And', 'But',
])

const HTTP_KEYWORDS = new Set([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'HTTP', 'Authorization', 'Bearer',
  'Content-Type', 'Accept', 'Cache-Control', 'ETag', 'If-Match', 'If-None-Match', 'Retry-After',
  'Idempotency-Key', 'Host', 'Origin', 'Cookie', 'Set-Cookie',
])

const BASH_KEYWORDS = new Set([
  'docker', 'npx', 'npm', 'pip', 'pytest', 'uvicorn', 'gunicorn', 'curl', 'git', 'export', 'cd', 'ls',
  'mkdir', 'rm', 'echo', 'python', 'python3', 'node', 'playwright', 'behave', 'celery', 'compose',
  'up', 'down', 'build', 'run', 'exec', 'test', 'install',
])

const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'JOIN', 'LEFT',
  'RIGHT', 'INNER', 'ON', 'AS', 'AND', 'OR', 'NOT', 'IN', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT',
  'OFFSET', 'CREATE', 'TABLE', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'NULL', 'BEGIN',
  'COMMIT', 'ROLLBACK', 'RETURNING', 'WITH', 'DISTINCT', 'COUNT', 'SUM',
])

export function resolveHighlightLang(raw?: string): HighlightLang {
  const l = String(raw || '').trim().toLowerCase()
  if (!l || ['python', 'py', 'python3', 'pycon', 'ipython', 'fastapi', 'pydantic'].some((x) => l === x || l.includes(x))) {
    if (l.includes('playwright ts') || l.includes('typescript') || l.includes('javascript')) return 'ts'
    return 'python'
  }
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'typescript', 'javascript'].some((x) => l === x || l.includes(x))) return 'ts'
  if (l === 'json' || l === 'jsonc') return 'json'
  if (l === 'http' || l.includes('rest')) return 'http'
  if (l === 'gherkin' || l === 'feature' || l.includes('bdd') || l.includes('cucumber')) return 'gherkin'
  if (['bash', 'sh', 'zsh', 'shell', 'powershell', 'ps1', 'dockerfile', 'docker'].some((x) => l === x || l.includes(x))) return 'bash'
  if (l === 'sql' || l.includes('postgres')) return 'sql'
  if (l === 'yaml' || l === 'yml') return 'yaml'
  return 'plain'
}

export function tokenizeCode(code: string, lang: HighlightLang): Tok[] {
  const tokens: Tok[] = []
  let i = 0
  const hashComment = lang === 'python' || lang === 'bash' || lang === 'yaml' || lang === 'gherkin'
  const slashComment = lang === 'ts' || lang === 'json' || lang === 'http'
  const dashComment = lang === 'sql'

  const kw =
    lang === 'python'
      ? PY_KEYWORDS
      : lang === 'ts'
        ? TS_KEYWORDS
        : lang === 'gherkin'
          ? GHERKIN_KEYWORDS
          : lang === 'http'
            ? HTTP_KEYWORDS
            : lang === 'bash'
              ? BASH_KEYWORDS
              : lang === 'sql'
                ? SQL_KEYWORDS
                : null

  const bi = lang === 'python' ? PY_BUILTINS : lang === 'ts' ? TS_BUILTINS : null

  while (i < code.length) {
    const ch = code[i]

    if (hashComment && ch === '#' && (i === 0 || code[i - 1] === '\n' || /\s/.test(code[i - 1]))) {
      let j = i
      while (j < code.length && code[j] !== '\n') j++
      tokens.push({ type: 'comment', value: code.slice(i, j) })
      i = j
      continue
    }

    if (slashComment && ch === '/' && code[i + 1] === '/') {
      let j = i
      while (j < code.length && code[j] !== '\n') j++
      tokens.push({ type: 'comment', value: code.slice(i, j) })
      i = j
      continue
    }

    if (slashComment && ch === '/' && code[i + 1] === '*') {
      let j = i + 2
      while (j < code.length && !(code[j] === '*' && code[j + 1] === '/')) j++
      j = Math.min(code.length, j + 2)
      tokens.push({ type: 'comment', value: code.slice(i, j) })
      i = j
      continue
    }

    if (dashComment && ch === '-' && code[i + 1] === '-') {
      let j = i
      while (j < code.length && code[j] !== '\n') j++
      tokens.push({ type: 'comment', value: code.slice(i, j) })
      i = j
      continue
    }

    if (ch === '"' || ch === "'" || (lang === 'ts' && ch === '`')) {
      const quote = ch
      let j = i + 1
      if (lang === 'python' && (quote === '"' || quote === "'") && code.slice(i, i + 3) === quote + quote + quote) {
        j = i + 3
        while (j < code.length && code.slice(j, j + 3) !== quote + quote + quote) j++
        j = Math.min(code.length, j + 3)
        tokens.push({ type: 'string', value: code.slice(i, j) })
        i = j
        continue
      }
      while (j < code.length) {
        if (code[j] === '\\') {
          j += 2
          continue
        }
        if (code[j] === quote) {
          j++
          break
        }
        if (quote !== '`' && code[j] === '\n') break
        j++
      }
      tokens.push({ type: 'string', value: code.slice(i, j) })
      i = j
      continue
    }

    if (/[0-9]/.test(ch) && (i === 0 || !/[A-Za-z_]/.test(code[i - 1]))) {
      let j = i
      while (j < code.length && /[0-9_.xXabcdefABCDEF]/.test(code[j])) j++
      tokens.push({ type: 'number', value: code.slice(i, j) })
      i = j
      continue
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i
      while (j < code.length && /[A-Za-z0-9_-]/.test(code[j])) {
        if (code[j] === '-' && lang !== 'http' && lang !== 'bash') break
        j++
      }
      const word = code.slice(i, j)
      let type = 'ident'
      if (lang === 'json' && /^(true|false|null)$/.test(word)) type = 'keyword'
      else if (lang === 'sql' && kw?.has(word.toUpperCase())) type = 'keyword'
      else if (kw?.has(word)) type = 'keyword'
      else if (bi?.has(word)) type = 'builtin'
      else if (/^[A-Z]/.test(word) && lang !== 'http' && lang !== 'bash') type = 'class'
      tokens.push({ type, value: word })
      i = j
      continue
    }

    if ('()[]{}.,:;=@+-*/%<>&|^~!?'.includes(ch)) {
      tokens.push({ type: 'punct', value: ch })
      i++
      continue
    }

    tokens.push({ type: 'plain', value: ch })
    i++
  }
  return tokens
}

export function CodeHighlight({ code, language = 'python' }: { code: string; language?: string }) {
  const lang = resolveHighlightLang(language)
  const tokens = tokenizeCode(code, lang)
  return (
    <code className="py-hl">
      {tokens.map((t, idx) =>
        t.type === 'plain' ? (
          <span key={idx}>{t.value}</span>
        ) : (
          <span key={idx} className={`tok-${t.type}`}>
            {t.value}
          </span>
        ),
      )}
    </code>
  )
}
