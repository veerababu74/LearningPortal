/**
 * More VeeraRAG simulations: BM25 scoring, GraphRAG, evaluation gate, production incident, multi-query.
 */
import type { AgentSim } from '@/content/agents/visualizer'

/* ================================================================ BM25 scoring */

const BM25: AgentSim = {
  id: 'rag-bm25-scoring',
  title: 'BM25 scoring, number by number',
  framework: 'BM25',
  group: 'RAG',
  module: '08',
  ragModule: '04',
  home: '/rag/learn/04',
  level: 'Intermediate',
  summary: 'Score four documents for “refund policy”: IDF for each term, TF saturation, length normalisation — and see why the document that repeats “refund” still loses.',
  scenario: 'Corpus of 4 short docs, query “refund policy”, k1 = 1.2, b = 0.75. avgdl = 6 words.',
  nodes: [
    { id: 'q', label: 'Query', sub: 'refund policy', x: 90, y: 200, kind: 'user' },
    { id: 'tok', label: 'Tokenise', sub: 'lowercase, split', x: 270, y: 200, kind: 'tool' },
    { id: 'inv', label: 'Inverted index', sub: 'term → docs + tf', x: 460, y: 80, kind: 'memory' },
    { id: 'idf', label: 'IDF per term', sub: 'rarity', x: 460, y: 320, kind: 'router' },
    { id: 'score', label: 'BM25 score', sub: 'sum over terms', x: 680, y: 200, kind: 'llm' },
  ],
  edges: [
    { id: 'q-t', from: 'q', to: 'tok' },
    { id: 't-i', from: 'tok', to: 'inv' },
    { id: 'i-d', from: 'inv', to: 'idf' },
    { id: 'i-s', from: 'inv', to: 'score' },
    { id: 'd-s', from: 'idf', to: 'score' },
  ],
  code: `import math
docs = {"d1": "refund policy for damaged items",                      # 5 words
        "d2": "shipping policy for international orders",              # 5 words
        "d3": "request a refund then track the refund status online",  # 9 words
        "d4": "privacy policy for customer data"}                     # 5 words
N, avgdl, k1, b = 4, 6.0, 1.2, 0.75

def idf(df):
    return math.log((N - df + 0.5) / (df + 0.5) + 1)

def term_score(tf, dl, df):
    norm = 1 - b + b * dl / avgdl                    # length normalisation
    return idf(df) * tf * (k1 + 1) / (tf + k1 * norm)  # saturating TF

def bm25(query, doc):
    words = doc.split()
    return sum(term_score(words.count(t), len(words), df[t]) for t in query.split())`,
  steps: [
    {
      title: 'Tokenise the query',
      edge: 'q-t',
      packet: '“refund policy”',
      narration: 'Lowercase and split. Real systems also remove stop words and may stem (“refunds” → “refund”) — the same rules must be applied to documents and queries.',
      state: { terms: ['refund', 'policy'], idf: [], 'd1': '—', 'd2': '—', 'd3': '—', 'd4': '—' },
      changed: ['terms'],
      log: 'terms = [refund, policy]',
    },
    {
      title: 'Look up posting lists',
      edge: 't-i',
      packet: '2 terms',
      narration: '“refund” appears in d1 (once) and d3 (twice). “policy” appears in d1, d2 and d4. Documents with neither term are never scored.',
      state: { terms: ['refund → d1(tf 1), d3(tf 2)', 'policy → d1, d2, d4 (tf 1 each)'], idf: [], 'd1': '—', 'd2': '—', 'd3': '—', 'd4': '—' },
      changed: ['terms'],
      log: 'df(refund)=2, df(policy)=3',
      hl: ['docs = {'],
    },
    {
      title: 'IDF: rarer terms weigh more',
      edge: 'i-d',
      packet: 'df counts',
      node: 'idf',
      narration: 'IDF(refund) = ln((4−2+0.5)/(2+0.5)+1) = ln 2 = 0.693. IDF(policy) = ln((4−3+0.5)/(3+0.5)+1) = 0.357. “policy” is in 3 of 4 docs, so it tells us less.',
      state: { terms: ['refund', 'policy'], idf: ['refund = 0.693', 'policy = 0.357'], 'd1': '—', 'd2': '—', 'd3': '—', 'd4': '—' },
      changed: ['idf'],
      log: 'idf(refund)=0.693, idf(policy)=0.357',
      hl: ['def idf(df):', 'return math.log'],
      predict: {
        question: 'd3 contains “refund” twice, d1 once. Will d3 get twice d1’s “refund” score?',
        options: ['Yes, exactly double', 'No — TF saturates and d3 is longer, so it gets less than double', 'No — repeated words are ignored', 'Only if b = 0'],
        answer: 1,
        explain: 'k1 makes extra occurrences worth less and b penalises the longer document.',
      },
    },
    {
      title: 'd1: both terms, short doc',
      edge: 'i-s',
      packet: 'd1 tf=1,1 dl=5',
      node: 'score',
      narration: 'norm = 1 − 0.75 + 0.75 × 5/6 = 0.875. Each term: tf×2.2/(1 + 1.2×0.875) = 1.073. Score = 1.073×0.693 + 1.073×0.357 = 0.744 + 0.383 = 1.127.',
      state: { terms: ['refund', 'policy'], idf: ['refund = 0.693', 'policy = 0.357'], 'd1': '1.127', 'd2': '—', 'd3': '—', 'd4': '—' },
      changed: ['d1'],
      log: 'BM25(d1) = 1.127',
      hl: ['def term_score', 'norm = 1 - b + b * dl / avgdl', 'return idf(df) * tf'],
    },
    {
      title: 'd3: “refund” twice, but long',
      edge: 'i-s',
      packet: 'd3 tf=2 dl=9',
      node: 'score',
      narration: 'norm = 0.25 + 0.75 × 9/6 = 1.375. refund: 2×2.2/(2 + 1.2×1.375) = 1.205 → × 0.693 = 0.836. No “policy”. Two mentions gave only 12% more than one — that is saturation plus the length penalty.',
      state: { terms: ['refund', 'policy'], idf: ['refund = 0.693', 'policy = 0.357'], 'd1': '1.127', 'd2': '—', 'd3': '0.836', 'd4': '—' },
      changed: ['d3'],
      log: 'BM25(d3) = 0.836',
    },
    {
      title: 'd2 and d4: only “policy”',
      edge: 'd-s',
      packet: 'tf=1 dl=5',
      node: 'score',
      narration: 'Same length as d1, one common term: 1.073 × 0.357 = 0.383 each.',
      state: { terms: ['refund', 'policy'], idf: ['refund = 0.693', 'policy = 0.357'], 'd1': '1.127', 'd2': '0.383', 'd3': '0.836', 'd4': '0.383' },
      changed: ['d2', 'd4'],
      log: 'BM25(d2)=BM25(d4)=0.383',
    },
    {
      title: 'Final ranking',
      node: 'score',
      tone: 'ok',
      narration: 'd1 (1.127) > d3 (0.836) > d2 = d4 (0.383). Matching the rare term matters most, matching both terms wins, and spamming a term does not. Raise k1 to reward repetition more; lower b to stop penalising long documents.',
      state: { terms: ['refund', 'policy'], idf: ['refund = 0.693', 'policy = 0.357'], 'd1': '1.127  #1', 'd2': '0.383  #3', 'd3': '0.836  #2', 'd4': '0.383  #3' },
      changed: ['d1', 'd2', 'd3', 'd4'],
      log: 'ranking: d1, d3, d2/d4',
      hl: ['def bm25', 'return sum('],
    },
  ],
  match: /bm25|tf-?idf|\bidf\b|inverted index|lexical|sparse|term frequency|information retrieval|boolean retrieval|probabilistic retrieval/i,
  takeaways: ['IDF rewards rare terms; common terms barely count.', 'k1 saturates term frequency; b penalises long documents.', 'Use the same tokenisation for documents and queries.'],
}

