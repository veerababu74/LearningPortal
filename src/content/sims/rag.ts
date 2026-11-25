/**
 * RAG simulations: ingestion, query path, hybrid search, corrective RAG,
 * conversational rewriting, multi-tenant filtering and semantic caching.
 */
import type { AgentSim } from '@/content/agents/visualizer'

const RAG_HOME = '/tracks/rag'

/* ================================================================ ingestion */

const INGEST: AgentSim = {
  id: 'rag-ingestion',
  title: 'RAG ingestion: load, chunk, embed, index',
  framework: 'RAG',
  group: 'RAG',
  module: '08',
  home: RAG_HOME,
  level: 'Beginner',
  summary: 'Follow one PDF from upload to searchable vectors, including deduplication by content hash so unchanged files are not re-embedded.',
  scenario: 'HR uploads “leave-policy-2026.pdf” (12 pages). Last week\'s version is already indexed.',
  nodes: [
    { id: 'src', label: 'Source', sub: 'leave-policy.pdf', x: 90, y: 200, kind: 'user' },
    { id: 'parse', label: 'Loader + parser', sub: 'text, tables, headings', x: 280, y: 90, kind: 'service' },
    { id: 'hash', label: 'Dedupe', sub: 'sha256 per chunk', x: 280, y: 310, kind: 'guard' },
    { id: 'chunk', label: 'Chunker', sub: '800 tokens, 100 overlap', x: 500, y: 90, kind: 'tool' },
    { id: 'embed', label: 'Embedding model', sub: '1536-dim', x: 500, y: 310, kind: 'llm' },
    { id: 'vdb', label: 'Vector DB', sub: 'vectors + metadata', x: 710, y: 200, kind: 'memory' },
  ],
  edges: [
    { id: 's-p', from: 'src', to: 'parse' },
    { id: 'p-c', from: 'parse', to: 'chunk' },
    { id: 'c-h', from: 'chunk', to: 'hash' },
    { id: 'h-e', from: 'hash', to: 'embed' },
    { id: 'e-v', from: 'embed', to: 'vdb' },
  ],
  code: `def ingest(path: str, tenant: str):
    pages = PyMuPDFLoader(path).load()                          # text + page numbers
    chunks = RecursiveCharacterTextSplitter(
        chunk_size=800, chunk_overlap=100).split_documents(pages)
    new = []
    for c in chunks:
        c.metadata |= {"source": path, "tenant": tenant,
                       "hash": sha256(c.page_content.encode()).hexdigest()}
        if not index.exists(c.metadata["hash"]):               # skip unchanged text
            new.append(c)
    vectors = embedder.embed_documents([c.page_content for c in new])
    index.upsert(ids=[c.metadata["hash"] for c in new], vectors=vectors,
                 metadata=[c.metadata for c in new])
    index.delete(source=path, keep_hashes={c.metadata["hash"] for c in chunks})`,
  steps: [
    {
      title: 'Load and parse',
      edge: 's-p',
      packet: '12 pages',
      narration: 'The loader extracts text page by page and keeps page numbers — you will need them for citations.',
      state: { pages: '12', chunks: '0', new: '0', vectors_written: '0', stale_deleted: '0' },
      changed: ['pages'],
      log: 'load leave-policy-2026.pdf → 12 pages',
      hl: ['pages = PyMuPDFLoader'],
    },
    {
      title: 'Chunk with overlap',
      edge: 'p-c',
      packet: 'split',
      narration: 'Chunks of ~800 tokens with 100 tokens of overlap, split at paragraph boundaries first. Overlap keeps a sentence that crosses a boundary findable from both sides.',
      state: { pages: '12', chunks: '31', new: '0', vectors_written: '0', stale_deleted: '0' },
      changed: ['chunks'],
      log: 'split → 31 chunks',
      hl: ['chunks = RecursiveCharacterTextSplitter', 'chunk_size=800'],
      predict: {
        question: 'Last week\'s version had the same text on 27 of these 31 chunks. How many should be embedded again?',
        options: ['31 — always re-embed everything', '4 — only chunks whose content hash is new', '0 — the file name is the same', '27'],
        answer: 1,
        explain: 'Hashing chunk content makes ingestion incremental: identical text keeps its existing vector.',
      },
    },
    {
      title: 'Hash and dedupe',
      edge: 'c-h',
      packet: '31 hashes',
      narration: 'Each chunk gets a sha256 of its text, plus source and tenant metadata. 27 hashes already exist in the index.',
      state: { pages: '12', chunks: '31', new: '4', vectors_written: '0', stale_deleted: '0' },
      changed: ['new'],
      log: 'dedupe: 27 unchanged, 4 new',
      hl: ['"hash": sha256', 'if not index.exists'],
    },
    {
      title: 'Embed only new chunks',
      edge: 'h-e',
      packet: '4 chunks',
      narration: 'Embedding calls cost money and time; dedupe cut them by 87% here.',
      log: 'embed 4 chunks → 4 × 1536-dim vectors',
      hl: ['vectors = embedder.embed_documents'],
    },
    {
      title: 'Upsert and delete stale',
      edge: 'e-v',
      packet: 'upsert 4',
      node: 'vdb',
      tone: 'ok',
      narration: 'New vectors are upserted with their metadata; chunks from the old version that no longer exist are deleted, so retrieval never cites a removed rule.',
      state: { pages: '12', chunks: '31', new: '4', vectors_written: '4', stale_deleted: '3' },
      changed: ['vectors_written', 'stale_deleted'],
      log: 'upsert 4, delete 3 stale chunks',
      hl: ['index.upsert', 'index.delete(source=path'],
    },
  ],
  match: /ingestion|document loading|chunking|embedding|vector (database|index)|indexing|dedup|hashing|document intelligence|synchroni[sz]ation|deletion/i,
  takeaways: ['Keep page/section metadata for citations and filtering.', 'Hash chunk text to re-embed only what changed.', 'Delete stale chunks when a document is updated.'],
}

