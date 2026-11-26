/**
 * Learning-path engine shared by the Python and VeeraAgents paths.
 *
 * A path is stages → topics. Each topic claims lessons with rules (series + title patterns) and
 * gives each one a role. Lesson ids never change, so learner progress is preserved.
 * Interview questions are placed into the same topics (see classifyQuestions).
 */

export type Role = 'core' | 'practice' | 'deeper'
export type Rule = { s?: RegExp; t: RegExp; role?: Role }
export type PathLink = { to: string; title: string }
export type TopicDef = {
  id: string
  title: string
  icon: string
  blurb: string
  rules: Rule[]
  /** Keywords that place interview questions into this topic. */
  kw?: RegExp
  sims?: string[]
  labs?: PathLink[]
}
export type StageDef = { id: string; title: string; level: string; color: string; blurb: string; topics: TopicDef[] }

export type LessonRef = { id: string; title: string; summary: string; series?: string }
export type PathLesson = { id: string; title: string; summary: string; series?: string; role: Role }
export type PathTopic = Omit<TopicDef, 'rules'> & { stageId: string; number: number; lessons: PathLesson[] }
export type PathStage = Omit<StageDef, 'topics'> & { topics: PathTopic[] }
export type ResolvedPath = {
  stages: PathStage[]
  topics: PathTopic[]
  order: string[]
  where: Map<string, { topic: PathTopic; index: number }>
  unplaced: PathLesson[]
}

const topicOf = (title: string) => title.replace(/^\d{2}\.\s*[^:]+:\s*/, '').trim()
const ROLE_ORDER: Record<Role, number> = { core: 0, practice: 1, deeper: 2 }
const RUNNABLE = /Runnable Examples/

export function resolvePath(all: LessonRef[], defs: StageDef[]): ResolvedPath {
  const taken = new Set<string>()
  let number = 0
  const stages: PathStage[] = defs.map((st) => ({
    ...st,
    topics: st.topics.map((tp) => {
      const lessons: PathLesson[] = []
      for (const rule of tp.rules) {
        for (const l of all) {
          if (taken.has(l.id)) continue
          if (rule.s && !rule.s.test(l.series || '')) continue
          const title = topicOf(l.title)
          if (!rule.t.test(title)) continue
          taken.add(l.id)
          lessons.push({ id: l.id, title, summary: l.summary, series: l.series, role: rule.role || (RUNNABLE.test(title) ? 'practice' : 'core') })
        }
      }
      number++
      const { rules: _rules, ...rest } = tp
      return { ...rest, stageId: st.id, number, lessons: [...lessons].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]) }
    }),
  }))
  const topics = stages.flatMap((s) => s.topics)
  const unplaced = all.filter((l) => !taken.has(l.id)).map((l) => ({ id: l.id, title: topicOf(l.title), summary: l.summary, series: l.series, role: 'deeper' as Role }))
  const order: string[] = []
  const where = new Map<string, { topic: PathTopic; index: number }>()
  for (const tp of topics)
    tp.lessons.forEach((l, index) => {
      order.push(l.id)
      where.set(l.id, { topic: tp, index })
    })
  return { stages, topics, order, where, unplaced }
}

/** Core-lesson progress of a topic (practice and deeper lessons are optional). */
export function topicProgress(topic: PathTopic, completed: string[]) {
  const core = topic.lessons.filter((l) => l.role === 'core')
  const base = core.length ? core : topic.lessons
  const done = base.filter((l) => completed.includes(l.id)).length
  return { done, total: base.length, pct: base.length ? Math.round((done / base.length) * 100) : 0 }
}

/** The next unfinished core lesson in path order. */
export function nextLesson(path: ResolvedPath, completed: string[]) {
  for (const t of path.topics) {
    const l = t.lessons.find((x) => x.role === 'core' && !completed.includes(x.id))
    if (l) return { lesson: l, topic: t }
  }
  return null
}

/* ------------------------------------------------------------------ interview questions */