/* ================================================================ GraphRAG */

const GRAPHRAG: AgentSim = {
  id: 'rag-graphrag',
  title: 'GraphRAG: extract, build the graph, answer local and global questions',
  framework: 'GraphRAG',
  group: 'RAG',
  module: '08',
  ragModule: '08',
  home: '/rag/learn/08',
  level: 'Advanced',
  summary: 'Watch an LLM turn text into entities and relations, communities form and get summarised, then a local and a global question take different paths.',
  scenario: 'Three news chunks about Acme, Beta and Gamma. Questions: “Who supplies Gamma?” (local) and “What are the main themes?” (global).',
  nodes: [
    { id: 'docs', label: 'Text chunks', x: 90, y: 90, kind: 'user' },
    { id: 'ext', label: 'LLM extractor', sub: 'entities + relations', x: 300, y: 90, kind: 'llm' },
    { id: 'kg', label: 'Knowledge graph', sub: 'Neo4j', x: 520, y: 90, kind: 'memory' },
    { id: 'comm', label: 'Communities', sub: 'Leiden + summaries', x: 720, y: 200, kind: 'router' },
    { id: 'q', label: 'Question', x: 90, y: 320, kind: 'user' },
    { id: 'ans', label: 'Answer LLM', x: 520, y: 320, kind: 'llm' },
  ],
  edges: [
    { id: 'd-e', from: 'docs', to: 'ext' },
    { id: 'e-k', from: 'ext', to: 'kg' },
    { id: 'k-c', from: 'kg', to: 'comm' },
    { id: 'q-k', from: 'q', to: 'kg' },
    { id: 'k-a', from: 'kg', to: 'ans' },
    { id: 'q-c', from: 'q', to: 'comm', bend: 80 },
    { id: 'c-a', from: 'comm', to: 'ans' },
  ],
  code: `EXTRACT = """Extract entities (name, type) and relations (source, relation, target)
from the text. Return JSON."""

for chunk in chunks:                                        # indexing (expensive: 1 LLM call per chunk)
    g = llm.with_structured_output(Graph).invoke(EXTRACT + chunk.text)
    for e in g.entities:  neo4j.merge_node(e.name, e.type, source=chunk.id)
    for r in g.relations: neo4j.merge_edge(r.source, r.relation, r.target)

communities = leiden(neo4j.export_graph())                  # dense groups of entities
summaries = {c.id: llm.invoke(f"Summarise: {c.facts}") for c in communities}

def local_search(q):                                        # specific entity questions
    ent = link_entity(q)                                    # "Gamma"
    facts = neo4j.query("MATCH (s)-[r]->(:Org {name:$n}) RETURN s, r", n=ent)
    return llm.invoke(f"Answer from facts: {facts}\\nQ: {q}")

def global_search(q):                                       # "main themes?" questions
    partials = [llm.invoke(f"{s}\\nQ: {q}") for s in summaries.values()]   # map
    return llm.invoke(f"Combine the best: {partials}\\nQ: {q}")            # reduce`,
  steps: [
    {
      title: 'Extract entities and relations',
      edge: 'd-e',
      packet: '“Acme acquired Beta; Beta supplies Gamma…”',
      narration: 'Every chunk goes through an LLM with a structured-output schema. This is the expensive part of GraphRAG: one LLM call per chunk at indexing time.',
      state: { entities: [], relations: [], communities: [] },
      log: 'extract from 3 chunks',
      hl: ['for chunk in chunks:', 'g = llm.with_structured_output(Graph)'],
    },
    {
      title: 'Merge into the graph',
      edge: 'e-k',
      packet: '5 entities, 4 relations',
      node: 'kg',
      narration: 'MERGE (not CREATE) deduplicates: “Beta Corp” in two chunks becomes one node. Entity resolution quality decides graph quality.',
      state: { entities: ['Acme (Org)', 'Beta (Org)', 'Gamma (Org)', 'Lithium (Material)', 'EU (Region)'], relations: ['Acme -ACQUIRED-> Beta', 'Beta -SUPPLIES-> Gamma', 'Beta -SOURCES-> Lithium', 'Gamma -SELLS_IN-> EU'], communities: [] },
      changed: ['entities', 'relations'],
      log: 'graph: 5 nodes, 4 edges',
      hl: ['neo4j.merge_node', 'neo4j.merge_edge'],
    },
    {
      title: 'Detect and summarise communities',
      edge: 'k-c',
      packet: 'Leiden',
      node: 'comm',
      narration: 'Leiden groups densely connected entities. Each community gets an LLM-written summary, computed once at indexing time.',
      state: { entities: ['Acme', 'Beta', 'Gamma', 'Lithium', 'EU'], relations: ['4 relations'], communities: ['C1 Supply chain: Beta → Gamma, lithium sourcing', 'C2 Corporate: Acme acquired Beta (2024)'] },
      changed: ['communities'],
      log: '2 communities summarised',
      hl: ['communities = leiden', 'summaries = '],
      predict: {
        question: '“Who supplies Gamma?” — which path should answer it?',
        options: ['Global search over community summaries', 'Local search: find Gamma and walk its incoming edges', 'Plain vector search only', 'Re-run extraction'],
        answer: 1,
        explain: 'It names a specific entity, so a local graph lookup is precise and cheap.',
      },
    },
    {
      title: 'Local search: walk from the entity',
      edge: 'q-k',
      packet: '“Who supplies Gamma?”',
      node: 'kg',
      narration: 'Entity linking maps “Gamma” to the node; a one-hop Cypher query returns Beta -SUPPLIES-> Gamma, and two hops add Acme as Beta’s owner.',
      log: 'MATCH (s)-[r]->(Gamma) → Beta SUPPLIES',
      hl: ['def local_search', 'ent = link_entity(q)', 'facts = neo4j.query'],
    },
    {
      title: 'Local answer',
      edge: 'k-a',
      packet: 'facts',
      node: 'ans',
      tone: 'ok',
      narration: '“Beta supplies Gamma; Beta is owned by Acme since 2024.” — a multi-hop fact that plain chunk retrieval often misses because it spans two chunks.',
      log: 'local answer with 2-hop context',
    },
    {
      title: 'Global search: map over summaries',
      edge: 'q-c',
      packet: '“main themes?”',
      node: 'comm',
      narration: 'No single chunk answers “what are the main themes?”. Global search asks each community summary for a partial answer (map)…',
      log: 'map over 2 community summaries',
      hl: ['def global_search', 'partials = '],
    },
    {
      title: 'Reduce into one answer',
      edge: 'c-a',
      packet: '2 partial answers',
      node: 'ans',
      tone: 'ok',
      narration: '…then combines the best partials (reduce): “Consolidation (Acme–Beta) and supply-chain dependency on lithium.” Great for sense-making, but expensive to index and to keep fresh.',
      log: 'global answer',
      hl: ['return llm.invoke(f"Combine the best'],
    },
  ],
  match: /graph ?rag|knowledge graph|community detection|entity linking|graph (database|traversal|data|quer)|neo4j|cypher|lightrag|leiden/i,
  takeaways: ['Indexing extracts entities and relations with an LLM — it is the expensive part.', 'Local search walks from a named entity; global search maps over community summaries.', 'Use GraphRAG for multi-hop and “themes” questions, not for simple lookups.'],
}