/* ================================================================ query path */

const QUERY: AgentSim = {
  id: 'rag-query',
  title: 'RAG query path: retrieve, rerank, generate with citations',
  framework: 'RAG',
  group: 'RAG',
  module: '08',
  home: RAG_HOME,
  level: 'Beginner',
  summary: 'A question becomes a vector, pulls 20 candidates, a cross-encoder reranks them to 4, and the model answers only from those, with citations.',
  scenario: 'Employee asks: “How many sick days do I get per year?”',
  nodes: [
    { id: 'q', label: 'Question', x: 90, y: 200, kind: 'user' },
    { id: 'emb', label: 'Embed query', x: 260, y: 80, kind: 'llm' },
    { id: 'vdb', label: 'Vector DB', sub: 'top-k = 20', x: 470, y: 80, kind: 'memory' },
    { id: 'rr', label: 'Reranker', sub: 'cross-encoder → 4', x: 680, y: 140, kind: 'guard' },
    { id: 'prompt', label: 'Prompt builder', sub: 'context + rules', x: 470, y: 310, kind: 'service' },
    { id: 'llm', label: 'LLM', sub: 'answer + cite', x: 240, y: 330, kind: 'llm' },
  ],
  edges: [
    { id: 'q-e', from: 'q', to: 'emb' },
    { id: 'e-v', from: 'emb', to: 'vdb' },
    { id: 'v-r', from: 'vdb', to: 'rr' },
    { id: 'r-p', from: 'rr', to: 'prompt' },
    { id: 'p-l', from: 'prompt', to: 'llm' },
    { id: 'l-q', from: 'llm', to: 'q' },
  ],
  code: `def answer(question: str) -> str:
    qvec = embedder.embed_query(question)
    candidates = index.search(qvec, k=20, filter={"tenant": user.tenant})
    ranked = reranker.rank(question, [c.text for c in candidates])[:4]
    context = "\\n\\n".join(f"[{i+1}] ({c.source} p.{c.page}) {c.text}"
                          for i, c in enumerate(ranked))
    prompt = f"""Answer ONLY from the context. Cite like [1].
If the context does not contain the answer, say you don't know.

Context:
{context}

Question: {question}"""
    return llm.invoke(prompt).content`,
  steps: [
    {
      title: 'Embed the question',
      edge: 'q-e',
      packet: '"sick days per year?"',
      narration: 'The question is embedded with the same model used for documents, so both live in the same vector space.',
      state: { candidates: '—', reranked: [], context_tokens: '0' },
      log: 'embed_query → 1536-dim vector',
      hl: ['qvec = embedder.embed_query'],
    },
    {
      title: 'Vector search: top 20',
      edge: 'e-v',
      packet: 'qvec',
      narration: 'Approximate nearest-neighbour search returns the 20 most similar chunks. Recall matters here; precision comes next.',
      state: { candidates: '20 (cosine 0.71 – 0.83)', reranked: [], context_tokens: '0' },
      changed: ['candidates'],
      log: 'ANN search k=20',
      hl: ['candidates = index.search'],
    },
    {
      title: 'Rerank to 4',
      edge: 'v-r',
      packet: '20 chunks',
      narration: 'A cross-encoder reads question and chunk together and scores true relevance. “Sick leave: 12 days” jumps from rank 9 to rank 1.',
      state: { candidates: '20', reranked: ['[1] policy p.4: 12 paid sick days/yr (0.96)', '[2] policy p.4: doctor note after 3 days (0.81)', '[3] FAQ: unused sick days do not roll over (0.74)', '[4] policy p.5: sick leave during probation (0.62)'], context_tokens: '0' },
      changed: ['reranked'],
      log: 'rerank 20 → 4 (best was rank 9 before)',
      hl: ['ranked = reranker.rank'],
      predict: {
        question: 'Why not just send all 20 candidates to the LLM?',
        options: ['The LLM cannot read 20 chunks', 'More irrelevant context lowers answer quality and raises cost', 'Rerankers are free', 'Vector DBs cannot return 20'],
        answer: 1,
        explain: 'Noise distracts the model (“lost in the middle”) and every token costs money and latency.',
      },
    },
    {
      title: 'Build a grounded prompt',
      edge: 'r-p',
      packet: '4 chunks',
      narration: 'Each chunk is numbered with source and page, and the instructions require citations and an explicit “I don\'t know”.',
      state: { candidates: '20', reranked: ['[1] p.4 12 days', '[2] p.4 note after 3 days', '[3] FAQ no rollover', '[4] p.5 probation'], context_tokens: '1,140' },
      changed: ['context_tokens'],
      log: 'prompt: 1,140 context tokens',
      hl: ['context = "\\n\\n".join', 'Answer ONLY from the context', 'If the context does not contain'],
    },
    {
      title: 'Generate',
      edge: 'p-l',
      packet: 'prompt',
      narration: 'The model answers from the provided context.',
      log: 'LLM call',
      hl: ['return llm.invoke(prompt).content'],
    },
    {
      title: 'Answer with citations',
      edge: 'l-q',
      packet: '12 days [1], note after 3 [2]',
      node: 'q',
      tone: 'ok',
      narration: '“You get 12 paid sick days per year [1]; a doctor\'s note is needed after 3 consecutive days [2]. Unused days don\'t roll over [3].” Citations let users verify, and let you evaluate faithfulness.',
      log: 'answer with 3 citations',
    },
  ],
  match: /rag|retriev|architecture|reranking|generation|context checking|complete practical|enterprise knowledge/i,
  takeaways: ['Retrieve wide (k≈20), then rerank narrow (≈4).', 'Number chunks with source and page; require citations.', 'Tell the model to say “I don\'t know”.'],
}

