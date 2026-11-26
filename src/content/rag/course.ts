import type { CourseConfig } from '@/content/courseKit'
import { RAG_GALLERY } from '@/content/sims/registry'

export const RAG_LABS = [
  { to: '/labs/bm25', icon: '🔤', title: 'BM25 Lab', text: 'Edit a corpus and query, tune k1 and b, and see tf, IDF and each term’s contribution.' },
  { to: '/labs/chunking-strategy', icon: '✂️', title: 'Chunking Strategy Lab', text: 'Fixed, recursive, sentence and sliding-window chunking on a real document — does the retrieved chunk hold the answer?' },
  { to: '/labs/hybrid-retrieval', icon: '🔀', title: 'Hybrid Retrieval Lab', text: 'BM25 vs dense vs RRF / weighted fusion vs reranking, with recall@3 and MRR per list.' },
  { to: '/labs/rag-eval', icon: '📏', title: 'RAG Evaluation Metrics Lab', text: 'Judge chunks and claims yourself; precision@k, recall@k, MRR, nDCG and faithfulness update live.' },
  { to: '/labs/rag-observability', icon: '📈', title: 'RAG Observability Lab', text: 'Inject incidents into an hour of traffic, see which alerts fire, and open the trace for any minute.' },
]

export const RAG_COURSE: CourseConfig = {
  trackId: 'veerarag',
  base: '/rag',
  title: 'VeeraRAG',
  accent: '#0d9488',
  kicker: 'VeeraRAG',
  heroTitle: 'Master RAG by building, measuring and debugging it',
  heroText:
    'Retrieval-Augmented Generation end to end: ingestion and chunking, embeddings and vector databases, BM25, hybrid retrieval and reranking, query transformation, advanced and agentic RAG, GraphRAG, evaluation, observability and production operations — with diagrams, step-by-step simulations, hands-on labs and interview banks.',
  searchPlaceholder: 'Search — chunking, BM25, HNSW, reranking, RAGAS, GraphRAG, tracing…',
  phases: [
    {
      id: 'learn',
      title: 'Learn',
      blurb: 'Eleven modules from “what is RAG” to production operations, each with curated diagrams and animated simulations.',
      accent: '#0d9488',
      moduleIds: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'],
    },
    { id: 'exercises', title: 'Exercises', blurb: 'Hands-on tasks from the BM25, GraphRAG and evaluation series.', accent: '#1d4ed8', moduleIds: ['20'] },
    { id: 'projects', title: 'Projects', blurb: 'Build a complete RAG app with LangChain and ChromaDB, and a GraphRAG system.', accent: '#b45309', moduleIds: ['21'] },
    {
      id: 'interview',
      title: 'Interview',
      blurb: 'RAG interview bible, BM25 and GraphRAG banks, evaluation and monitoring questions, and a coding round.',
      accent: '#db2777',
      moduleIds: ['22'],
    },
  ],
  modules: {
    '01': { icon: '🧭', color: '#0d9488', blurb: 'What RAG is, when to use it instead of fine-tuning, the retrieve-read pipeline and how grounding reduces hallucination.' },
    '02': { icon: '✂️', color: '#ea580c', blurb: 'Loaders, cleaning, metadata, tables and images, incremental updates — and every chunking strategy with its trade-offs.' },
    '03': { icon: '🧮', color: '#7c3aed', blurb: 'Embedding models, dense vs sparse, bi- vs cross-encoders, vector databases, HNSW/IVF/PQ and ChromaDB in practice.' },
    '04': { icon: '🔤', color: '#1d4ed8', blurb: 'Information retrieval foundations, TF-IDF, the BM25 formula, its variants, inverted indexes and tokenisation.' },
    '05': { icon: '🔀', color: '#0891b2', blurb: 'Top-k and thresholds, hybrid search with RRF, BM25 vs neural retrieval, metadata filtering and reranking.' },
    '06': { icon: '✍️', color: '#ca8a04', blurb: 'Query classification, rewriting and expansion, RAG prompt engineering, structured output and citations.' },
    '07': { icon: '🤖', color: '#9333ea', blurb: 'Self-RAG, CRAG, agentic RAG, RAG fusion, FLARE — plus MCP and tool calling to connect RAG to agents.' },
    '08': { icon: '🕸️', color: '#16a34a', blurb: 'Knowledge-graph construction, graph databases and Cypher, community detection, Microsoft GraphRAG and LightRAG.' },
    '09': { icon: '📏', color: '#db2777', blurb: 'LLM and RAG evaluation, RAGAS, LLM-as-a-judge, golden datasets, retrieval metrics and agent evaluation.' },
    '10': { icon: '📈', color: '#0369a1', blurb: 'Tracing with spans and OpenTelemetry, production monitoring, drift, cost and alerting.' },
    '11': { icon: '🛡️', color: '#dc2626', blurb: 'Failure modes and debugging, scalability and performance, security and governance, infrastructure and tools.' },
  },
  sims: RAG_GALLERY,
  simModuleOf: (s) => s.ragModule,
  visualizerBase: '/rag/visualizer',
  demoSimId: 'rag-query',
  labs: RAG_LABS,
}
