const KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
  'match',
  'case',
])

const builtins = new Set([
  'print',
  'len',
  'range',
  'type',
  'id',
  'isinstance',
  'issubclass',
  'list',
  'dict',
  'set',
  'tuple',
  'str',
  'int',
  'float',
  'bool',
  'open',
  'enumerate',
  'zip',
  'map',
  'filter',
  'sum',
  'min',
  'max',
  'sorted',
  'reversed',
  'any',
  'all',
  'super',
  'property',
  'staticmethod',
  'classmethod',
  'Exception',
  'ValueError',
  'TypeError',
  'KeyError',
  'AttributeError',
])

type Tok = { type: string; value: string }

function tokenizePython(code: string): Tok[] {
  const tokens: Tok[] = []
  let i = 0
  while (i < code.length) {
    const ch = code[i]

    if (ch === '#' && (i === 0 || code[i - 1] === '\n' || /\s/.test(code[i - 1]))) {
      let j = i
      while (j < code.length && code[j] !== '\n') j++
      tokens.push({ type: 'comment', value: code.slice(i, j) })
      i = j
      continue
    }

    if (ch === '"' || ch === "'") {
      const quote = ch
      let j = i + 1
      // triple quotes
      if (code.slice(i, i + 3) === quote + quote + quote) {
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
        if (code[j] === '\n') break
        j++
      }
      tokens.push({ type: 'string', value: code.slice(i, j) })
      i = j
      continue
    }

    if (/[0-9]/.test(ch)) {
      let j = i
      while (j < code.length && /[0-9_.xXabcdefABCDEF]/.test(code[j])) j++
      tokens.push({ type: 'number', value: code.slice(i, j) })
      i = j
      continue
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i
      while (j < code.length && /[A-Za-z0-9_]/.test(code[j])) j++
      const word = code.slice(i, j)
      let type = 'ident'
      if (KEYWORDS.has(word)) type = 'keyword'
      else if (builtins.has(word)) type = 'builtin'
      else if (/^[A-Z]/.test(word)) type = 'class'
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

export function PythonHighlight({ code }: { code: string }) {
  const tokens = tokenizePython(code)
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