/* ================================================================ hybrid search */

const HYBRID: AgentSim = {
  id: 'rag-hybrid',
  title: 'Hybrid search: BM25 + vectors fused with RRF',
  framework: 'RAG',
  group: 'RAG',
  module: '08',
  home: RAG_HOME,
  level: 'Intermediate',
  summary: 'Keyword search finds exact codes and names; vector search finds paraphrases. Reciprocal Rank Fusion combines both rankings.',
  scenario: 'Query: “error E-4012 when exporting payroll”. The fix is in a doc that never says “exporting”.',
  nodes: [
    { id: 'q', label: 'Query', x: 90, y: 200, kind: 'user' },
    { id: 'bm', label: 'BM25 keyword', sub: 'exact terms', x: 330, y: 80, kind: 'tool' },
    { id: 'vec', label: 'Vector search', sub: 'meaning', x: 330, y: 320, kind: 'memory' },
    { id: 'rrf', label: 'RRF fusion', sub: '1 / (60 + rank)', x: 570, y: 200, kind: 'router' },
    { id: 'out', label: 'Top results', x: 740, y: 200, kind: 'end' },
  ],
  edges: [
    { id: 'q-b', from: 'q', to: 'bm' },
    { id: 'q-v', from: 'q', to: 'vec' },
    { id: 'b-r', from: 'bm', to: 'rrf' },
    { id: 'v-r', from: 'vec', to: 'rrf' },
    { id: 'r-o', from: 'rrf', to: 'out' },
  ],
  code: `def hybrid(query: str, k: int = 10) -> list[str]:
    kw = bm25.search(query, k=50)              # ranks by exact term overlap
    sem = index.search(embed(query), k=50)     # ranks by meaning
    scores = defaultdict(float)
    for ranking in (kw, sem):
        for rank, doc_id in enumerate(ranking, start=1):
            scores[doc_id] += 1 / (60 + rank)  # Reciprocal Rank Fusion
    return sorted(scores, key=scores.get, reverse=True)[:k]`,
  steps: [
    {
      title: 'Keyword search',
      edge: 'q-b',
      packet: '"E-4012"',
      narration: 'BM25 matches the exact error code. Embeddings are notoriously weak at rare codes, SKUs and names.',
      state: { bm25: ['#1 KB-88 “E-4012: payroll file lock”', '#2 KB-12 “error codes list”'], vector: [], fused: [] },
      changed: ['bm25'],
      log: 'BM25: KB-88 rank 1',
      hl: ['kw = bm25.search'],
    },
    {
      title: 'Vector search',
      edge: 'q-v',
      packet: 'embedding',
      narration: 'Vector search matches meaning — “exporting payroll” ≈ “download salary report” — but misses the code.',
      state: { bm25: ['#1 KB-88', '#2 KB-12'], vector: ['#1 KB-40 “download salary report fails”', '#2 KB-88 “payroll file lock”'], fused: [] },
      changed: ['vector'],
      log: 'vector: KB-40 rank 1, KB-88 rank 2',
      hl: ['sem = index.search'],
      predict: {
        question: 'Which document should come out on top after fusion?',
        options: ['KB-12 (error list)', 'KB-40 (only in vector results)', 'KB-88 (ranked high in both)', 'They tie'],
        answer: 2,
        explain: 'RRF rewards documents that rank well in both lists: 1/61 + 1/62 beats a single 1/61.',
      },
    },
    {
      title: 'BM25 ranks flow into RRF',
      edge: 'b-r',
      packet: 'ranks',
      narration: 'RRF uses ranks, not raw scores, so BM25 scores and cosine similarities never need to be normalized against each other.',
      log: 'RRF += 1/(60+rank) for BM25 list',
      hl: ['for rank, doc_id in enumerate', 'scores[doc_id] += 1 / (60 + rank)'],
    },
    {
      title: 'Vector ranks flow into RRF',
      edge: 'v-r',
      packet: 'ranks',
      node: 'rrf',
      narration: 'KB-88: 1/61 + 1/62 = 0.0325. KB-40: 1/61 = 0.0164. KB-12: 1/62 = 0.0161.',
      state: { bm25: ['#1 KB-88', '#2 KB-12'], vector: ['#1 KB-40', '#2 KB-88'], fused: ['KB-88 0.0325', 'KB-40 0.0164', 'KB-12 0.0161'] },
      changed: ['fused'],
      log: 'fused scores computed',
    },
    {
      title: 'Fused ranking',
      edge: 'r-o',
      packet: 'KB-88 first',
      tone: 'ok',
      narration: 'The doc that both methods agree on wins. Send the fused list to a reranker for the final top 4.',
      log: 'top: KB-88, KB-40, KB-12',
      hl: ['return sorted(scores'],
    },
  ],
  match: /hybrid|bm25|retrieval strategies|retrieval engineering|deep retrieval debugging|cannot find the correct chunks/i,
  takeaways: ['Keywords catch codes and names; vectors catch paraphrases.', 'RRF fuses by rank, so no score normalization is needed.', 'Rerank the fused list.'],
}

