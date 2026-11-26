/**
 * .bin/.rga/ → VeeraRAG track.
 *
 * Sources (each used once — thu_/fri_ chat-export pairs and "(1)" copies are removed by content hash):
 *   NN_Title.md (📘 Module NN)      RAG core course (foundations → infrastructure)
 *   NN_<bm25 topics>.md              BM25 & sparse retrieval series
 *   NN_<graph topics>.md             GraphRAG series
 *   sectionN_*.md                    GraphRAG + BM25 interview master guide
 *   NN-<eval topics>.md              AI evaluation, tracing & monitoring series
 *   notebook_*.ipynb                 document-parsing notebooks (tables, images, page references)
 *   Copilot chat exports             deep dives routed by topic
 *
 * Learn modules 01–11, then Exercises (20), Projects (21), Interview (22).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanTitle, hash, headingsOf, isChatExport, parseChatExport, splitUnits } from './course-kit.mjs'
import { createTrack, writeTrack } from './track-builder.mjs'
import { notebookToMd } from './notebook-md.mjs'
import { RAG_DIAGRAMS } from './diagrams-rag.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
// Source material is local-only (never pushed): .bin/.rga/ (or .bin/rga/, or .rga/ at the root).
const srcRoot = [path.join(root, '.bin', '.rga'), path.join(root, '.bin', 'rga'), path.join(root, '.rga')].find((d) => fs.existsSync(d)) || path.join(root, '.bin', '.rga')
const outDir = path.join(root, 'src', 'content', 'generated')

const TRACK = {
  id: 'veerarag',
  title: 'VeeraRAG',
  tagline: 'Retrieval-Augmented Generation — Learn → Visualize → Practice → Evaluate → Interview',
  description:
    'RAG from first principles to production: ingestion and chunking, embeddings and vector databases, BM25, hybrid retrieval and reranking, query transformation, advanced and agentic RAG, GraphRAG, evaluation, observability and monitoring, failure modes, performance and security.',
  accent: '#0d9488',
}

const M = {
  '01': { id: '01', name: 'RAG Foundations' },
  '02': { id: '02', name: 'Ingestion & Chunking' },
  '03': { id: '03', name: 'Embeddings & Vector DBs' },
  '04': { id: '04', name: 'BM25 & Lexical Search' },
  '05': { id: '05', name: 'Retrieval, Hybrid & Reranking' },
  '06': { id: '06', name: 'Query & Generation' },
  '07': { id: '07', name: 'Advanced & Agentic RAG' },
  '08': { id: '08', name: 'GraphRAG' },
  '09': { id: '09', name: 'Evaluation' },
  '10': { id: '10', name: 'Observability & Monitoring' },
  '11': { id: '11', name: 'Production: Failures, Scale & Security' },
}
const COMPANIONS = {
  exercise: { id: '20', name: 'Exercises' },
  project: { id: '21', name: 'Projects' },
  interview: { id: '22', name: 'Interview' },
}

const SERIES = {
  core: 'RAG Core Course',
  bm25: 'BM25 & Sparse Retrieval',
  graph: 'GraphRAG Course',
  guide: 'GraphRAG + BM25 Interview Guide',
  eval: 'AI Evaluation & Observability',
  notebooks: 'Document Parsing Notebooks',
  interview: 'Interview Banks',
}
const SERIES_RANK = {
  [SERIES.core]: 10,
  [SERIES.bm25]: 15,
  [SERIES.graph]: 15,
  [SERIES.eval]: 15,
  [SERIES.guide]: 25,
  [SERIES.notebooks]: 30,
  [SERIES.interview]: 10,
}

const SKIP = [
  [/^RAG_Interview_Prompt\.md$/, 'a prompt template, not content'],
  [/^00_index\.md$/, 'index page'],
  [/^README\.md$/, 'index page'],
  [/^rag_evalution\.md$/, 'near-duplicate of the RAG evaluation chat export'],
]

/** File → [module, series, options]. First match wins. */
const ROUTES = [
  // interview banks
  [/^11-interview-questions/, '22', SERIES.interview, { kind: 'interview', title: 'Master Interview Bank: Evaluation, Tracing & Monitoring' }],
  [/^section10_coding_interview/, '22', SERIES.interview, { kind: 'interview', title: 'GraphRAG & BM25 Coding Interview' }],
  [/interview_preparation_for_ai_agents_and/, '22', SERIES.interview, { kind: 'interview', title: 'AI Agents, RAG & MCP Interview Checklist' }],

  // RAG core course (📘 Module NN — Title)
  [/^01_RAG_Foundations/, '01', SERIES.core],
  [/^02_Document_Processing_Ingestion/, '02', SERIES.core],
  [/^03_Chunking_Strategies/, '02', SERIES.core],
  [/^04_Embedding_Models/, '03', SERIES.core],
  [/^05_Vector_Databases/, '03', SERIES.core],
  [/^06_Retrieval_Strategies/, '05', SERIES.core],
  [/^07_Reranking/, '05', SERIES.core],
  [/^08_Query_Understanding_Transformation/, '06', SERIES.core],
  [/^09_Generation_Prompting/, '06', SERIES.core],
  [/^10_Advanced_RAG_Architectures/, '07', SERIES.core],
  [/^11_Evaluation_Metrics/, '09', SERIES.core],
  [/^12_RAG_Failure_Modes_Debugging/, '11', SERIES.core],
  [/^14_Security_Governance/, '11', SERIES.core],
  [/^15_RAG_Infrastructure_Tools/, '11', SERIES.core],

  // BM25 & sparse retrieval
  [/^01_ir_foundations/, '04', SERIES.bm25],
  [/^02_tfidf/, '04', SERIES.bm25],
  [/^03_bm25_math/, '04', SERIES.bm25],
  [/^04_bm25_variants/, '04', SERIES.bm25],
  [/^05_inverted_index/, '04', SERIES.bm25],
  [/^06_tokenisation/, '04', SERIES.bm25],
  [/^07_bm25_implementations/, '04', SERIES.bm25],
  [/^08_sparse_vectors/, '04', SERIES.bm25],
  [/^09_hybrid_search/, '05', SERIES.bm25],
  [/^10_bm25_rag/, '05', SERIES.bm25],
  [/^11_query_expansion/, '06', SERIES.bm25],
  [/^12_evaluation_metrics/, '09', SERIES.bm25],
  [/^13_performance_scalability/, '11', SERIES.bm25],
  [/^14_bm25_vs_neural/, '05', SERIES.bm25],

  // GraphRAG
  [/^01_graph_rag_foundations/, '08', SERIES.graph],
  [/^02_knowledge_graph_construction/, '08', SERIES.graph],
  [/^03_graph_data_structures/, '08', SERIES.graph],
  [/^04_graph_databases/, '08', SERIES.graph],
  [/^05_community_detection/, '08', SERIES.graph],
  [/^06_graph_traversal_retrieval/, '08', SERIES.graph],
  [/^07_hybrid_graph_vector_retrieval/, '08', SERIES.graph],
  [/^08_entity_linking_disambiguation/, '08', SERIES.graph],
  [/^09_graph_query_languages/, '08', SERIES.graph],
  [/^10_microsoft_graphrag_deep_dive/, '08', SERIES.graph],
  [/^11_lightrag/, '08', SERIES.graph],
  [/^12_graph_rag_evaluation/, '09', SERIES.graph],
  [/^13_failure_modes_debugging/, '11', SERIES.graph],
  [/^14_scalability_performance/, '11', SERIES.graph],
  [/^15_infrastructure_tools/, '11', SERIES.graph],

  // GraphRAG + BM25 interview master guide (sections)
  [/^section1_bm25_fundamentals/, '04', SERIES.guide],
  [/^section2_hybrid_search/, '05', SERIES.guide],
  [/^section3_graphrag_fundamentals/, '08', SERIES.guide],
  [/^section4_knowledge_graphs/, '08', SERIES.guide],
  [/^section5_graphrag_pipeline/, '08', SERIES.guide],
  [/^section6_graphrag_vs_normal_rag/, '08', SERIES.guide],
  [/^section7_graphrag_evaluation/, '09', SERIES.guide],
  [/^section8_production_graphrag/, '11', SERIES.guide],
  [/^section9_security/, '11', SERIES.guide],

  // evaluation, tracing & monitoring
  [/^00-overview-and-learning-path/, '09', SERIES.eval, { title: 'Evaluation, tracing & monitoring — learning path' }],
  [/^01-llm-evaluation/, '09', SERIES.eval],
  [/^02-rag-evaluation/, '09', SERIES.eval],
  [/^03-advanced-rag-eval/, '09', SERIES.eval],
  [/^04-ai-agents-evaluation/, '09', SERIES.eval],
  [/^05-multi-agent-evaluation/, '09', SERIES.eval],
  [/^06-agentic-ai-evaluation/, '09', SERIES.eval],
  [/^07-mcp-tool-calling/, '07', SERIES.eval],
  [/^08-tracing/, '10', SERIES.eval],
  [/^09-monitoring/, '10', SERIES.eval],
  [/^10-golden-datasets/, '09', SERIES.eval],

  // standalone docs + notebooks
  [/^rag-chunking-strategies/, '02', SERIES.core, { title: 'Chunking strategies for real-world documents' }],
  [/^LLM_RAG_Agents_MCP_Tutorial/, '01', null, { series: 'LLM, RAG, Agents & MCP Tutorial' }],
  [/^notebook_1_tables/, '02', SERIES.notebooks, { title: 'Parsing tables from documents' }],
  [/^notebook_2_cross_page_references/, '02', SERIES.notebooks, { title: 'Cross-page references' }],
  [/^notebook_3_images_mixed_content/, '02', SERIES.notebooks, { title: 'Images and mixed content' }],
  [/^notebook_4_page_references/, '02', SERIES.notebooks, { title: 'Page references and citations' }],

  // chat exports (several courses each → topic decides the module)
  [/agentic_rag_techniques_overview/, '07', null, { mixed: true }],
  [/creating_rag_application_with_lang_chain/, '07', null, { mixed: true, series: 'Build a RAG App with LangChain' }],
  [/graph_rag_and_bm_25_master_course_outline/, '08', null, { mixed: true, series: 'GraphRAG + BM25 Master Course' }],
  [/idf_and_its_importance_in_search/, '04', null, { mixed: true, series: 'BM25 & Sparse Retrieval for Beginners' }],
  [/rag_evaluation_techniques_overview/, '09', null, { mixed: true, series: 'RAG Evaluation Techniques' }],
  [/rag_indexing_techniques_explained/, '03', null, { mixed: true, series: 'RAG Indexing Techniques' }],
  [/rag_interview_preparation_system_overview/, '22', SERIES.interview, { kind: 'interview', title: 'RAG Interview Bible (senior level)' }],
  [/rag_interview_preparation_system/, '22', SERIES.interview, { kind: 'interview', title: 'RAG Interview Prep System' }],
  [/rag_search_and_filtering_techniques/, '05', null, { mixed: true, series: 'RAG Search & Filtering Techniques' }],
  [/teaching_rag_from_scratch/, '01', null, { mixed: true, series: 'Teaching RAG from Scratch' }],
]