export type InterviewMap = {
  lessons: Record<string, Record<string, [string, string]>>
  questions: Record<string, [string, string, string, string | null][]>
}
export type Question = { lessonId: string; sectionId: string; text: string; heading: string | null; lessonTitle: string; series: string }
export type TopicQuestions = { topic: PathTopic | null; questions: Question[] }

/** How many distinct keyword hits a topic gets for a piece of text. */
function kwScore(topic: PathTopic | undefined, text: string) {
  if (!topic?.kw) return 0
  const re = new RegExp(topic.kw.source, topic.kw.flags.includes('g') ? topic.kw.flags : `${topic.kw.flags}g`)
  return new Set((text.match(re) || []).map((m) => m.toLowerCase())).size
}

/** Best-scoring topic; ties go to the later (more specific) topic. */
function bestTopic(topics: PathTopic[], text: string) {
  let best: PathTopic | undefined
  let bestScore = 0
  for (const t of topics) {
    const sc = kwScore(t, text)
    if (sc > 0 && sc >= bestScore) {
      best = t
      bestScore = sc
    }
  }
  return best
}

const GENERIC_SERIES = /^(Core Guides|Topic Workshops|Deep-Dive Notes|Interview Rebuild Plan|Advanced Python Topics|Reference Scripts|Interview Banks|Backend Interview Guide)$/

/**
 * Place every interview question into a path topic:
 *  1. a topic-specific course (e.g. "Strings Masterclass") → the topic that teaches that course,
 *  2. a course spread over several topics → keywords choose among them,
 *  3. mixed question banks → keywords over all topics,
 *  4. otherwise → "General".
 */
export function classifyQuestions(path: ResolvedPath, map: InterviewMap, track: string): TopicQuestions[] {
  const seriesTopics = new Map<string, Map<string, number>>()
  for (const t of path.topics)
    for (const l of t.lessons) {
      if (!l.series || GENERIC_SERIES.test(l.series)) continue
      const m = seriesTopics.get(l.series) || new Map<string, number>()
      m.set(t.id, (m.get(t.id) || 0) + (l.role === 'core' ? 2 : 1))
      seriesTopics.set(l.series, m)
    }
  const byId = new Map(path.topics.map((t) => [t.id, t]))
  const buckets = new Map<string, Question[]>()
  const general: Question[] = []
  const lessons = map.lessons[track] || {}
  const seen = new Set<string>()
  for (const [lessonId, sectionId, text, heading] of map.questions[track] || []) {
    const norm = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    if (seen.has(norm)) continue // the same question repeated across banks / parts
    seen.add(norm)
    const [lessonTitle, series] = lessons[lessonId] || ['', '']
    const q: Question = { lessonId, sectionId, text, heading, lessonTitle, series }
    const hay = `${text} ${sectionId.replace(/-/g, ' ')}`
    const candidates = seriesTopics.get(series)
    let topicId: string | undefined
    if (candidates && candidates.size === 1) topicId = [...candidates.keys()][0]
    else if (candidates && candidates.size > 1) {
      topicId = bestTopic([...candidates.keys()].map((id) => byId.get(id)!).filter(Boolean), hay)?.id
      if (!topicId) topicId = [...candidates.entries()].sort((a, b) => b[1] - a[1])[0][0]
    } else topicId = bestTopic(path.topics, hay)?.id
    if (topicId) buckets.set(topicId, [...(buckets.get(topicId) || []), q])
    else general.push(q)
  }
  const out: TopicQuestions[] = path.topics.map((t) => ({ topic: t, questions: buckets.get(t.id) || [] }))
  if (general.length) out.push({ topic: null, questions: general })
  return out
}

let mapPromise: Promise<InterviewMap> | null = null
/** The interview map is ~340 KB, so it is loaded only on interview pages. */
export function loadInterviewMap() {
  if (!mapPromise) mapPromise = import('@/content/generated/interview-map.json').then((m) => (m.default || m) as unknown as InterviewMap)
  return mapPromise
}