/* ================================================================ corrective RAG */

const CRAG: AgentSim = {
  id: 'rag-corrective',
  title: 'Corrective RAG: grade, then fall back to web search',
  framework: 'LangGraph',
  group: 'RAG',
  module: '08',
  home: RAG_HOME,
  level: 'Intermediate',
  summary: 'When the internal knowledge base has nothing relevant, CRAG strips the bad chunks and searches the web instead of hallucinating.',
  scenario: 'Question: “What did the EU AI Act require from August 2026?” The internal KB only has 2024 drafts.',
  nodes: [
    { id: 'q', label: 'Question', x: 90, y: 200, kind: 'user' },
    { id: 'ret', label: 'Retrieve', sub: 'internal KB', x: 280, y: 90, kind: 'memory' },
    { id: 'grade', label: 'Grade docs', sub: 'relevant / stale', x: 490, y: 90, kind: 'guard' },
    { id: 'web', label: 'Web search', sub: 'fallback', x: 490, y: 320, kind: 'tool' },
    { id: 'gen', label: 'Generate', x: 700, y: 200, kind: 'llm' },
  ],
  edges: [
    { id: 'q-r', from: 'q', to: 'ret' },
    { id: 'r-g', from: 'ret', to: 'grade' },
    { id: 'g-w', from: 'grade', to: 'web', label: 'not enough' },
    { id: 'w-gen', from: 'web', to: 'gen' },
    { id: 'g-gen', from: 'grade', to: 'gen', label: 'relevant' },
  ],
  code: `def grade(state):
    graded = [d for d in state["docs"]
              if grader.invoke({"q": state["question"], "doc": d}).verdict == "relevant"]
    return {"docs": graded, "need_web": len(graded) < 2}

def web_search(state):
    hits = tavily.search(state["question"], max_results=4)
    return {"docs": state["docs"] + [h["content"] for h in hits], "used_web": True}

builder.add_conditional_edges("grade", lambda s: "web_search" if s["need_web"] else "generate")
builder.add_edge("web_search", "generate")`,
  steps: [
    {
      title: 'Retrieve from the KB',
      edge: 'q-r',
      packet: 'question',
      narration: 'Normal retrieval first — internal knowledge is cheaper and more trusted.',
      state: { docs: [], need_web: '—', used_web: 'false' },
      log: 'retrieve → 4 chunks',
    },
    {
      title: 'Grade every chunk',
      edge: 'r-g',
      packet: '4 chunks',
      narration: 'All four chunks are 2024 drafts; the grader marks them stale or irrelevant for an “August 2026” question.',
      state: { docs: ['2024 draft art.6 (stale)', '2024 draft annex III (stale)', 'GDPR summary (irrelevant)', 'AI policy v1 (irrelevant)'], need_web: '—', used_web: 'false' },
      changed: ['docs'],
      log: 'grader: 0 relevant of 4',
      hl: ['def grade', 'grader.invoke'],
      predict: {
        question: 'Fewer than 2 relevant chunks remain. What does CRAG do?',
        options: ['Answer from the 2024 drafts', 'Refuse immediately', 'Search the web for fresh sources', 'Retry the same retrieval'],
        answer: 2,
        explain: 'Corrective RAG replaces missing knowledge with an external search instead of guessing.',
      },
    },
    {
      title: 'Fallback to web search',
      edge: 'g-w',
      packet: 'need_web = true',
      tone: 'warn',
      narration: 'Bad chunks are dropped and the router sends the question to web search.',
      state: { docs: [], need_web: 'true', used_web: 'false' },
      changed: ['docs', 'need_web'],
      log: 'route → web_search',
      hl: ['return {"docs": graded, "need_web"', 'add_conditional_edges("grade"'],
    },
    {
      title: 'Fresh sources',
      edge: 'w-gen',
      packet: '4 web results',
      node: 'gen',
      narration: 'Web results are added as context. Treat them as untrusted: wrap them, cite them, and never let them trigger tools.',
      state: { docs: ['eur-lex: GPAI obligations…', 'commission FAQ: high-risk timeline…', 'news: Aug 2 2026 applicability…', 'law firm brief'], need_web: 'true', used_web: 'true' },
      changed: ['docs', 'used_web'],
      log: 'web_search → 4 sources',
      hl: ['hits = tavily.search'],
    },
    {
      title: 'Generate with sources',
      node: 'gen',
      tone: 'ok',
      narration: 'The answer cites the web sources and says it came from outside the internal KB, so users know how much to trust it.',
      log: 'answer (source: web, 3 citations)',
    },
  ],
  match: /corrective|crag|context checking|agentic rag|adaptive rag|self-rag/i,
  takeaways: ['Grade retrieved chunks before generating.', 'Fall back to another source instead of guessing.', 'Label and cite external sources.'],
}

