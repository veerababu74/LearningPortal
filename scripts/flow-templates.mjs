/** Build content-rich flow diagrams and teaching points from roadmap text. */

function pipeline(title, labels, narrations) {
  const nodes = labels.map((label, i) => ({
    id: `n${i}`,
    label: String(label).slice(0, 18),
    x: 24 + i * 128,
    y: 70,
    kind: i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'process',
  }))
  const edges = labels.slice(0, -1).map((_, i) => ({
    id: `e${i}`,
    source: `n${i}`,
    target: `n${i + 1}`,
  }))
  const steps = labels.map((label, i) => ({
    id: `s${i}`,
    label: String(label),
    activeNodeIds: nodes.slice(0, i + 1).map((n) => n.id),
    activeEdgeIds: edges.slice(0, i).map((e) => e.id),
    narration: narrations[i] || `Step ${i + 1}: ${label}`,
  }))
  return { title, nodes, edges, steps }
}

function cleanProse(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_|`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractSentences(text, max = 12) {
  return cleanProse(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/^[-•]\s+/, '').trim())
    .filter((s) => s.length > 40 && s.length < 320)
    .filter(
      (s) =>
        !/^(user question|llm|company policy|potential hallucination|source:)/i.test(s) &&
        !/^without rag user question/i.test(s),
    )
    .slice(0, max)
}

/** High-quality fallbacks used only when source prose for a step is thin. */
const STEP_DEPTH = {
  'User question':
    'The user asks a company-specific question. A general LLM may not know private policy details, so fluency alone is not enough.',
  'LLM only':
    'Without retrieval, the model answers from parametric memory only. That can sound confident while inventing leave counts or policy rules.',
  'Plausible answer':
    'The model may return a fluent answer such as “You get 15 casual leaves,” even when that number is not in any company document.',
  'Hallucination risk':
    'This is the core failure mode: an answer that is plausible, unverified, and potentially wrong for the enterprise context.',
  'Need for RAG':
    'RAG fixes this by retrieving the real policy first, then generating an answer grounded in that evidence with citations.',
  'Company policy':
    'Relevant internal documents are retrieved first so the model is conditioned on verified company knowledge, not guesses.',
  'LLM + evidence':
    'The generator answers with retrieved evidence in context, which improves groundedness and makes citations possible.',
  'Grounded answer':
    'A grounded answer states the verified fact (for example 12 casual leaves) and points to the source document and page.',
  Citation:
    'Always attach source metadata (document name, page/section) so users and auditors can verify the answer.',
  Load: 'Loading converts PDFs, DOCX, CSV, HTML and other sources into a consistent document object with text plus metadata.',
  Clean:
    'Cleaning removes boilerplate, normalizes unicode, strips headers/footers, and prepares text so chunking and embeddings stay high quality.',
  Chunk:
    'Chunking splits documents into retrieval units. Size and overlap control whether evidence is complete enough without adding noise.',
  Embed:
    'Embedding turns each chunk into a dense vector so semantically similar questions and passages can be matched.',
  Index:
    'Indexing stores vectors (and often sparse signals) for fast nearest-neighbor search with filters for tenant, source, or time.',
  Retrieve:
    'Retrieval finds the Top-K chunks for a query using dense, sparse, or hybrid search before generation.',
  Generate:
    'Generation builds an answer from the retrieved context. Good prompts require evidence, citations, and abstention when support is weak.',
  Query: 'The user query enters the system and may need rewriting before search.',
  Transform: 'Query transformation expands, rewrites, or decomposes the question to improve recall.',
  Search: 'Dense and/or keyword search return candidate passages.',
  Fuse: 'Fusion methods such as RRF combine rankings from multiple retrievers into one list.',
  Rerank: 'A cross-encoder or LLM reranker reorders candidates for higher precision context.',
  Context: 'Final context is budgeted, ordered, and injected into the prompt for grounded generation.',
  'What it is': 'Define the concept precisely so you can recognize it in architecture diagrams and production incidents.',
  'Why it happens': 'Identify root causes — model limits, data issues, prompt design, retrieval gaps, or missing guardrails.',
  'Where it appears': 'Locate the layer: ingestion, retrieval, prompting, tools, gateway, or multi-agent coordination.',
  'How to detect': 'Use logs, traces, eval metrics, and user feedback signals that reveal this failure early.',
  'How to fix': 'Apply layered mitigations, tests, and monitoring so the issue does not return silently.',
  Define: 'Start with a crisp definition and a concrete enterprise example.',
  'Core idea': 'Capture the one idea that must stick before you implement anything.',
  'See the flow': 'Walk the data/control path so you know what happens one stage after another.',
  Apply: 'Translate the idea into an implementation choice, checklist, or mini scenario.',
  Validate: 'Confirm with detection signals, tests, and a clear success condition.',
  Goal: 'The agent receives a user goal and must decide what information or tools are required.',
  Reason: 'The model plans the next action instead of answering blindly.',
  'Act / tool': 'The agent calls an authorized tool or function with structured arguments.',
  Observe: 'Tool output returns as evidence the agent must interpret carefully.',
  Decide: 'The loop continues, escalates to a human, or finishes with a grounded answer.',
  Orchestrator: 'A coordinator decomposes work and assigns ownership to specialists.',
  Delegate: 'Tasks are handed off with clear inputs, outputs, and termination conditions.',
  Specialists: 'Specialist agents execute narrow skills and return structured results.',
  Merge: 'Results are reconciled; conflicts and duplicates are resolved before final output.',
  Terminate: 'The workflow must always end — via success, safe failure, timeout, or human decision.',
  Request: 'A client request arrives at the gateway with identity and policy context.',
  Auth: 'Virtual keys authenticate the caller; authorization checks tenant and scope.',
  Policy: 'Rate limits, quotas, and safety policies are enforced before spend happens.',
  Route: 'Routing chooses provider/model based on quality, cost, latency, or fallback rules.',
  Provider: 'The upstream model generates tokens under timeout and retry controls.',
  Observe: 'Usage, cost, latency, and traces are recorded for FinOps and incident response.',
  Symptom: 'Users or monitors report a visible failure signal.',
  Detect: 'Correlate logs, metrics, and traces to identify the failure mode.',
  Isolate: 'Contain blast radius so healthy traffic keeps working.',
  Mitigate: 'Apply retries, fallbacks, degrade modes, or kill-switches.',
  Recover: 'Fix the root cause, verify recovery, and capture a runbook update.',
  Input: 'Untrusted input enters the system and must be classified before use.',
  'Policy check': 'Security and tenancy policies decide what is allowed.',
  Model: 'The model runs inside a trust boundary with constrained tools and prompts.',
  'Output filter': 'Outputs are scanned for leakage, jailbreaks, and policy violations.',
  Audit: 'Every sensitive decision is logged for investigation and compliance.',
}

function scoreSentence(sentence, label) {
  const s = sentence.toLowerCase()
  const words = String(label)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2)
  let score = 0
  for (const w of words) if (s.includes(w)) score += 3
  if (/because|therefore|this means|for example|in production|important/.test(s)) score += 1
  return score
}

function findBestSentence(sentences, label, used) {
  let best = null
  let bestScore = -1
  for (const sentence of sentences) {
    if (used.has(sentence)) continue
    const score = scoreSentence(sentence, label)
    if (score > bestScore) {
      best = sentence
      bestScore = score
    }
  }
  if (best && bestScore > 0) return best
  for (const sentence of sentences) {
    if (!used.has(sentence)) return sentence
  }
  return null
}

function extractStepLabels(title, body) {
  const titleLower = String(title || '').toLowerCase()
  const text = `${title}\n${body}`
  const lower = text.toLowerCase()

  // Title-first patterns (critical: body may contain both Without/With RAG)
  if (/without rag/.test(titleLower)) {
    return ['User question', 'LLM only', 'Plausible answer', 'Hallucination risk', 'Need for RAG']
  }
  if (/^with rag\b/.test(titleLower) || /###?\s*with rag/.test(titleLower)) {
    return ['User question', 'Company policy', 'LLM + evidence', 'Grounded answer', 'Citation']
  }
  if (/rag vs fine-tuning|fine-tuning vs rag/.test(lower)) {
    return ['Problem type', 'RAG path', 'Fine-tune path', 'Trade-offs', 'Choose']
  }

  const labels = []
  const numbered = [...body.matchAll(/^(?:#{2,4}\s+)?(?:\*\*)?(\d+)[.)]\s+\**(.+?)\**\s*$/gm)]
  for (const m of numbered) {
    const label = m[2].replace(/\*\*/g, '').trim()
    if (label && label.length < 36) labels.push(label)
  }
  if (labels.length >= 3) return labels.slice(0, 6)

  const boldHeads = [...body.matchAll(/\*\*([A-Z][^*]{3,36})\*\*/g)]
  for (const m of boldHeads) {
    if (!labels.includes(m[1])) labels.push(m[1])
  }
  if (labels.length >= 3) return labels.slice(0, 6)

  if (/what is|why do|how to detect|how to fix/.test(lower)) {
    return ['What it is', 'Why it happens', 'Where it appears', 'How to detect', 'How to fix']
  }
  if (/chunk|overlap|splitter/.test(lower)) {
    return ['Document', 'Choose strategy', 'Size & overlap', 'Emit chunks', 'Evaluate']
  }
  if (/embed|cosine|vector/.test(lower)) {
    return ['Text', 'Tokenizer', 'Encoder', 'Vector', 'Similarity']
  }
  if (/retriev|bm25|hybrid|hyde|rerank/.test(lower)) {
    return ['Query', 'Transform', 'Search', 'Fuse', 'Rerank', 'Context']
  }
  // Only use full ingestion pipeline when the section is actually about ingestion/indexing
  if (/(ingest|document load|chunking|embedding|vector index)/.test(lower)) {
    return ['Load', 'Clean', 'Chunk', 'Embed', 'Index', 'Retrieve', 'Generate']
  }
  if (/prompt injection|jailbreak|leakage|owasp|attack/.test(lower)) {
    return ['Attack input', 'Trust boundary', 'Model influence', 'Impact', 'Defense']
  }
  if (/gateway|rate limit|quota|virtual key|cache|stream/.test(lower)) {
    return ['Request', 'Auth', 'Policy', 'Route', 'Provider', 'Observe']
  }
  if (/multi-agent|handoff|orchestrat|deadlock/.test(lower)) {
    return ['Orchestrator', 'Delegate', 'Specialists', 'Merge', 'Terminate']
  }
  if (/agent|tool|langgraph|mcp|a2a/.test(lower)) {
    return ['Goal', 'Reason', 'Act / tool', 'Observe', 'Decide']
  }
  if (/fail|timeout|retry|incident|drift|monitor/.test(lower)) {
    return ['Symptom', 'Detect', 'Isolate', 'Mitigate', 'Recover']
  }
  if (/security|pii|guardrail|threat|tenant/.test(lower)) {
    return ['Input', 'Policy check', 'Model', 'Output filter', 'Audit']
  }

  return ['Define', 'Core idea', 'See the flow', 'Apply', 'Validate']
}

function narrationsFor(labels, body) {
  const sentences = extractSentences(body, 20)
  const used = new Set()
  return labels.map((label) => {
    // Strong preference for curated teaching text on known steps
    if (STEP_DEPTH[label]) {
      // Still try to attach a highly relevant source sentence when available
      let best = null
      let bestScore = -1
      for (const sentence of sentences) {
        if (used.has(sentence)) continue
        const score = scoreSentence(sentence, label)
        if (score > bestScore) {
          best = sentence
          bestScore = score
        }
      }
      if (best && bestScore >= 3) {
        used.add(best)
        // Combine depth + source evidence when both are useful and not redundant
        if (!STEP_DEPTH[label].includes(best.slice(0, 40)) && best.length < 180) {
          return `${STEP_DEPTH[label]} ${best}`
        }
        return STEP_DEPTH[label]
      }
      return STEP_DEPTH[label]
    }

    const matched = findBestSentence(sentences, label, used)
    if (matched) {
      used.add(matched)
      return matched
    }
    const next = sentences.find((s) => !used.has(s))
    if (next) {
      used.add(next)
      return next
    }
    return `In “${label}”, focus on what changes in the system, what can go wrong, and how you would verify the step in production.`
  })
}

function shortFlowTitle(title) {
  const t = String(title || 'Concept flow').replace(/\s+/g, ' ').trim()
  if (/^this is one of the most/i.test(t)) return 'Concept walkthrough'
  if (t.length <= 42) return t
  return `${t.slice(0, 42).replace(/\s+\S*$/, '').trim()}…`
}

export function buildSectionFlow(title, body = '') {
  const labels = extractStepLabels(title, body)
  return pipeline(`Visual flow — ${shortFlowTitle(title)}`, labels, narrationsFor(labels, body))
}

export function buildPointFlow(pointTitle, explanation = '') {
  const labels = extractStepLabels(pointTitle, explanation)
  const compact = labels.slice(0, Math.min(6, Math.max(3, labels.length)))
  return pipeline(shortFlowTitle(pointTitle), compact, narrationsFor(compact, explanation))
}

export function pickFlowTemplate(title = '', body = '') {
  return buildSectionFlow(title, body)
}

/** Expand thin visual-only subsections with nearby lesson prose. */
export function enrichThinContent(title, body, parentBody = '') {
  const prose = cleanProse(body)
  if (prose.length >= 220) return body

  const parentSentences = extractSentences(parentBody, 12)
  const titleKey = title.toLowerCase()
  let extras = []

  if (/without rag/.test(titleKey)) {
    extras = [
      'Without RAG, the LLM answers from parametric knowledge only.',
      'For company-specific questions, that often produces a fluent but incorrect answer.',
      'Example: asking about casual leave may yield an invented number with no source document.',
      'This is why enterprise assistants need retrieval before generation.',
      ...parentSentences.filter((s) => /llm|policy|incorrect|internal|hallucin/i.test(s)).slice(0, 4),
    ]
  } else if (/with rag/.test(titleKey)) {
    extras = [
      'With RAG, the system retrieves company policy evidence before asking the LLM to answer.',
      'The model is conditioned on retrieved text, so answers can stay grounded and citable.',
      'Example: retrieve the leave policy, then answer “12 casual leaves” with source page metadata.',
      ...parentSentences.filter((s) => /retriev|evidence|policy|ground/i.test(s)).slice(0, 4),
    ]
  } else {
    extras = parentSentences.slice(0, 6)
  }

  const unique = [...new Set(extras.filter(Boolean))]
  if (!unique.length) return body

  return `${body}\n\n${unique.map((s) => `- ${s}`).join('\n')}\n`
}

export function extractTeachingPoints(sectionTitle, body, parentBody = '') {
  const points = []
  const chunks = []
  const enrichedSection = enrichThinContent(sectionTitle, body, parentBody)

  const numbered = [
    ...enrichedSection.matchAll(/^(?:#{3,4}\s+)?(?:\*\*)?(\d+[.)]|[A-Z]\.)\s+\**(.+?)\**\s*$/gm),
  ]
  if (numbered.length >= 2) {
    for (let i = 0; i < numbered.length; i++) {
      const start = numbered[i].index
      const end = i + 1 < numbered.length ? numbered[i + 1].index : enrichedSection.length
      const title = numbered[i][2].replace(/\*\*/g, '').trim()
      const text = enrichedSection.slice(start, end).replace(numbered[i][0], '').trim()
      chunks.push({ title, text: enrichThinContent(title, text, enrichedSection) })
    }
  } else {
    const heads = [...enrichedSection.matchAll(/^#{3,4}\s+\**(.+?)\**\s*$/gm)]
    if (heads.length >= 1) {
      for (let i = 0; i < heads.length; i++) {
        const start = heads[i].index
        const end = i + 1 < heads.length ? heads[i + 1].index : enrichedSection.length
        const title = heads[i][1].replace(/\*\*/g, '').trim()
        const text = enrichedSection.slice(start, end).replace(heads[i][0], '').trim()
        chunks.push({ title, text: enrichThinContent(title, text, enrichedSection) })
      }
    }
  }

  if (chunks.length === 0) {
    const paras = enrichedSection
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => {
        if (p.length < 50) return false
        if (p.startsWith('```')) return false
        if (/^\\[\[(]/.test(p) || /^\$\$/.test(p)) return false
        return true
      })
    paras.slice(0, 8).forEach((p, i) => {
      const firstSentence =
        cleanProse(p).split(/(?<=[.!?])\s+/)[0] || `Key idea ${i + 1}`
      let title = firstSentence.slice(0, 72)
      if (title.length < 12) title = `Key idea ${i + 1}`
      chunks.push({ title, text: enrichThinContent(title, p, enrichedSection) })
    })
  }

  if (chunks.length === 0) {
    chunks.push({
      title: sectionTitle,
      text: enrichThinContent(sectionTitle, body || `Learn the key ideas behind ${sectionTitle}.`, parentBody),
    })
  }

  for (let i = 0; i < Math.min(chunks.length, 10); i++) {
    const c = chunks[i]
    const sentences = extractSentences(c.text, 8)
    const plain = cleanProse(c.text)
    const textExplanation =
      sentences.slice(0, 3).join(' ') ||
      plain.slice(0, 650) ||
      STEP_DEPTH[c.title] ||
      `Study “${c.title}” carefully: definition, where it appears, how to detect issues, and how to fix them.`

    const visualExplanation =
      sentences[0] ||
      STEP_DEPTH[c.title] ||
      `This diagram walks through “${c.title}” one stage at a time.`

    let pointTitle = c.title.slice(0, 80)
    if (pointTitle.length > 70) pointTitle = `${pointTitle.slice(0, 70).replace(/\s+\S*$/, '').trim()}…`

    points.push({
      id: `pt-${i}`,
      title: pointTitle,
      visualExplanation,
      textExplanation,
      body: c.text.slice(0, 12000),
      diagram: buildPointFlow(pointTitle, c.text),
    })
  }

  return points
}