/* ================================================================ evaluation gate */

const EVAL: AgentSim = {
  id: 'rag-eval-gate',
  title: 'RAG evaluation: golden set, metrics, release gate',
  framework: 'RAGAS',
  group: 'RAG',
  module: '08',
  ragModule: '09',
  home: '/rag/learn/09',
  level: 'Intermediate',
  summary: 'A teammate changes chunk size from 800 to 300 tokens. The eval run catches a context-recall regression before it reaches users.',
  scenario: '50-question golden dataset with reference answers and the source chunk ids that should be retrieved. Baseline: context recall 0.86, faithfulness 0.92.',
  nodes: [
    { id: 'gold', label: 'Golden dataset', sub: '50 Q + refs + chunk ids', x: 100, y: 200, kind: 'memory' },
    { id: 'rag', label: 'RAG pipeline', sub: 'candidate build', x: 320, y: 90, kind: 'agent' },
    { id: 'ret', label: 'Retrieval metrics', sub: 'precision, recall, MRR', x: 560, y: 90, kind: 'tool' },
    { id: 'judge', label: 'Judge LLM', sub: 'faithfulness, relevance', x: 560, y: 320, kind: 'llm' },
    { id: 'gate', label: 'Release gate', sub: 'vs baseline', x: 740, y: 200, kind: 'guard' },
  ],
  edges: [
    { id: 'g-r', from: 'gold', to: 'rag' },
    { id: 'r-m', from: 'rag', to: 'ret' },
    { id: 'r-j', from: 'rag', to: 'judge' },
    { id: 'm-g', from: 'ret', to: 'gate' },
    { id: 'j-g', from: 'judge', to: 'gate' },
    { id: 'g-g', from: 'gate', to: 'gold', bend: -120 },
  ],
  code: `from ragas import evaluate
from ragas.metrics import context_precision, context_recall, faithfulness, answer_relevancy

rows = [{"question": q.text, "contexts": rag.retrieve(q.text),
         "answer": rag.answer(q.text), "ground_truth": q.reference} for q in golden]
report = evaluate(Dataset.from_list(rows),
                  metrics=[context_precision, context_recall, faithfulness, answer_relevancy])

BASELINE = {"context_recall": 0.86, "faithfulness": 0.92}
for metric, base in BASELINE.items():
    if report[metric] < base - 0.03:                       # tolerance for judge noise
        raise SystemExit(f"Regression: {metric} {report[metric]:.2f} < {base:.2f}")`,
  steps: [
    {
      title: 'Run the golden questions',
      edge: 'g-r',
      packet: '50 questions',
      narration: 'Every golden question goes through the candidate pipeline (chunk size 300). We keep the retrieved contexts and the answer for scoring.',
      state: { 'chunk size': '800 → 300', 'context recall': '—', 'context precision': '—', faithfulness: '—', gate: '—' },
      changed: ['chunk size'],
      log: 'eval run #142 on 50 questions',
      hl: ['rows = [{"question"', '"contexts": rag.retrieve'],
    },
    {
      title: 'Score retrieval',
      edge: 'r-m',
      packet: 'retrieved chunk ids',
      node: 'ret',
      narration: 'Retrieved ids are compared with the golden chunk ids. Smaller chunks split answers across several pieces, and top-k = 4 no longer covers them.',
      state: { 'chunk size': '300', 'context recall': '0.71 (baseline 0.86)', 'context precision': '0.82 (baseline 0.78)', faithfulness: '—', gate: '—' },
      changed: ['context recall', 'context precision'],
      tone: 'warn',
      log: 'context_recall 0.71, context_precision 0.82',
      hl: ['context_precision, context_recall'],
      predict: {
        question: 'Precision went up but recall dropped 15 points. Should this ship?',
        options: ['Yes — precision improved', 'No — answers now miss needed information', 'Only if latency improved', 'Average them and decide'],
        answer: 1,
        explain: 'Missing context causes incomplete or invented answers; it is the more harmful failure for RAG.',
      },
    },
    {
      title: 'Score generation with a judge',
      edge: 'r-j',
      packet: 'answers + contexts',
      node: 'judge',
      narration: 'A calibrated judge LLM checks each claim against the retrieved context. Faithfulness stays high — the model is honest about what it saw, it just saw less.',
      state: { 'chunk size': '300', 'context recall': '0.71', 'context precision': '0.82', faithfulness: '0.91 (baseline 0.92)', gate: '—' },
      changed: ['faithfulness'],
      log: 'faithfulness 0.91, answer_relevancy 0.84',
      hl: ['faithfulness, answer_relevancy'],
    },
    {
      title: 'Gate compares with baseline',
      edge: 'm-g',
      packet: 'report',
      node: 'gate',
      tone: 'bad',
      narration: 'context_recall 0.71 < 0.86 − 0.03 → the CI job fails. The change never reaches production. The tolerance absorbs normal judge noise.',
      state: { 'chunk size': '300', 'context recall': '0.71', 'context precision': '0.82', faithfulness: '0.91', gate: 'BLOCKED: context_recall regression' },
      changed: ['gate'],
      log: 'Regression: context_recall 0.71 < 0.86',
      hl: ['if report[metric] < base - 0.03', 'raise SystemExit'],
    },
    {
      title: 'Fix: parent-child chunking',
      edge: 'g-g',
      packet: 'retry with parents',
      node: 'gold',
      tone: 'ok',
      narration: 'Keep 300-token children for precise matching but return their 1,200-token parents. Re-run: recall 0.88, precision 0.83, faithfulness 0.93 → gate passes. Add the failing questions to the golden set.',
      state: { 'chunk size': '300 child / 1200 parent', 'context recall': '0.88 ✓', 'context precision': '0.83 ✓', faithfulness: '0.93 ✓', gate: 'PASSED' },
      changed: ['chunk size', 'context recall', 'context precision', 'faithfulness', 'gate'],
      log: 'eval run #143: all metrics ≥ baseline',
    },
  ],
  match: /evaluat|ragas|metric|golden|judge|faithful|benchmark|precision|recall/i,
  takeaways: ['Evaluate retrieval and generation separately.', 'Gate every change on a versioned golden dataset.', 'Allow a small tolerance for judge noise; fix regressions before release.'],
}