/* ================================================================ conversational RAG */

const CONVO: AgentSim = {
  id: 'rag-conversational',
  title: 'Conversational RAG: rewrite follow-ups before searching',
  framework: 'RAG',
  group: 'RAG',
  module: '08',
  home: RAG_HOME,
  level: 'Beginner',
  summary: 'Follow-up questions like “and for contractors?” are useless as search queries. A condense step turns them into stand-alone questions.',
  scenario: 'Turn 1: “What is the parental leave policy?” Turn 2: “And for contractors?”',
  nodes: [
    { id: 'u', label: 'User turn 2', sub: '“and for contractors?”', x: 100, y: 200, kind: 'user' },
    { id: 'hist', label: 'Chat history', x: 300, y: 70, kind: 'memory' },
    { id: 'cond', label: 'Condense', sub: 'LLM rewrite', x: 300, y: 320, kind: 'llm' },
    { id: 'ret', label: 'Retriever', x: 530, y: 320, kind: 'tool' },
    { id: 'gen', label: 'Answer', sub: 'history + context', x: 700, y: 180, kind: 'llm' },
  ],
  edges: [
    { id: 'u-c', from: 'u', to: 'cond' },
    { id: 'h-c', from: 'hist', to: 'cond' },
    { id: 'c-r', from: 'cond', to: 'ret' },
    { id: 'r-g', from: 'ret', to: 'gen' },
    { id: 'h-g', from: 'hist', to: 'gen' },
  ],
  code: `CONDENSE = """Given the conversation and a follow-up question, rewrite the
follow-up as a stand-alone question. Do not answer it.

Conversation:
{history}
Follow-up: {question}
Stand-alone question:"""

def chat_turn(history, question):
    standalone = llm.invoke(CONDENSE.format(history=history[-6:], question=question)).content
    docs = retriever.invoke(standalone)
    return llm.invoke(answer_prompt(history, docs, question)).content`,
  steps: [
    {
      title: 'Naive search would fail',
      edge: 'u-c',
      packet: '“and for contractors?”',
      tone: 'warn',
      narration: 'Searching for “and for contractors?” returns random contractor documents — the topic (parental leave) is missing.',
      state: { query: 'and for contractors?', history: ['user: parental leave policy?', 'ai: 26 weeks paid for employees…'] },
      log: 'raw follow-up has no topic',
      predict: {
        question: 'What should be sent to the retriever?',
        options: ['“and for contractors?”', '“What is the parental leave policy for contractors?”', 'The full chat transcript', 'Only “contractors”'],
        answer: 1,
        explain: 'A stand-alone question carries the topic from history and the new constraint from the follow-up.',
      },
    },
    {
      title: 'Use recent history',
      edge: 'h-c',
      packet: 'last 6 messages',
      narration: 'The condense step reads a short window of history, not the whole conversation.',
      log: 'condense with 2 history messages',
      hl: ['history=history[-6:]'],
    },
    {
      title: 'Stand-alone question',
      edge: 'c-r',
      packet: 'parental leave for contractors',
      node: 'ret',
      narration: 'The rewritten query is complete on its own and retrieves the right section.',
      state: { query: 'What is the parental leave policy for contractors?', history: ['user: parental leave policy?', 'ai: 26 weeks paid for employees…'] },
      changed: ['query'],
      log: 'standalone: "What is the parental leave policy for contractors?"',
      hl: ['standalone = llm.invoke(CONDENSE', 'docs = retriever.invoke(standalone)'],
    },
    {
      title: 'Answer with history + context',
      edge: 'r-g',
      packet: 'contractor policy §7',
      node: 'gen',
      tone: 'ok',
      narration: 'The final answer uses the retrieved section and the conversation, so it can contrast: “Unlike employees, contractors get 2 weeks unpaid.”',
      log: 'answer: contractors get 2 weeks unpaid [§7]',
      hl: ['return llm.invoke(answer_prompt'],
    },
  ],
  match: /conversational|memory engineering|chat history|follow-?up|query transformation/i,
  takeaways: ['Rewrite follow-ups into stand-alone questions before retrieval.', 'Use a short history window.', 'Answer with both history and retrieved context.'],
}