/** Keyword → module for mixed sources. Order matters (most specific first). */
function moduleByTopic(text) {
  const t = String(text || '').toLowerCase()
  if (/graph ?rag|knowledge graph|community (detection|summar)|entity (link|extract|resol)|neo4j|cypher|lightrag|graph (database|traversal|quer)/.test(t)) return '08'
  if (/tracing|\bspans?\b|observab|monitor|drift|alert|dashboard|telemetry|langsmith|langfuse|opentelemetry|\bslo\b/.test(t)) return '10'
  if (/evaluat|ragas|metric|golden|judge|faithful|benchmark|precision|recall|ndcg|\bmrr\b|hallucination detect/.test(t)) return '09'
  if (/security|injection|\bpii\b|governance|failure|debug|scal|performance|latency|cost|cach|infra|deploy|production|tenant|access control/.test(t)) return '11'
  if (/agentic|self-?rag|corrective|crag|adaptive|multi-?hop|\bmcp\b|tool call|agent|langgraph|advanced rag|raptor|colbert/.test(t)) return '07'
  if (/query (rewrit|transform|expan|understand|decompos)|hyde|multi-?query|step-?back|prompt|generation|citation|context window/.test(t)) return '06'
  if (/rerank|hybrid|fusion|\brrf\b|retriev|search|filter|\bmmr\b|metadata/.test(t)) return '05'
  if (/bm25|tf-?idf|\bidf\b|inverted index|lexical|sparse|tokeni|keyword|term frequency/.test(t)) return '04'
  if (/embedding|vector|index|hnsw|\bivf\b|faiss|chroma|pinecone|qdrant|weaviate|milvus|quantiz|similarity/.test(t)) return '03'
  if (/chunk|ingest|parsing|parser|loader|document|pdf|ocr|table|preprocess/.test(t)) return '02'
  if (/foundation|what is rag|introduction|basics|overview|why rag|rag pipeline/.test(t)) return '01'
  return null
}

