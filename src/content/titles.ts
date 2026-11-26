/**
 * Source notes often shout section titles ("CREATING DICTIONARIES — CONCEPTUAL INTERVIEW QUESTIONS & ANSWERS").
 * tidyTitle turns shouted words into Title Case while keeping real acronyms (RAG, MCP, JSON, HNSW…) intact.
 */
const ACRONYMS = new Set(
  (
    'AI ML LLM LLMS RAG CRAG MCP API APIS SDK ADK JSON YAML XML HTML CSS CSV PDF DOCX SQL NOSQL HTTP HTTPS URL REST RPC GRPC ' +
    'OOP DDD SOLID SLA GIL CPU GPU TPU RAM IO IVF HNSW FAISS BM25 TF IDF KNN ANN GGUF GPTQ AWQ HITL CLI UI UX JWT OAUTH ' +
    'AWS GCP S3 ID IDS UUID ASCII UTF CRUD ETL MVP KPI QA FAQ SSE WS TCP UDP DNS JS TS NLP OCR PII RBAC LRU FIFO LIFO ' +
    'DAG DFS BFS VS RRF NDCG MRR RAGAS OPENAI GPT'
  ).split(' '),
)

function fixWord(w: string) {
  const core = w.replace(/[^A-Za-z0-9]/g, '')
  if (ACRONYMS.has(core.toUpperCase())) return w
  return w.charAt(0) + w.slice(1).toLowerCase()
}

const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs', 'with'])

export function tidyTitle(title: string): string {
  const shouted = title.match(/\b[A-Z][A-Z0-9]{2,}\b/g) || []
  const nonAcronym = shouted.filter((w) => !ACRONYMS.has(w))
  if (nonAcronym.length < 2) return title
  let first = true
  return title.replace(/\b[A-Z][A-Z0-9'’]*\b/g, (w) => {
    if (w.length < 2 || ACRONYMS.has(w)) {
      first = false
      return w
    }
    const lower = w.toLowerCase()
    const out = !first && SMALL.has(lower) ? lower : fixWord(w)
    first = false
    return out
  })
}

/** Shorter form for narrow places (sidebar outline, cards). */
export function shortTitle(title: string): string {
  return tidyTitle(title)
    .replace(/\binterview questions?\s*(?:&|and)\s*answers\b/gi, 'interview Q&A')
    .replace(/\s+—\s+(conceptual|scenario-based)\s+interview Q&A$/i, (_, k: string) => ` — ${k[0].toUpperCase()}${k.slice(1).toLowerCase()} Q&A`)
}