/* ================================================================ multi-tenant ACL */

const ACL: AgentSim = {
  id: 'rag-multitenant',
  title: 'Multi-tenant RAG: filter by permission inside the search',
  framework: 'RAG',
  group: 'RAG',
  module: '09',
  home: RAG_HOME,
  level: 'Advanced',
  summary: 'Filtering after retrieval leaks data and wastes recall. The permission filter must be part of the vector query itself.',
  scenario: 'An employee in Sales asks “What are the salary bands for engineers?” Salary docs are HR-only.',
  nodes: [
    { id: 'u', label: 'Sales employee', sub: 'groups: sales, all', x: 100, y: 200, kind: 'user' },
    { id: 'auth', label: 'Auth', sub: 'JWT → groups', x: 300, y: 90, kind: 'guard' },
    { id: 'vdb', label: 'Vector DB', sub: 'filter in query', x: 540, y: 90, kind: 'memory' },
    { id: 'gen', label: 'LLM', x: 540, y: 320, kind: 'llm' },
    { id: 'audit', label: 'Audit log', x: 740, y: 200, kind: 'service' },
  ],
  edges: [
    { id: 'u-a', from: 'u', to: 'auth' },
    { id: 'a-v', from: 'auth', to: 'vdb' },
    { id: 'v-g', from: 'vdb', to: 'gen' },
    { id: 'g-u', from: 'gen', to: 'u' },
    { id: 'v-au', from: 'vdb', to: 'audit' },
  ],
  code: `def secure_search(question: str, token: str):
    user = verify_jwt(token)                                  # never trust client-sent groups
    allowed = {"tenant": user.tenant, "acl_groups": {"$in": user.groups}}
    hits = index.search(embed(question), k=8, filter=allowed)  # filter INSIDE the ANN query
    audit.log(user.id, question, [h.id for h in hits])
    return hits

# ✗ Anti-pattern: search everything, then drop what the user can't see
# hits = [h for h in index.search(qvec, k=8) if h.acl & user.groups]`,
  steps: [
    {
      title: 'Verify identity',
      edge: 'u-a',
      packet: 'JWT',
      narration: 'Groups come from a verified token on the server, never from a field the client sends.',
      state: { user_groups: ['sales', 'all'], filter: '—', results: [] },
      changed: ['user_groups'],
      log: 'verify_jwt → groups [sales, all]',
      hl: ['user = verify_jwt(token)'],
    },
    {
      title: 'Search with the filter',
      edge: 'a-v',
      packet: 'filter acl ∈ {sales, all}',
      node: 'vdb',
      narration: 'The metadata filter is applied by the vector DB during the nearest-neighbour search, so HR-only chunks are never candidates.',
      state: { user_groups: ['sales', 'all'], filter: 'tenant=acme AND acl_groups IN (sales, all)', results: [] },
      changed: ['filter'],
      log: 'ANN search with ACL filter',
      hl: ['allowed = {"tenant"', 'hits = index.search(embed(question), k=8, filter=allowed)'],
      predict: {
        question: 'Why is “retrieve top-8, then remove forbidden chunks” worse?',
        options: ['It is slower to code', 'If all top-8 are HR-only, the user gets 0 results, and forbidden text may reach logs or caches', 'Vector DBs do not support it', 'It is exactly the same'],
        answer: 1,
        explain: 'Post-filtering destroys recall and lets protected content flow through parts of the system before it is removed.',
      },
    },
    {
      title: 'Only permitted chunks',
      edge: 'v-g',
      packet: '3 public chunks',
      node: 'gen',
      narration: 'The salary-band document is invisible. What remains: the public careers page about levels.',
      state: { user_groups: ['sales', 'all'], filter: 'tenant=acme AND acl_groups IN (sales, all)', results: ['careers: engineering levels L1–L6', 'handbook: how compensation reviews work', 'FAQ: who to ask about pay'] },
      changed: ['results'],
      log: 'results: 3 permitted chunks (HR docs excluded)',
    },
    {
      title: 'Audit the access',
      edge: 'v-au',
      packet: 'user, query, chunk ids',
      node: 'audit',
      narration: 'Logging who retrieved which chunk ids makes leaks investigable.',
      log: 'audit: u-311 retrieved [c12, c40, c77]',
      hl: ['audit.log'],
    },
    {
      title: 'Safe answer',
      edge: 'g-u',
      packet: 'ask HR for bands',
      node: 'u',
      tone: 'ok',
      narration: '“Engineering has levels L1–L6; specific salary bands are shared by HR — contact your HR partner.” No leak, still helpful.',
      log: 'answer without restricted data',
    },
  ],
  match: /multi-tenant|authori[sz]ation|security and governance|pii|leakage|trust boundar|access control/i,
  takeaways: ['Derive permissions from a verified token.', 'Apply ACL filters inside the vector query, never after.', 'Audit which chunks each user retrieved.'],
}