function niceSeries(h1) {
  let t = cleanTitle(h1)
    .replace(/^copilot chat conversation export:\s*/i, '')
    .replace(/\s*[—–-]\s*(deep|crystal|complete|every single|end-to-end|clear|full)\b.*$/i, '')
    .trim()
  if (t === t.toUpperCase()) t = t.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\b(Ai|Llm|Rag|Mcp|Bm25|Idf|Tf-Idf|Hnsw)\b/g, (w) => w.toUpperCase())
  return t.slice(0, 64)
}

/** "📘 Module 03 — Chunking Strategies" → "Chunking Strategies" (the module number means nothing on the site). */
function coreTitle(md, fallback) {
  const h1 = headingsOf(md, 1).filter((h) => !h.banner)[0]?.title || fallback
  return cleanTitle(h1).replace(/^(module|section)\s+\d+\s*[—–:-]\s*/i, '').replace(/^\d+\s*[—–:-]\s*/, '')
}

/** Split at top-level "# CONCEPT N: Title" lines that are outside code fences. */
function conceptUnits(md) {
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n')
  const starts = []
  let inFence = false
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    else if (!inFence && /^#\s+CONCEPT\s+\d+\s*[:—–-]/i.test(line)) starts.push(i)
  })
  if (starts.length < 2) return null
  const units = starts.map((start, k) => {
    const end = k + 1 < starts.length ? starts[k + 1] : lines.length
    const rawTitle = lines[start].replace(/^#\s+/, '')
    return {
      title: cleanTitle(rawTitle.replace(/^CONCEPT\s+\d+\s*[:—–-]\s*/i, '')),
      rawTitle,
      group: '',
      body: lines.slice(start + 1, end).join('\n'),
      level: 1,
    }
  })
  return { intro: lines.slice(0, starts[0]).join('\n'), units }
}

