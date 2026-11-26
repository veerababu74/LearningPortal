/**
 * Curated Mermaid diagrams for the VeeraRAG track.
 * Pinned by lesson title (`where.topic`) and section (`where.section`); validated by validate-diagrams.mjs.
 */
const CONCEPT = /concept explanation/i
const at = (topic, section = CONCEPT) => ({ topic, section, fallbackFirst: true })

export const RAG_DIAGRAMS = [
  /* ---------------------------------------------------------------- 01 foundations */
  {
    id: 'rag-architecture',
    where: at(/What is RAG — Definition/i),
    title: 'RAG = an offline indexing pipeline + an online query pipeline',
    mermaid: `
flowchart LR
  subgraph OFF["Offline — indexing (runs when documents change)"]
    direction TB
    D["Documents"] --> L["Load + parse"] --> C["Chunk"] --> E1["Embed chunks"] --> V[("Vector index + metadata")]
  end
  subgraph ON["Online — every question"]
    direction TB
    Q["User question"] --> E2["Embed query"] --> R["Retrieve top-k"] --> P["Prompt = instructions + chunks + question"] --> G["LLM generates grounded answer"]
  end
  V -. "similarity search" .-> R`,
    explain: `RAG has **two pipelines**. The offline one turns documents into searchable chunks and runs only when content changes. The online one runs for every question: embed the query, fetch the most similar chunks, and put them in the prompt so the model answers from *your* data instead of its memory. Most RAG bugs live in the offline half (bad parsing, bad chunks), even though they show up as bad answers.`,
  },
  {
    id: 'rag-vs-finetune',
    where: at(/RAG vs Fine-tuning/i),
    title: 'RAG, fine-tuning or prompt stuffing?',
    mermaid: `
flowchart TD
  S(["What does the model lack?"]) --> K{"Knowledge or behaviour?"}
  K -- "facts that change, private docs, need citations" --> R["RAG"]
  K -- "style, format, domain language, a skill" --> F["Fine-tuning"]
  K -- "a few pages that fit the context window" --> P["Prompt stuffing"]
  R --> B["Often: RAG for knowledge + light fine-tune for format"]
  F --> B`,
    explain: `Use **RAG** when the problem is *knowledge*: it changes, it is private, or answers need sources. Use **fine-tuning** when the problem is *behaviour*: tone, output format, domain jargon. If everything fits in the context window, just **put it in the prompt**. Production systems often combine RAG for facts with a small fine-tune for format.`,
  },
  {
    id: 'naive-advanced-modular',
    where: at(/Naive RAG vs Advanced RAG/i),
    title: 'Naive → Advanced → Modular RAG',
    mermaid: `
flowchart TB
  subgraph N["Naive RAG"]
    n1["retrieve top-k"] --> n2["generate"]
  end
  subgraph A["Advanced RAG"]
    a0["query rewrite"] --> a1["hybrid retrieve"] --> a2["rerank"] --> a3["compress"] --> a4["generate + cite"]
  end
  subgraph M["Modular RAG"]
    m0{"router"} --> m1["vector search"]
    m0 --> m2["SQL / API"]
    m0 --> m3["graph search"]
    m1 --> m4["grade + retry loop"]
    m2 --> m4
    m3 --> m4
    m4 --> m5["generate"]
  end`,
    explain: `**Naive RAG** is retrieve-then-generate. **Advanced RAG** adds steps around retrieval: rewrite the query before, rerank and compress after. **Modular RAG** treats each step as a swappable module and adds routing and feedback loops (grade, retry), which is the bridge to agentic RAG.`,
  },
  {
    id: 'grounding',
    where: at(/Grounding vs Hallucination/i),
    title: 'How grounding reduces hallucination',
    mermaid: `
flowchart LR
  Q["Question"] --> R["Retrieve evidence"]
  R --> C{"Relevant evidence found?"}
  C -- "yes" --> G["Answer only from evidence + cite sources"]
  C -- "no" --> I["Say: I don't know / ask to rephrase"]
  G --> V{"Every claim supported?"}
  V -- "no" --> X["Remove or flag unsupported claims"]
  V -- "yes" --> A(["Grounded answer"])`,
    explain: `Hallucinations drop when the model is **forced to use retrieved evidence** and is **allowed to say "I don't know"**. A post-check that every claim maps to a source (faithfulness) catches what slips through. Without the "no evidence" branch the model fills the gap from memory.`,
  },

  /* ---------------------------------------------------------------- 02 ingestion & chunking */
  {
    id: 'ingestion-pipeline',
    where: at(/Document Loaders/i),
    title: 'Ingestion pipeline with incremental updates',
    mermaid: `
flowchart LR
  S["Sources — PDF, DOCX, HTML, CSV, web"] --> L["Loader"] --> P["Parse — text, tables, images"]
  P --> CL["Clean — headers, footers, boilerplate"] --> MD["Metadata — source, page, section, ACL, date"]
  MD --> CH["Chunk"] --> H{"content hash changed?"}
  H -- "no" --> SKIP["skip, keep old vector"]
  H -- "yes" --> EM["Embed"] --> IX[("Upsert to index")]
  IX --> DEL["Delete chunks no longer in the doc"]`,
    explain: `Parsing quality decides retrieval quality. Keep **metadata** (source, page, section, permissions) on every chunk: you need it for citations and filtering. Hash each chunk so re-ingesting an unchanged document costs nothing, and delete chunks that disappeared so the index never cites outdated text.`,
  },
  {
    id: 'chunk-overlap',
    where: at(/Fixed-Size Chunking/i),
    title: 'Why chunks overlap',
    mermaid: `
flowchart LR
  T["…returns need proof of purchase within 30 days…"] --> A["chunk 1: …returns need proof of"]
  T --> B["chunk 2: proof of purchase within 30 days…"]
  A -. "overlap keeps the phrase whole in chunk 2" .- B`,
    explain: `Fixed-size splitting cuts text at arbitrary positions. **Overlap** (typically 10–20% of the chunk size) repeats the boundary text in both neighbours, so a sentence that crosses the cut is still retrievable in one piece. Too much overlap wastes storage and returns near-duplicate chunks.`,
  },
  {
    id: 'parent-child',
    where: at(/Hierarchical Chunking/i),
    title: 'Parent-child chunking: search small, return big',
    mermaid: `
flowchart TB
  P["Parent chunk — full section, about 2000 tokens"] --> C1["child — 200 tokens"]
  P --> C2["child — 200 tokens"]
  P --> C3["child — 200 tokens"]
  Q["query"] -. "matches precisely" .-> C2
  C2 -- "return its parent to the LLM" --> P`,
    explain: `Small chunks embed **precisely** (one idea each), large chunks give the LLM **enough context**. Parent-child chunking gets both: index the small children, and when a child matches, send its parent section to the model.`,
  },
  {
    id: 'semantic-chunking',
    where: at(/Semantic Chunking/i),
    title: 'Semantic chunking: split where the topic changes',
    mermaid: `
flowchart LR
  S1["sentence 1"] --> S2["sentence 2"] --> S3["sentence 3"] --> S4["sentence 4"] --> S5["sentence 5"]
  S2 -. "similarity 0.91" .- S1
  S3 -. "similarity 0.88" .- S2
  S4 -. "similarity 0.42 — topic shift, split here" .- S3
  S5 -. "similarity 0.86" .- S4`,
    explain: `Embed each sentence and compare neighbours. Where similarity **drops below a threshold** the topic changed, so a new chunk starts. Chunks follow meaning instead of character counts, at the cost of embedding every sentence during ingestion.`,
  },

  /* ---------------------------------------------------------------- 03 embeddings & vector DBs */
  {
    id: 'bi-vs-cross',
    where: at(/Bi-Encoder vs Cross-Encoder/i),
    title: 'Bi-encoder (retrieve) vs cross-encoder (rerank)',
    mermaid: `
flowchart LR
  subgraph BI["Bi-encoder — fast, precomputable"]
    q1["query"] --> eq["encoder"] --> vq["vector"]
    d1["document"] --> ed["encoder"] --> vd["vector"]
    vq --> cos["cosine similarity"]
    vd --> cos
  end
  subgraph CR["Cross-encoder — slow, more accurate"]
    pair["query + document together"] --> enc["encoder reads both"] --> sc["relevance score"]
  end`,
    explain: `A **bi-encoder** embeds query and documents separately, so document vectors are computed once and search is a fast vector lookup — ideal for retrieving from millions. A **cross-encoder** reads the query and a document *together*, which is far more accurate but must run per pair — so use it only to **rerank** the top 20–100.`,
  },
  {
    id: 'hnsw',
    where: at(/ANN Algorithms/i),
    title: 'HNSW: greedy search through layered graphs',
    mermaid: `
flowchart TB
  subgraph L2["Layer 2 — few nodes, long jumps"]
    a2["A"] --> e2["E"]
  end
  subgraph L1["Layer 1 — more nodes"]
    a1["A"] --> c1["C"] --> e1["E"] --> g1["G"]
  end
  subgraph L0["Layer 0 — every vector, short links"]
    e0["E"] --> f0["F"] --> h0["H — nearest to query"]
  end
  e2 --> e1
  g1 -.-> e0`,
    explain: `HNSW builds several graph layers. Search starts at the sparse top layer, hops greedily toward the query, then **drops a layer** and repeats with finer links until it reaches the nearest neighbours at layer 0. Parameters: **M** (links per node, memory) and **ef_search** (candidates explored, recall vs latency).`,
  },
  {
    id: 'vector-db-basics',
    where: at(/Vector DB Fundamentals/i),
    title: 'Inside a vector database query',
    mermaid: `
flowchart LR
  Q["query vector + filter tenant=acme"] --> F{"metadata pre-filter"}
  F --> ANN["ANN index search — HNSW or IVF"]
  ANN --> TOP["top-k ids + distances"]
  TOP --> FETCH["fetch payload — text, source, page"]
  FETCH --> OUT(["results"])`,
    explain: `A vector DB stores **vectors + payload + metadata** in collections. Queries combine an approximate nearest-neighbour search with **metadata filters** (tenant, date, permissions). Pick the distance metric your embedding model was trained for — usually cosine.`,
  },

  /* ---------------------------------------------------------------- 04 BM25 */
  {
    id: 'inverted-index',
    where: at(/^04\. [^:]+: Inverted Index$/i, /What Is an Inverted/i),
    title: 'Inverted index: term → posting list',
    mermaid: `
flowchart LR
  D1["doc1: refund policy for orders"] --> T1["refund → doc1, doc3"]
  D2["doc2: shipping policy"] --> T2["policy → doc1, doc2"]
  D3["doc3: refund within 30 days"] --> T3["shipping → doc2"]
  Q["query: refund policy"] --> T1
  Q --> T2
  T1 --> M["candidates: doc1 (both terms), doc2, doc3"]
  T2 --> M`,
    explain: `Instead of scanning every document, an inverted index maps each **term to the list of documents** that contain it (with term frequencies and positions). A query only reads the posting lists of its own terms, which is why keyword search stays fast over billions of documents.`,
  },
  {
    id: 'tfidf',
    where: at(/TF-IDF — Deep Dive/i, /Inverse Document/i),
    title: 'TF × IDF: frequent here, rare everywhere',
    mermaid: `
flowchart LR
  TF["TF — how often the term appears in this document"] --> S["TF-IDF score"]
  IDF["IDF = log(N / df) — how rare the term is across all documents"] --> S
  S --> R["'the' — high TF, IDF ≈ 0 → score ≈ 0"]
  S --> R2["'warranty' — moderate TF, high IDF → high score"]`,
    explain: `**Term frequency** rewards documents that mention the term a lot; **inverse document frequency** rewards rare terms because they are more informative. Their product makes common words like "the" worthless and distinctive words decisive.`,
  },
  {
    id: 'bm25-formula',
    where: at(/BM25 — Mathematical Foundations/i, /Full Formula/i),
    title: 'BM25 = IDF × saturated, length-normalised TF',
    mermaid: `
flowchart TB
  IDF["IDF(q) — rarity of the term"] --> X["score per term"]
  TF["tf — raw count in doc"] --> SAT["saturation: tf × (k1+1) / (tf + k1 × norm)"]
  LEN["norm = 1 − b + b × |d| / avgdl"] --> SAT
  SAT --> X
  X --> SUM["BM25(d, q) = sum over query terms"]
  K1["k1 ≈ 1.2 — how fast TF saturates"] -.-> SAT
  B["b ≈ 0.75 — how much long docs are penalised"] -.-> LEN`,
    explain: `BM25 fixes two TF-IDF problems. **Saturation (k1):** the 10th mention of a term adds little over the 3rd. **Length normalisation (b):** a long document mentions everything more often, so its TF is scaled down relative to the average length. Tune k1 and b per corpus; the defaults work surprisingly well.`,
  },

  /* ---------------------------------------------------------------- 05 retrieval, hybrid, reranking */
  {
    id: 'hybrid-rrf',
    where: at(/^05\. [^:]+: Hybrid Search$/i, /Why Hybrid/i),
    title: 'Hybrid search: BM25 + dense, fused with RRF',
    mermaid: `
flowchart LR
  Q["query"] --> B["BM25 — exact terms, codes, names"]
  Q --> D["dense vectors — meaning, paraphrases"]
  B --> R1["ranked list A"]
  D --> R2["ranked list B"]
  R1 --> F["RRF: score = sum 1 / (60 + rank)"]
  R2 --> F
  F --> RR["optional cross-encoder rerank"] --> OUT(["final top-k"])`,
    explain: `Keyword and vector search fail in **different** ways: BM25 misses paraphrases, embeddings miss exact codes and rare names. Running both and fusing the rankings with **Reciprocal Rank Fusion** (ranks, not raw scores) consistently beats either alone.`,
  },
  {
    id: 'two-stage-rerank',
    where: at(/Why Reranking Is Needed/i),
    title: 'Two-stage retrieval: recall first, precision second',
    mermaid: `
flowchart LR
  C[("1M chunks")] --> S1["Stage 1: fast retriever — top 50, ~20 ms"]
  S1 --> S2["Stage 2: cross-encoder reranker — scores 50 pairs, ~150 ms"]
  S2 --> K["keep top 4–5"] --> LLM["LLM"]`,
    explain: `The first stage is tuned for **recall** (do not miss the right chunk); the reranker is tuned for **precision** (put it first). Rerankers are too slow for a million documents but perfect for 50 — and passing fewer, better chunks makes the answer cheaper and more accurate.`,
  },
  {
    id: 'hyde',
    where: at(/HyDE/i),
    title: 'HyDE: search with a hypothetical answer',
    mermaid: `
flowchart LR
  Q["short question"] --> LLM["LLM writes a hypothetical answer"]
  LLM --> H["fake but on-topic paragraph"]
  H --> E["embed the paragraph"] --> V[("vector search")]
  V --> R(["real documents that look like an answer"])`,
    explain: `Questions and answers look different in embedding space. **HyDE** asks the LLM to draft a plausible answer and searches with *that*, because an answer-shaped text lands closer to real answer passages. The draft may contain wrong facts — it is only used for search, never shown to the user.`,
  },
  {
    id: 'query-rewrite',
    where: at(/Query Rewriting and Expansion/i),
    title: 'Query transformation options',
    mermaid: `
flowchart TB
  Q["user query"] --> RW["rewrite — fix typos, make it stand-alone"]
  Q --> MQ["multi-query — 3–5 paraphrases"]
  Q --> DC["decompose — split a multi-part question"]
  Q --> SB["step-back — ask a more general question first"]
  RW --> RET["retrieve for each"]
  MQ --> RET
  DC --> RET
  SB --> RET
  RET --> MERGE["merge + dedupe (RRF)"]`,
    explain: `Users ask short, vague or multi-part questions. **Rewriting** fixes them, **multi-query** widens recall, **decomposition** handles "compare X and Y", and **step-back** fetches background first. Each costs an extra LLM call, so apply them only when simple retrieval scores are low.`,
  },
  {
    id: 'citations',
    where: at(/Structured Output and Citation/i),
    title: 'Answers with verifiable citations',
    mermaid: `
flowchart LR
  CH["chunks numbered [1] [2] [3] with source + page"] --> P["prompt: cite like [n], refuse if missing"]
  P --> LLM["LLM — structured output"]
  LLM --> J["answer text + citations list"]
  J --> V{"each [n] exists and supports the sentence?"}
  V -- "yes" --> OUT(["render with links to source pages"])
  V -- "no" --> FIX["drop claim or re-generate"]`,
    explain: `Number every chunk and require the model to cite them in a structured output. Then **verify** that each citation exists and actually supports its sentence. Citations let users check answers and give you a measurable faithfulness signal.`,
  },

  /* ---------------------------------------------------------------- 07 advanced & agentic */
  {
    id: 'self-crag',
    where: at(/Self-RAG and Corrective RAG/i),
    title: 'Self-RAG and Corrective RAG',
    mermaid: `
flowchart TD
  Q["question"] --> D{"retrieval needed?"}
  D -- "no" --> G0["answer directly"]
  D -- "yes" --> R["retrieve"] --> GR{"grade chunks"}
  GR -- "correct" --> G["generate"]
  GR -- "ambiguous" --> RF["refine query"] --> R
  GR -- "incorrect" --> W["web search fallback"] --> G
  G --> H{"answer supported and useful?"}
  H -- "no" --> R
  H -- "yes" --> OUT(["answer"])`,
    explain: `**Self-RAG** lets the model decide *whether* to retrieve and critique its own output. **CRAG** grades retrieved chunks and takes a corrective action — refine the query or fall back to web search — when they are wrong. Both trade extra LLM calls for fewer confident wrong answers; always cap the loops.`,
  },
  {
    id: 'agentic-rag',
    where: at(/^07\. [^:]+: Agentic RAG$/i),
    title: 'Agentic RAG: retrieval as a tool',
    mermaid: `
flowchart LR
  U["question"] --> A["agent LLM"]
  A -- "search_docs" --> V[("vector store")]
  A -- "run_sql" --> DB[("warehouse")]
  A -- "web_search" --> W["web"]
  V --> A
  DB --> A
  W --> A
  A -- "enough evidence" --> OUT(["answer with sources"])`,
    explain: `In agentic RAG the model **chooses** which source to query, how many times, and when it has enough. That handles multi-hop and multi-source questions that a fixed pipeline cannot — but needs step limits, tool permissions and good tracing.`,
  },

  /* ---------------------------------------------------------------- 08 GraphRAG */
  {
    id: 'graphrag-pipeline',
    where: at(/Graph RAG Foundations/i),
    title: 'GraphRAG: build a knowledge graph, then retrieve from it',
    mermaid: `
flowchart LR
  subgraph IDX["Indexing"]
    T["text chunks"] --> EX["LLM extracts entities + relations"] --> KG[("knowledge graph")]
    KG --> CM["community detection"] --> SUM["community summaries"]
  end
  subgraph QRY["Querying"]
    Q["question"] --> LOC["local search — entity + neighbours"]
    Q --> GLO["global search — map-reduce over summaries"]
  end
  KG --> LOC
  SUM --> GLO`,
    explain: `Vector RAG finds *similar passages*; GraphRAG captures **who is connected to what**. Entities and relations become a graph; communities of related entities get summaries. **Local search** answers questions about specific entities; **global search** answers "what are the main themes?" questions that no single chunk can.`,
  },
  {
    id: 'ms-graphrag-global',
    where: at(/Microsoft GraphRAG Deep Dive/i),
    title: 'Microsoft GraphRAG global search (map-reduce)',
    mermaid: `
flowchart TB
  Q["global question: main risks across all reports?"] --> MAP["map: ask each community summary"]
  MAP --> A1["partial answer + score — community 1"]
  MAP --> A2["partial answer + score — community 2"]
  MAP --> A3["partial answer + score — community N"]
  A1 --> RED["reduce: keep top-scored partials"]
  A2 --> RED
  A3 --> RED
  RED --> OUT(["final synthesized answer"])`,
    explain: `Global search cannot fit the whole corpus into one prompt, so it **maps** the question over pre-computed community summaries, scores each partial answer, and **reduces** the best ones into a final answer. Powerful for sense-making questions, but indexing is expensive — every chunk goes through an LLM.`,
  },
  {
    id: 'leiden',
    where: at(/Community Detection Algorithms/i),
    title: 'Hierarchical communities (Leiden)',
    mermaid: `
flowchart TB
  R["level 0 — whole graph"] --> C1["level 1: Payments"]
  R --> C2["level 1: Logistics"]
  C1 --> C11["level 2: Refunds"]
  C1 --> C12["level 2: Fraud"]
  C2 --> C21["level 2: Carriers"]`,
    explain: `Community detection groups densely connected entities. **Leiden** produces a hierarchy: broad communities at the top, specific ones lower down. Summaries at each level let you answer questions at the right zoom level.`,
  },

  /* ---------------------------------------------------------------- 09 evaluation */
  {
    id: 'rag-metric-map',
    where: { topic: /RAG Evaluation: Retrieval, Generation/i, section: /Metric Map|RAGAS/i, fallbackFirst: true },
    title: 'RAG metric map',
    mermaid: `
flowchart LR
  Q["question"] --> RET["retriever"] --> CTX["retrieved context"] --> GEN["generator"] --> ANS["answer"]
  CTX -. "context precision — are the top results relevant?" .-> M1(["retrieval"])
  CTX -. "context recall — was everything needed retrieved?" .-> M1
  ANS -. "faithfulness — is every claim in the context?" .-> M2(["generation"])
  ANS -. "answer relevance — does it address the question?" .-> M2
  ANS -. "correctness vs reference answer" .-> M3(["end to end"])`,
    explain: `Measure the two halves separately so you know **where** a bad answer came from. Low context recall → fix chunking or retrieval. Good context but low faithfulness → fix the prompt or model. End-to-end correctness against a golden answer tells you whether users are actually helped.`,
  },
  {
    id: 'golden-loop',
    where: { topic: /Golden Datasets/i, section: /Golden Dataset → Eval|How to Build/i, fallbackFirst: true },
    title: 'Golden dataset → eval → release loop',
    mermaid: `
flowchart LR
  P["production logs + SME questions"] --> GD[("golden dataset — question, reference answer, source ids")]
  GD --> EV["run eval on every change"]
  EV --> G{"metrics ≥ baseline?"}
  G -- "yes" --> REL["release"]
  G -- "no" --> FIX["fix and re-run"]
  REL --> MON["monitor production"] --> P`,
    explain: `A **golden dataset** is a versioned set of questions with reference answers and the source chunks that should be retrieved. Run it on every prompt, model, chunking or index change and block releases that regress. Feed real failures from production back into the set.`,
  },
  {
    id: 'llm-judge',
    where: { topic: /LLM Evaluation: Metrics, Methods/i, section: /judge/i, fallbackFirst: true },
    title: 'LLM-as-a-judge, done carefully',
    mermaid: `
flowchart LR
  I["question + context + answer"] --> J["judge LLM with a rubric"]
  J --> S["score 1–5 + reasoning"]
  S --> CAL{"agrees with human labels on a sample?"}
  CAL -- "no" --> R["fix rubric / judge model"]
  CAL -- "yes" --> USE(["use at scale"])`,
    explain: `A judge LLM can grade thousands of answers cheaply, but it has biases (position, length, self-preference). Give it a **specific rubric**, ask for reasoning before the score, and **calibrate** it against human labels before trusting it.`,
  },

  /* ---------------------------------------------------------------- 10 observability */
  {
    id: 'trace-tree',
    where: { topic: /Tracing: Spans, Traces/i, section: /Trace Tree|Core Concepts/i, fallbackFirst: true },
    title: 'One RAG request as a trace',
    mermaid: `
flowchart TB
  T["trace: POST /ask — 2.4 s"] --> S1["span: rewrite_query — 0.3 s"]
  T --> S2["span: retrieve — 0.4 s"]
  S2 --> S21["span: embed_query — 0.05 s"]
  S2 --> S22["span: vector_search k=20 — 0.12 s"]
  S2 --> S23["span: rerank 20 to 4 — 0.2 s"]
  T --> S3["span: llm_generate — 1.6 s, 1,850 tokens, $0.004"]
  T --> S4["span: guardrails — 0.1 s"]`,
    explain: `A **trace** is one request; **spans** are its timed steps, nested parent → child. Record inputs, outputs, token counts, cost and errors on each span. When an answer is wrong or slow, the trace shows exactly which step caused it — and traces double as evaluation data.`,
  },
  {
    id: 'monitoring-pillars',
    where: { topic: /Production Monitoring: Drift/i, section: /Three Pillars|Drift/i, fallbackFirst: true },
    title: 'What to monitor in a production RAG system',
    mermaid: `
flowchart LR
  subgraph OPS["Operational"]
    o1["p95 latency"] --- o2["error rate"] --- o3["throughput"]
  end
  subgraph QUAL["Quality"]
    q1["faithfulness sample"] --- q2["empty-retrieval rate"] --- q3["thumbs down rate"]
  end
  subgraph DRIFT["Drift"]
    d1["query topic drift"] --- d2["embedding distribution shift"] --- d3["stale index age"]
  end
  subgraph COST["Cost"]
    c1["tokens per request"] --- c2["cost per day"] --- c3["cache hit rate"]
  end
  OPS --> AL{"SLO breached?"}
  QUAL --> AL
  DRIFT --> AL
  COST --> AL
  AL -- "yes" --> PAGE["alert + runbook"]`,
    explain: `Classic metrics (latency, errors) say the system is *up*; AI monitoring must also say it is *right*. Track **quality** on sampled traffic, **drift** in what users ask and in the index, and **cost** per request. Alert on SLOs with a runbook, not on every blip.`,
  },

  /* ---------------------------------------------------------------- 11 production */
  {
    id: 'failure-tree',
    where: at(/RAG Failure Modes/i),
    title: 'Debugging a bad answer: walk the pipeline backwards',
    mermaid: `
flowchart TD
  BAD(["bad answer"]) --> A{"was the right chunk retrieved?"}
  A -- "no" --> B{"is it in the index at all?"}
  B -- "no" --> FIX1["ingestion: parsing, chunking, missing doc, stale index"]
  B -- "yes" --> FIX2["retrieval: query rewrite, hybrid search, k, filters, embedding model"]
  A -- "yes" --> C{"was it in the final prompt?"}
  C -- "no" --> FIX3["reranking, compression or context-window truncation"]
  C -- "yes" --> FIX4["generation: prompt, model, conflicting chunks"]`,
    explain: `Debug **backwards** from the answer. If the right chunk was never retrieved, the problem is ingestion or retrieval; if it was retrieved but dropped, it is reranking or truncation; if the model saw it and still answered wrong, it is the prompt or model. Traces make each question a lookup instead of a guess.`,
  },
  {
    id: 'rag-security',
    where: at(/Security & Governance|Security and Governance/i),
    title: 'RAG trust boundaries',
    mermaid: `
flowchart LR
  U["user"] --> AUTH["auth — verified identity and groups"]
  AUTH --> RET["retrieval with ACL filter inside the query"]
  DOCS[("documents — untrusted content")] --> RET
  RET --> WRAP["wrap chunks as data, scan for injections"]
  WRAP --> LLM["LLM"]
  LLM --> OUT["output guard — PII, secrets, policy"]
  OUT --> U
  RET --> AUD[("audit log — who retrieved which chunk")]`,
    explain: `Documents are **untrusted input**: they can carry prompt injections. Enforce permissions *inside* the retrieval query, treat chunks as data, scan outputs for PII and secrets, and log who retrieved what. Every arrow that crosses a boundary needs a check.`,
  },
  {
    id: 'rag-infra',
    where: at(/Production RAG Reference Architecture/i),
    title: 'Production RAG system design',
    mermaid: `
flowchart LR
  subgraph ING["Ingestion workers"]
    Q1["queue"] --> W["parse, chunk, embed"]
  end
  W --> VDB[("vector DB + BM25 index")]
  API["API gateway — auth, rate limit"] --> CACHE{"semantic cache"}
  CACHE -- "miss" --> ORCH["RAG orchestrator"]
  ORCH --> VDB
  ORCH --> RR["reranker service"]
  ORCH --> LLMGW["LLM gateway — routing, retries, fallback"]
  ORCH --> OBS["tracing + metrics"]
  CACHE -- "hit" --> API`,
    explain: `Separate **ingestion** (async workers) from **serving**. The serving path adds a semantic cache in front, a reranker service, and an LLM gateway for routing, retries and fallbacks. Everything emits traces and metrics so quality and cost stay visible.`,
  },
]