/* ================================================================ production incident */

const INCIDENT: AgentSim = {
  id: 'rag-incident',
  title: 'Observability: an alert, a trace, a root cause',
  framework: 'OpenTelemetry',
  group: 'RAG',
  module: '09',
  ragModule: '10',
  home: '/rag/learn/10',
  level: 'Advanced',
  summary: 'p95 latency breaches its SLO after a deploy. Follow the on-call engineer from the dashboard to the slow span and the real cause.',
  scenario: 'SLO: p95 < 3 s. After Tuesday’s re-index, p95 jumps to 7.8 s and the “empty retrieval” rate rises.',
  nodes: [
    { id: 'dash', label: 'Dashboard', sub: 'p95, errors, cost', x: 110, y: 90, kind: 'service' },
    { id: 'alert', label: 'Alert', sub: 'SLO breach', x: 110, y: 320, kind: 'guard' },
    { id: 'oncall', label: 'On-call', x: 330, y: 200, kind: 'human' },
    { id: 'trace', label: 'Trace viewer', sub: 'spans', x: 560, y: 90, kind: 'tool' },
    { id: 'vdb', label: 'Vector DB', sub: 'collection v42', x: 740, y: 200, kind: 'memory' },
    { id: 'fix', label: 'Fix + verify', x: 560, y: 320, kind: 'agent' },
  ],
  edges: [
    { id: 'd-a', from: 'dash', to: 'alert' },
    { id: 'a-o', from: 'alert', to: 'oncall' },
    { id: 'o-t', from: 'oncall', to: 'trace' },
    { id: 't-v', from: 'trace', to: 'vdb' },
    { id: 'v-f', from: 'vdb', to: 'fix' },
    { id: 'f-d', from: 'fix', to: 'dash', bend: 60 },
  ],
  code: `with tracer.start_as_current_span("rag.request") as root:
    root.set_attribute("user.tenant", tenant)
    with tracer.start_as_current_span("retrieve") as span:
        hits = vdb.search(qvec, k=20, filter={"tenant": tenant})
        span.set_attribute("retrieve.k", 20)
        span.set_attribute("retrieve.hits", len(hits))
        span.set_attribute("index.version", INDEX_VERSION)
    with tracer.start_as_current_span("llm.generate") as span:
        out = llm.invoke(prompt(hits))
        span.set_attribute("llm.tokens", out.usage.total_tokens)

# alert rule (PromQL)
# histogram_quantile(0.95, rate(rag_request_seconds_bucket[5m])) > 3   for 10m`,
  steps: [
    {
      title: 'Dashboard shows the regression',
      node: 'dash',
      narration: 'p95 latency went from 2.1 s to 7.8 s right after the re-index; error rate is flat, but the empty-retrieval rate doubled.',
      state: { 'p95 latency': '7.8 s (SLO 3 s)', 'error rate': '0.4%', 'empty retrievals': '9% (was 4%)', 'root cause': '?' },
      changed: ['p95 latency', 'empty retrievals'],
      tone: 'warn',
      log: 'p95 7.8 s since 14:05',
    },
    {
      title: 'Alert fires after 10 minutes',
      edge: 'd-a',
      packet: 'p95 > 3 s for 10m',
      node: 'alert',
      tone: 'bad',
      narration: 'The “for 10m” clause avoids paging on short spikes. The alert links straight to the runbook and to example slow traces.',
      log: 'ALERT RagLatencySLO firing',
      hl: ['# histogram_quantile'],
    },
    {
      title: 'On-call opens a slow trace',
      edge: 'a-o',
      packet: 'page',
      node: 'oncall',
      narration: 'Logs alone would not show which step is slow. A trace breaks the request into timed spans.',
      log: 'on-call acknowledged',
    },
    {
      title: 'The retrieve span is the outlier',
      edge: 'o-t',
      packet: 'trace 9f2c…',
      node: 'trace',
      narration: 'retrieve: 5.9 s (was 0.15 s). llm.generate: 1.7 s as usual. Attributes on the span: index.version = v42, retrieve.hits = 0 for some tenants.',
      state: { 'p95 latency': '7.8 s', 'error rate': '0.4%', 'empty retrievals': '9%', 'root cause': 'retrieve span 5.9 s on index v42' },
      changed: ['root cause'],
      log: 'slow span: retrieve 5.9 s, index.version=v42',
      hl: ['with tracer.start_as_current_span("retrieve")', 'span.set_attribute("index.version"'],
      predict: {
        question: 'Search got 40× slower and some tenants get 0 hits after a re-index. Most likely cause?',
        options: ['The LLM provider is slow', 'The new collection lacks the tenant payload index, so filtered search scans everything', 'Too many users', 'The embedding model changed dimensions'],
        answer: 1,
        explain: 'Filtered vector search without a payload index falls back to brute force, and a mis-mapped field returns no hits.',
      },
    },
    {
      title: 'Confirm in the vector DB',
      edge: 't-v',
      packet: 'inspect collection v42',
      node: 'vdb',
      tone: 'bad',
      narration: 'Collection v42 was created by a new script that forgot the payload index on “tenant” and wrote the field as “tenant_id”. Filtered queries scan the whole collection and some filters match nothing.',
      state: { 'p95 latency': '7.8 s', 'error rate': '0.4%', 'empty retrievals': '9%', 'root cause': 'v42: missing tenant payload index + renamed field' },
      changed: ['root cause'],
      log: 'v42 schema diff: tenant → tenant_id, no payload index',
    },
    {
      title: 'Roll back the alias, fix forward',
      edge: 'v-f',
      packet: 'alias → v41',
      node: 'fix',
      narration: 'Point the “prod” alias back to v41 (instant, no re-index), then rebuild v43 with the index and a schema check in CI.',
      log: 'alias prod → v41; v43 building',
    },
    {
      title: 'Verify on the dashboard',
      edge: 'f-d',
      packet: 'metrics recover',
      node: 'dash',
      tone: 'ok',
      narration: 'p95 back to 2.0 s, empty retrievals 4%. Post-mortem action: compare a golden-set eval and schema between index versions before switching the alias.',
      state: { 'p95 latency': '2.0 s ✓', 'error rate': '0.3%', 'empty retrievals': '4% ✓', 'root cause': 'fixed — index schema check added to CI' },
      changed: ['p95 latency', 'empty retrievals', 'root cause'],
      log: 'SLO recovered; alert resolved',
    },
  ],
  match: /tracing|\bspans?\b|observab|monitor|drift|alert|dashboard|telemetry|incident|failure modes|debugging/i,
  takeaways: ['Alert on SLOs with a duration, and link the runbook.', 'Traces with rich span attributes turn “it is slow” into “retrieve on index v42 is slow”.', 'Switch index versions through an alias so rollback is instant.'],
}