const KEEP = {
  RAG: 'RAG', BM25: 'BM25', RRF: 'RRF', LLM: 'LLM', LLMS: 'LLMs', MCP: 'MCP', IDF: 'IDF', TF: 'TF', 'TF-IDF': 'TF-IDF', HNSW: 'HNSW',
  IVF: 'IVF', API: 'API', JSON: 'JSON', SQL: 'SQL', PDF: 'PDF', KG: 'KG', AI: 'AI', SDK: 'SDK', NDCG: 'nDCG', MRR: 'MRR',
  GRAPHRAG: 'GraphRAG', LANGCHAIN: 'LangChain', LLAMAINDEX: 'LlamaIndex', NEO4J: 'Neo4j', LANGGRAPH: 'LangGraph', RAGAS: 'RAGAS',
  CHROMADB: 'ChromaDB', BGE: 'BGE', HYDE: 'HyDE', CRAG: 'CRAG', ADK: 'ADK', FAQ: 'FAQ', SLO: 'SLO', QA: 'QA', 'JSON-RPC': 'JSON-RPC',
}
const SMALL = new Set(['and', 'or', 'of', 'the', 'a', 'an', 'in', 'on', 'to', 'for', 'vs', 'with', 'by', 'at', 'from'])
/** "HYBRID SEARCH (BM25 + VECTOR + RRF)" → "Hybrid Search (BM25 + Vector + RRF)". Mixed-case titles are left alone. */
function fixCaps(title) {
  const letters = String(title).replace(/[^A-Za-z]/g, '')
  if (letters.length < 4 || letters !== letters.toUpperCase()) return title
  let first = true
  return String(title).replace(/[A-Za-z][A-Za-z0-9-]*/g, (w) => {
    const up = w.toUpperCase()
    const out = KEEP[up] || (!first && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0) + w.slice(1).toLowerCase())
    first = false
    return out
  })
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '__pycache__', '.ipynb_checkpoints'].includes(e.name)) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, acc)
    else if (/\.(md|ipynb|py)$/i.test(e.name)) acc.push(full)
  }
  return acc
}