/* ================================================================ semantic cache */

const CACHE: AgentSim = {
  id: 'rag-semantic-cache',
  title: 'Semantic cache: answer repeated questions without the LLM',
  framework: 'RAG',
  group: 'RAG',
  module: '09',
  home: RAG_HOME,
  level: 'Intermediate',
  summary: 'Similar questions hit a cache of previous answers keyed by embedding. A strict threshold and an index version prevent wrong or stale hits.',
  scenario: '“How do I reset my VPN password?” was answered an hour ago. Now someone asks “VPN password reset steps?”',
  nodes: [
    { id: 'q', label: 'Question', x: 100, y: 200, kind: 'user' },
    { id: 'cache', label: 'Semantic cache', sub: 'sim ≥ 0.95', x: 340, y: 200, kind: 'memory' },
    { id: 'rag', label: 'Full RAG', sub: 'retrieve + LLM', x: 600, y: 320, kind: 'llm' },
    { id: 'out', label: 'Answer', x: 600, y: 80, kind: 'end' },
  ],
  edges: [
    { id: 'q-c', from: 'q', to: 'cache' },
    { id: 'c-o', from: 'cache', to: 'out', label: 'hit' },
    { id: 'c-r', from: 'cache', to: 'rag', label: 'miss' },
    { id: 'r-c', from: 'rag', to: 'cache', bend: 40 },
  ],
  code: `def cached_answer(question: str) -> str:
    qvec = embed(question)
    hit = cache.nearest(qvec, filter={"index_version": INDEX_VERSION, "tenant": user.tenant})
    if hit and cosine(qvec, hit.vector) >= 0.95:
        return hit.answer                              # ~30 ms, $0
    answer = rag_answer(question)                      # ~2.5 s, ~$0.004
    cache.put(qvec, answer, index_version=INDEX_VERSION, tenant=user.tenant, ttl=86400)
    return answer`,
  steps: [
    {
      title: 'Look up by meaning',
      edge: 'q-c',
      packet: '“VPN password reset steps?”',
      narration: 'The question is embedded and compared with cached questions from the same tenant and the same index version.',
      state: { similarity: '—', result: '—', latency: '—', cost: '—' },
      log: 'cache.nearest(qvec)',
      hl: ['hit = cache.nearest'],
    },
    {
      title: 'Hit: similarity 0.97',
      edge: 'c-o',
      packet: 'cached answer',
      node: 'out',
      tone: 'ok',
      narration: 'Similarity 0.97 ≥ 0.95, so the cached answer is returned in ~30 ms at no LLM cost.',
      state: { similarity: '0.97', result: 'HIT', latency: '30 ms', cost: '$0' },
      changed: ['similarity', 'result', 'latency', 'cost'],
      log: 'HIT 0.97 → return cached',
      hl: ['if hit and cosine', 'return hit.answer'],
      predict: {
        question: 'Next question: “How do I reset my email password?” (similarity 0.91 to the VPN one). What should happen?',
        options: ['Return the VPN answer — it is close enough', 'Miss: run full RAG, because 0.91 < 0.95', 'Lower the threshold to 0.9 automatically', 'Return nothing'],
        answer: 1,
        explain: 'Semantically close is not the same question. A loose threshold returns confidently wrong answers.',
      },
    },
    {
      title: 'Different question → miss',
      edge: 'c-r',
      packet: '“email password?” 0.91',
      node: 'rag',
      tone: 'warn',
      narration: 'The email question is below the threshold, so it goes through full retrieval and generation.',
      state: { similarity: '0.91', result: 'MISS', latency: '2.5 s', cost: '$0.004' },
      changed: ['similarity', 'result', 'latency', 'cost'],
      log: 'MISS 0.91 → full RAG',
      hl: ['answer = rag_answer(question)'],
    },
    {
      title: 'Store the new answer',
      edge: 'r-c',
      packet: 'put(answer)',
      node: 'cache',
      narration: 'The answer is cached with a TTL and the current index version. Re-indexing bumps the version, which invalidates every old answer at once.',
      log: 'cache.put(ttl=24h, index_version=v42)',
      hl: ['cache.put(qvec, answer, index_version'],
    },
  ],
  match: /cach|cost optimi[sz]ation|finops|latency|performance engineering|cost management/i,
  takeaways: ['Use a strict similarity threshold.', 'Scope cache entries by tenant and index version.', 'Bumping the index version invalidates stale answers.'],
}

export const RAG_SIMS: AgentSim[] = [INGEST, QUERY, HYBRID, CRAG, CONVO, ACL, CACHE]
