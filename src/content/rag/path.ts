/**
 * VeeraRAG guided learning path: Stages -> Sub-module Topics -> Core / Practice / Deeper lessons.
 * Maps every VeeraRAG Learn lesson into crisp guided stages & sub-modules, plus links simulations,
 * RAG labs, and keyword-classified interview questions.
 */
import { getCurriculumIndex } from '@/content/loadCurriculum'
import { resolvePath, type ResolvedPath, type StageDef } from '@/content/paths/engine'

const S = {
  CORE: /^RAG Core Course$/,
  BM25: /^BM25 & Sparse Retrieval$/,
  BM25B: /^BM25 & Sparse Retrieval for Beginners$/,
  GRAPH: /^GraphRAG Course$/,
  GUIDE: /^GraphRAG \+ BM25 Interview Guide$/,
  GM: /^GraphRAG \+ BM25 Master Course$/,
  EVAL: /^AI Evaluation & Observability$/,
  REVAL: /^RAG Evaluation Techniques$/,
  MCP: /^MCP \(Model Context Protocol\)$/,
  MCPC: /^Complete MCP/,
  CHROMA: /^Complete ChromaDB/,
  SEARCH: /^RAG Search & Filtering Techniques$/,
  INDEX: /^RAG Indexing Techniques$/,
  LC: /^Build a RAG App with LangChain$/,
  TUT: /^LLM, RAG, Agents & MCP Tutorial$/,
  SCRATCH: /^Teaching RAG from Scratch$/,
  VIS: /^Final Master Visual Summary$/,
}

const ANY = /.*/
const sim = (id: string) => id
const play = (id: string, title: string) => ({ to: `/labs/${id}`, title })