const rel = (full) => path.relative(srcRoot, full).split(path.sep).join('/')
const isCopyName = (r) => /\(\d+\)\.(md|ipynb)$| copy( \d+)?\.(md|ipynb)$/.test(r) || /^thu_/.test(r)

function main() {
  if (!fs.existsSync(srcRoot)) {
    console.log('VeeraRAG sources not found (.bin/.rga) — skipping, keeping the committed generated lessons.')
    process.exit(0)
  }
  // prefer the clean file name (fri_ over thu_, no "(1)") when contents are identical
  const files = walk(srcRoot).sort((a, b) => Number(isCopyName(rel(a))) - Number(isCopyName(rel(b))) || a.localeCompare(b))

  const track = createTrack({
    trackId: 'veerarag',
    prefix: 'rg',
    companions: COMPANIONS,
    moduleFor: (topic, ctx) => {
      if (ctx.mixed) return M[moduleByTopic(topic) || moduleByTopic(ctx.series) || ctx.defaultModule] || M['01']
      return M[ctx.defaultModule] || M['01']
    },
    seriesRank: (s) => SERIES_RANK[s] ?? 40,
  })

  const used = []
  const skipped = []
  const seen = new Set()
  const chatCourses = new Map()
  for (const full of files) {
    const r = rel(full)
    const base = path.basename(r)
    const raw = fs.readFileSync(full, 'utf8')
    if (raw.trim().length < 80) {
      skipped.push(`${r} (empty)`)
      continue
    }
    const h = hash(raw.replace(/\s+/g, ' '), 16)
    if (seen.has(h)) {
      skipped.push(`${r} (duplicate copy)`)
      continue
    }
    seen.add(h)
    const skip = SKIP.find(([re]) => re.test(base))
    if (skip) {
      skipped.push(`${r} (${skip[1]})`)
      continue
    }
    const route = ROUTES.find(([re]) => re.test(base))
    if (!route) {
      skipped.push(`${r} (no route)`)
      continue
    }
    const [, mod, series, opt = {}] = route

    let md = raw
    let title = opt.title
    if (r.endsWith('.ipynb')) {
      const nb = notebookToMd(raw, r)
      if (!nb) {
        skipped.push(`${r} (invalid notebook)`)
        continue
      }
      md = nb.md
      title = title || cleanTitle(nb.title)
    }

    if (opt.kind === 'interview' || opt.kind === 'project') {
      const body = isChatExport(md) ? parseChatExport(md).map((c) => c.md).join('\n\n') : md
      track.addDoc({ rel: r, md: body, series, title, defaultModule: mod, kindOverride: opt.kind, forceKind: true, preferUnits: false })
      used.push(r)
      continue
    }

    if (isChatExport(md)) {
      // collect now, add after the loop: the same course often appears in several exports
      parseChatExport(md).forEach((c, idx) => {
        const h1raw = headingsOf(c.md, 1).filter((x) => !x.banner)[0]?.title
        const fallback = opt.series || cleanTitle(base.replace(/^(thu|fri)_\w+?_\d{4}_/, '').replace(/\.md$/, '').replace(/_/g, ' '))
        const h1 = h1raw || fallback
        const key = niceSeries(h1).toLowerCase().replace(/[^a-z0-9]+/g, '')
        const ser = idx === 0 && opt.series ? opt.series : niceSeries(h1)
        const prev = chatCourses.get(key)
        if (prev && prev.md.length >= c.md.length) {
          skipped.push(`${r} › ${niceSeries(h1)} (same course already taken from ${prev.rel})`)
          return
        }
        chatCourses.set(key, { rel: r, md: c.md, h1, series: ser, mod, mixed: !!opt.mixed })
      })
      used.push(r)
      continue
    }

    // "# CONCEPT N: Title" files: one lesson per concept (code comments like "# setup" defeat auto-detection)
    const concepts = conceptUnits(md)
    if (concepts) {
      track.addCourse({ rel: r, md, series: series || opt.series, courseTitle: coreTitle(md, base), defaultModule: mod, units: concepts })
      used.push(`${r} (${concepts.units.length} concepts)`)
      continue
    }

    const docTitle = title || coreTitle(md, base)
    track.addDoc({ rel: r, md, series: series || opt.series, title: docTitle, defaultModule: mod, preferUnits: true })
    used.push(r)
  }

  for (const c of chatCourses.values()) {
    const units = splitUnits(c.md)
    if (units && units.units.length >= 2) {
      track.addCourse({ rel: c.rel, md: c.md, series: c.series, courseTitle: c.h1, defaultModule: c.mod, units, mixed: c.mixed })
    } else {
      track.addDoc({ rel: c.rel, md: c.md, series: c.series, title: niceSeries(c.h1), defaultModule: moduleByTopic(c.h1) || c.mod, preferUnits: false })
    }
  }

  const { lessons, stats } = track.finalize({ diagrams: RAG_DIAGRAMS })
  // ALL-CAPS headings from the chat exports read as shouting: title-case them, keep acronyms
  for (const l of lessons) {
    const m = l.title.match(/^(\d{2}\.\s*[^:]+:\s*)(.*)$/)
    if (m) l.title = m[1] + fixCaps(m[2])
    for (const sec of l.sections) sec.title = fixCaps(sec.title)
  }
  writeTrack({ outDir, trackId: 'veerarag', track: TRACK, lessons })

  const byMod = {}
  for (const l of lessons) byMod[l.title.slice(0, 2)] = (byMod[l.title.slice(0, 2)] || 0) + 1
  console.log(`VeeraRAG track: ${lessons.length} lessons from ${used.length} sources (${stats.candidates} candidates)`)
  console.log('  by module:', JSON.stringify(byMod))
  console.log(`  duplicate sections removed: ${stats.droppedSections}`)
  console.log(`  curated diagrams placed: ${stats.diagramsPlaced}/${RAG_DIAGRAMS.length}`)
  if (stats.diagramsMissed.length) console.log('  NOT placed:', stats.diagramsMissed.join(', '))
  if (process.argv.includes('--verbose')) {
    console.log('  used:\n   ', used.join('\n    '))
    console.log('  skipped:\n   ', skipped.join('\n    '))
  } else console.log(`  skipped ${skipped.length} files (run with --verbose to list)`)
}

main()