/* ================================================================ multi-query + RRF */

const MULTIQUERY: AgentSim = {
  id: 'rag-multi-query',
  title: 'Multi-query retrieval with RRF fusion',
  framework: 'LangChain',
  group: 'RAG',
  module: '08',
  ragModule: '06',
  home: '/rag/learn/06',
  level: 'Intermediate',
  summary: 'One vague question becomes three focused queries; their results are fused with Reciprocal Rank Fusion so the chunk that all of them like rises to the top.',
  scenario: '“Why is my app slow after the update?” — the knowledge base talks about “latency regressions”, “cold starts” and “N+1 queries”.',
  nodes: [
    { id: 'q', label: 'Question', x: 90, y: 200, kind: 'user' },
    { id: 'llm', label: 'Query generator', sub: 'LLM', x: 280, y: 200, kind: 'llm' },
    { id: 'r1', label: 'Query 1', sub: 'latency regression', x: 520, y: 70, kind: 'tool' },
    { id: 'r2', label: 'Query 2', sub: 'cold start time', x: 520, y: 200, kind: 'tool' },
    { id: 'r3', label: 'Query 3', sub: 'N+1 queries', x: 520, y: 330, kind: 'tool' },
    { id: 'rrf', label: 'RRF merge', x: 730, y: 200, kind: 'router' },
  ],
  edges: [
    { id: 'q-l', from: 'q', to: 'llm' },
    { id: 'l-1', from: 'llm', to: 'r1' },
    { id: 'l-2', from: 'llm', to: 'r2' },
    { id: 'l-3', from: 'llm', to: 'r3' },
    { id: '1-f', from: 'r1', to: 'rrf' },
    { id: '2-f', from: 'r2', to: 'rrf' },
    { id: '3-f', from: 'r3', to: 'rrf' },
  ],
  code: `GEN = """Write 3 different search queries that would find documents answering:
{question}
One per line, using vocabulary an engineering wiki would use."""

queries = llm.invoke(GEN.format(question=question)).content.splitlines()
rankings = [retriever.invoke(q) for q in queries]          # run in parallel

scores = defaultdict(float)
for ranking in rankings:
    for rank, doc in enumerate(ranking, start=1):
        scores[doc.id] += 1 / (60 + rank)
top = sorted(scores, key=scores.get, reverse=True)[:5]`,
  steps: [
    {
      title: 'Vague question',
      edge: 'q-l',
      packet: '“why is my app slow…”',
      narration: 'The user’s words do not match the wiki’s vocabulary, so a single embedding search returns generic “performance tips”.',
      state: { queries: [], 'top results': [] },
      log: 'single-query recall@5 = 0.4 on this question',
    },
    {
      title: 'Generate focused queries',
      edge: 'l-1',
      packet: '3 queries',
      node: 'llm',
      narration: 'One cheap LLM call rewrites the question three ways in the documentation’s own vocabulary.',
      state: { queries: ['latency regression after deploy', 'cold start time increased', 'N+1 database queries slow page'], 'top results': [] },
      changed: ['queries'],
      log: 'queries generated',
      hl: ['GEN = """', 'queries = llm.invoke'],
    },
    {
      title: 'Search each in parallel',
      edge: 'l-2',
      packet: 'parallel',
      node: 'r2',
      narration: 'Three retrievals run concurrently, so latency is about one search, not three.',
      log: '3 searches in parallel',
      hl: ['rankings = [retriever.invoke(q)'],
      predict: {
        question: 'The doc “Release 4.2 performance post-mortem” is #2, #1 and #3 in the three lists. Others are #1 in only one list. Who wins after RRF?',
        options: ['Whichever was #1 in the first list', 'The post-mortem — consistently high in all lists', 'A random one', 'They tie'],
        answer: 1,
        explain: 'RRF sums 1/(60+rank) across lists, so consistent agreement beats a single top position.',
      },
    },
    {
      title: 'Results arrive',
      edge: '3-f',
      packet: 'ranked lists',
      node: 'rrf',
      narration: 'Post-mortem: 1/62 + 1/61 + 1/63 = 0.0487. “Cold start guide” (#1 in one list only): 0.0164.',
      log: 'RRF scores computed',
      hl: ['scores[doc.id] += 1 / (60 + rank)'],
    },
    {
      title: 'Fused top results',
      edge: '1-f',
      packet: 'top 5',
      node: 'rrf',
      tone: 'ok',
      narration: 'The post-mortem that explains the slowdown is now #1. Multi-query raises recall for vague questions; skip it for precise ones to save an LLM call.',
      state: { queries: ['latency regression after deploy', 'cold start time increased', 'N+1 database queries slow page'], 'top results': ['Release 4.2 performance post-mortem (0.049)', 'Cold start guide (0.016)', 'ORM N+1 detection (0.016)'] },
      changed: ['top results'],
      log: 'multi-query recall@5 = 0.9',
      hl: ['top = sorted(scores'],
    },
  ],
  match: /multi-?query|query (rewrit|transform|expan|understand|classif)|rag fusion|hyde|step-?back|decompos/i,
  takeaways: ['Rewrite vague questions into the corpus’s vocabulary.', 'Run the queries in parallel and fuse with RRF.', 'Use it when single-query retrieval scores are low.'],
}

export const RAG_ADVANCED_SIMS: AgentSim[] = [BM25, MULTIQUERY, GRAPHRAG, EVAL, INCIDENT]