const STAGES: StageDef[] = [
  {
    id: 'rag-foundations',
    title: 'Stage 1 · Foundations, Ingestion & Vector Indexing',
    level: 'Beginner',
    color: '#0d9488',
    blurb: 'Why RAG exists, document parsing & chunking strategies, embeddings, vector databases & indexing math.',
    topics: [
      {
        id: 'rag-basics',
        title: 'RAG Architecture & When to Use RAG vs Fine-Tuning',
        icon: '🧭',
        blurb: 'Naive vs Advanced vs Modular RAG, grounding, hallucination reduction, and RAG vs fine-tuning vs long context.',
        kw: /\b(what is rag|types of rag|naive rag|modular rag|fine-?tun|grounding|hallucinat|pipeline|when to use rag|core concepts|foundational llm)\b/i,
        rules: [
          { m: /^01$/, s: S.CORE, t: ANY },
          { m: /^01$/, s: S.TUT, t: ANY, role: 'deeper' },
          { m: /^01$/, s: S.SCRATCH, t: ANY, role: 'deeper' },
        ],
        sims: [sim('rag-query'), sim('rag-ingestion')],
      },
      {
        id: 'rag-ingestion-chunking',
        title: 'Document Parsing, Tables, Images & Chunking Strategies',
        icon: '✂️',
        blurb: 'Loaders, OCR, cross-page tables, semantic/recursive/sliding-window chunking, overlap, hashing & incremental updates.',
        kw: /\b(chunk|ingest|parsing|parser|loader|ocr|table|image|overlap|dedup|incremental|metadata|document processing|parent-?child)\b/i,
        rules: [
          { m: /^02$/, s: S.CORE, t: ANY },
          { m: /^02$/, s: /^Document Parsing Notebooks$/, t: ANY, role: 'practice' },
        ],
        sims: [sim('rag-ingestion')],
        labs: [play('chunking-strategy', 'Chunking Strategy Lab'), play('chunking', 'Chunk Size & Overlap Lab')],
      },
      {
        id: 'rag-embeddings-vectordb',
        title: 'Embeddings, Cosine Similarity & Vector Databases (HNSW / IVF)',
        icon: '🧮',
        blurb: 'Dense vectors, bi-encoders vs cross-encoders, HNSW, IVF, quantization, filtering indexes & ChromaDB.',
        kw: /\b(embedding|vector|hnsw|ivf|quantiz|cosine|euclidean|dot product|chroma|faiss|qdrant|pinecone|milvus|ann|bi-encoder)\b/i,
        rules: [
          { m: /^03$/, s: S.CORE, t: ANY },
          { m: /^03$/, s: S.CHROMA, t: ANY, role: 'practice' },
          { m: /^03$/, s: S.INDEX, t: ANY, role: 'deeper' },
        ],
        sims: [sim('rag-ingestion')],
        labs: [play('cosine', 'Cosine Similarity Lab')],
      },
    ],
  },
  {
    id: 'rag-retrieval',
    title: 'Stage 2 · BM25, Hybrid Retrieval, Reranking & Generation',
    level: 'Intermediate',
    color: '#0284c7',
    blurb: 'Lexical IR & BM25 math, hybrid dense+sparse fusion (RRF), cross-encoder reranking, query rewriting & grounded citations.',
    topics: [
      {
        id: 'bm25-sparse',
        title: 'IR Foundations, TF-IDF, BM25 Math & Inverted Indexes',
        icon: '🔤',
        blurb: 'Tokenization, stemming, inverted indexes, IDF, BM25 k1 & b saturation, SPLADE sparse vectors & exact keyword recall.',
        kw: /\b(bm25|tf-?idf|idf|inverted index|tokeni|stem|sparse|splade|lexical|keyword|k1|length normali)\b/i,
        rules: [
          { m: /^04$/, s: S.BM25, t: ANY },
          { m: /^04$/, s: S.GUIDE, t: ANY, role: 'practice' },
          { m: /^04$/, s: S.GM, t: ANY, role: 'deeper' },
          { m: /^04$/, s: S.BM25B, t: ANY, role: 'deeper' },
        ],
        sims: [sim('bm25-scoring')],
        labs: [play('bm25', 'BM25 Lab')],
      },
      {
        id: 'hybrid-rerank',
        title: 'Hybrid Search (RRF), Metadata Filtering & Cross-Encoder Reranking',
        icon: '🔀',
        blurb: 'Combining dense + BM25 via Reciprocal Rank Fusion, MMR diversity, metadata pre/post-filtering & cross-encoder rerankers.',
        kw: /\b(hybrid|rrf|reciprocal rank|rerank|cross-?encoder|colbert|mmr|metadata filter|pre-?filter|post-?filter|fusion|top-?k|retrieval method|search algorithm|ai search index)\b/i,
        rules: [
          { m: /^05$/, s: S.CORE, t: ANY },
          { m: /^05$/, s: S.BM25, t: ANY, role: 'practice' },
          { m: /^05$/, s: S.CHROMA, t: ANY, role: 'practice' },
          { m: /^05$/, s: S.GUIDE, t: ANY, role: 'practice' },
          { m: /^05$/, s: S.GM, t: ANY, role: 'deeper' },
          { m: /^05$/, s: S.BM25B, t: ANY, role: 'deeper' },
          { m: /^05$/, s: S.SEARCH, t: ANY, role: 'deeper' },
        ],
        sims: [sim('rag-hybrid'), sim('rag-query')],
        labs: [play('hybrid-retrieval', 'Hybrid Retrieval Lab'), play('retrieval', 'Hybrid RRF Lab')],
      },
      {
        id: 'query-generation',
        title: 'Query Rewriting, HyDE, Prompting & Grounded Citations',
        icon: '✍️',
        blurb: 'Query classification, HyDE, multi-query decomposition, lost-in-the-middle prompting, structured JSON output & citations.',
        kw: /\b(query (rewrit|expan|transform|decompos|classif)|hyde|multi-?query|step-?back|citation|prompt|lost in the middle|ground)\b/i,
        rules: [
          { m: /^06$/, s: S.CORE, t: ANY },
          { m: /^06$/, s: S.BM25, t: ANY, role: 'deeper' },
        ],
        sims: [sim('rag-multiquery'), sim('rag-conversational')],
      },
    ],
  },
  {
    id: 'rag-advanced',
    title: 'Stage 3 · Agentic RAG, MCP & GraphRAG',
    level: 'Advanced',
    color: '#7c3aed',
    blurb: 'Self-RAG, Corrective RAG, MCP tools, Knowledge Graph construction, Leiden community summaries & hybrid GraphRAG.',
    topics: [
      {
        id: 'agentic-rag-mcp',
        title: 'Self-RAG, Corrective RAG (CRAG), Agentic RAG & MCP',
        icon: '🤖',
        blurb: 'Document grading, adaptive routing, web fallback, RAPTOR, LangChain LCEL, and connecting RAG to agents via MCP servers.',
        kw: /\b(self-?rag|crag|corrective|agentic rag|adaptive|flare|raptor|mcp|model context protocol|tool call|langchain|ai agents|agent orchestration|langgraph)\b/i,
        rules: [
          { m: /^07$/, s: S.CORE, t: ANY },
          { m: /^07$/, s: S.EVAL, t: ANY },
          { m: /^07$/, s: S.LC, t: ANY, role: 'practice' },
          { m: /^07$/, s: S.MCPC, t: ANY, role: 'practice' },
          { m: /^07$/, s: S.MCP, t: ANY, role: 'deeper' },
        ],
        sims: [sim('rag-crag'), sim('agentic-rag'), sim('mcp-session')],
      },
      {
        id: 'graphrag',
        title: 'GraphRAG: Knowledge Graphs, Neo4j, Cypher, Leiden & LightRAG',
        icon: '🕸️',
        blurb: 'Entity/relation extraction, entity disambiguation, Neo4j/Cypher, Leiden communities, Microsoft GraphRAG & LightRAG.',
        kw: /\b(graph ?rag|knowledge graph|neo4j|cypher|leiden|community detection|entity linking|disambiguat|lightrag|traversal|multi-?hop|global search|local search)\b/i,
        rules: [
          { m: /^08$/, s: S.GRAPH, t: ANY },
          { m: /^08$/, s: S.GUIDE, t: ANY, role: 'practice' },
          { m: /^08$/, s: S.GM, t: ANY, role: 'deeper' },
        ],
        sims: [sim('graphrag-hybrid')],
      },
    ],
  },
  {
    id: 'rag-eval-obs-prod',
    title: 'Stage 4 · Evaluation, Tracing, Observability & Production',
    level: 'Senior / Production',
    color: '#db2777',
    blurb: 'RAGAS, LLM-as-a-Judge, golden datasets, OpenTelemetry tracing, drift & cost monitoring, debugging, scaling & multi-tenant security.',
    topics: [
      {
        id: 'rag-evaluation',
        title: 'RAG Evaluation, RAGAS, LLM-as-a-Judge & Golden Datasets',
        icon: '📏',
        blurb: 'Precision@k, Recall@k, MRR, nDCG, Faithfulness, Answer Relevance, calibrated judge rubrics, CI eval gates & agent evaluation.',
        kw: /\b(ragas|faithfulness|context precision|context recall|answer relevance|mrr|ndcg|precision@|recall@|golden dataset|judge|evaluat|benchmark|trajectory|a\/b test)\b/i,
        rules: [
          { m: /^09$/, s: S.CORE, t: ANY },
          { m: /^09$/, s: S.EVAL, t: ANY },
          { m: /^09$/, s: S.REVAL, t: ANY, role: 'practice' },
          { m: /^09$/, s: S.BM25, t: ANY, role: 'deeper' },
          { m: /^09$/, s: S.GRAPH, t: ANY, role: 'deeper' },
          { m: /^09$/, s: S.GUIDE, t: ANY, role: 'deeper' },
          { m: /^09$/, s: S.GM, t: ANY, role: 'deeper' },
          { m: /^09$/, s: S.VIS, t: ANY, role: 'deeper' },
        ],
        sims: [sim('rag-eval-gate')],
        labs: [play('rag-eval', 'RAG Evaluation Metrics Lab')],
      },
      {
        id: 'rag-observability',
        title: 'Tracing (Spans & OpenTelemetry), Drift, Latency & Cost Alerts',
        icon: '📈',
        blurb: 'Parent-child traces and spans, OpenTelemetry, LangSmith/Langfuse, embedding & query drift, stale index age & SLO alerting.',
        kw: /\b(trac|span|opentelemetry|langsmith|langfuse|observab|monitor|drift|alert|slo|telemetry|token cost|latency)\b/i,
        rules: [{ m: /^10$/, s: S.EVAL, t: ANY }],
        sims: [sim('rag-incident')],
        labs: [play('rag-observability', 'RAG Observability Lab')],
      },
      {
        id: 'rag-prod-security',
        title: 'Production RAG Debugging, Scaling, Caching & Security',
        icon: '🛡️',
        blurb: 'Backward pipeline failure debugging, semantic caching, Elasticsearch BM25 scaling, tenant ACL filtering, indirect prompt injection & PII guards.',
        kw: /\b(failure|debug|scal|performance|cach|semantic cache|acl|multi-?tenant|security|injection|pii|governance|elasticsearch|infrastructure|system design|deploy|docker|fastapi|azure|rate limit|blue-green|multi-region|api management|versioning)\b/i,
        rules: [
          { m: /^11$/, s: S.CORE, t: ANY },
          { m: /^11$/, s: S.BM25, t: ANY, role: 'practice' },
          { m: /^11$/, s: S.GRAPH, t: ANY, role: 'practice' },
          { m: /^11$/, s: S.GUIDE, t: ANY, role: 'practice' },
          { m: /^11$/, s: S.GM, t: ANY, role: 'deeper' },
          { m: /^11$/, s: S.BM25B, t: ANY, role: 'deeper' },
          { m: /^11$/, s: S.MCP, t: ANY, role: 'deeper' },
        ],
        sims: [sim('rag-multitenant'), sim('rag-semantic-cache')],
        labs: [play('injection', 'Prompt Injection Lab'), play('capstone-evaluator', 'Capstone AI Quality Gate Lab')],
      },
    ],
  },
]

let cached: ResolvedPath | null = null

export function getRagPath(): ResolvedPath {
  if (cached) return cached
  const all = (getCurriculumIndex().lessonsByTrack.veerarag || []).filter((l) => Number(l.title.slice(0, 2)) < 20)
  cached = resolvePath(all, STAGES)
  return cached
}
