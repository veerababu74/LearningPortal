/**
 * Multi-agent orchestration and agent design-pattern simulations.
 */
import type { AgentSim } from '@/content/agents/visualizer'

/* ================================================================ plan-and-execute */

const PLAN_EXECUTE: AgentSim = {
  id: 'plan-execute',
  title: 'Plan-and-execute with replanning',
  framework: 'LangGraph',
  group: 'Agent patterns',
  module: '08',
  level: 'Intermediate',
  summary: 'A planner writes the step list once, a cheap executor runs each step, and a replanner fixes the plan when a step fails.',
  scenario: 'Goal: “Book a team dinner for 6 on Friday near the office, under $60 per person.” One restaurant turns out to be full.',
  nodes: [
    { id: 'goal', label: 'Goal', x: 90, y: 200, kind: 'user' },
    { id: 'plan', label: 'Planner', sub: 'big model, once', x: 300, y: 80, kind: 'llm' },
    { id: 'exec', label: 'Executor', sub: 'small model + tools', x: 520, y: 200, kind: 'agent' },
    { id: 'tools', label: 'Tools', sub: 'maps · booking API', x: 720, y: 200, kind: 'tool' },
    { id: 'replan', label: 'Replanner', sub: 'edit remaining steps', x: 300, y: 330, kind: 'router' },
    { id: 'done', label: 'Answer', x: 720, y: 340, kind: 'end' },
  ],
  edges: [
    { id: 'g-p', from: 'goal', to: 'plan' },
    { id: 'p-e', from: 'plan', to: 'exec' },
    { id: 'e-t', from: 'exec', to: 'tools', bend: -20 },
    { id: 't-e', from: 'tools', to: 'exec', bend: -20 },
    { id: 'e-r', from: 'exec', to: 'replan' },
    { id: 'r-e', from: 'replan', to: 'exec', bend: -40 },
    { id: 'e-d', from: 'exec', to: 'done' },
  ],
  code: `class PlanState(TypedDict):
    goal: str
    plan: list[str]
    done: Annotated[list[tuple[str, str]], operator.add]

def planner(state):
    steps = planner_llm.with_structured_output(Plan).invoke(state["goal"]).steps
    return {"plan": steps}

def executor(state):
    step = state["plan"][0]
    result = executor_agent.invoke({"task": step, "history": state["done"]})
    return {"plan": state["plan"][1:], "done": [(step, result)]}

def replanner(state):
    new = planner_llm.with_structured_output(Plan).invoke(
        {"goal": state["goal"], "done": state["done"], "remaining": state["plan"]})
    return {"plan": new.steps}

def route(state):
    last = state["done"][-1][1]
    if last.startswith("FAILED"): return "replanner"
    return "executor" if state["plan"] else END`,
  steps: [
    {
      title: 'Planner writes the steps',
      edge: 'g-p',
      packet: 'goal',
      narration: 'One call to a strong model turns the goal into an ordered list of small, checkable steps.',
      state: { plan: ['1 find restaurants near office', '2 book Trattoria for 6 Fri 7pm', '3 send invite'], done: [] },
      changed: ['plan'],
      log: 'planner → 3 steps',
      hl: ['def planner', 'steps = planner_llm'],
    },
    {
      title: 'Execute step 1',
      edge: 'p-e',
      packet: 'step 1',
      narration: 'The executor only sees one step plus what is already done — a short context, so a cheaper model is enough.',
      log: 'executor: "find restaurants near office"',
      hl: ['def executor', 'step = state["plan"][0]'],
    },
    {
      title: 'Tool call: maps search',
      edge: 'e-t',
      packet: 'search_places()',
      narration: 'The executor uses its tools to complete the step.',
      log: 'tool search_places(near=office, price<60)',
    },
    {
      title: 'Step 1 done',
      edge: 't-e',
      packet: 'Trattoria, Sushi Go',
      narration: 'The result is recorded in `done` and the step is removed from the plan.',
      state: { plan: ['2 book Trattoria for 6 Fri 7pm', '3 send invite'], done: ['✓ found: Trattoria, Sushi Go'] },
      changed: ['plan', 'done'],
      log: 'step 1 ✓',
      hl: ['return {"plan": state["plan"][1:]'],
    },
    {
      title: 'Step 2 fails: fully booked',
      edge: 'e-t',
      packet: 'book(Trattoria)',
      tone: 'bad',
      narration: 'The booking API says Trattoria is full on Friday. The original plan is now wrong.',
      state: { plan: ['3 send invite'], done: ['✓ found: Trattoria, Sushi Go', '✗ FAILED Trattoria full'] },
      changed: ['done', 'plan'],
      log: 'step 2 ✗ FAILED: no table for 6',
      predict: {
        question: 'Step 2 failed. What should happen next?',
        options: ['Send the invite anyway (step 3)', 'Start the whole task over', 'Ask the replanner to change the remaining steps', 'Retry the same booking forever'],
        answer: 2,
        explain: 'Replanning keeps the completed work and only rewrites what is left — that is the point of the pattern.',
      },
    },
    {
      title: 'Route to the replanner',
      edge: 'e-r',
      packet: 'FAILED',
      node: 'replan',
      tone: 'warn',
      narration: 'The router sees FAILED and sends the state to the replanner with the goal, the done list and the remaining steps.',
      log: 'route → replanner',
      hl: ['def route', 'if last.startswith("FAILED")'],
    },
    {
      title: 'New plan',
      edge: 'r-e',
      packet: 'updated plan',
      node: 'exec',
      narration: 'The replanner uses the alternative it already found (Sushi Go) and keeps step 3.',
      state: { plan: ['2b book Sushi Go for 6 Fri 7pm', '3 send invite'], done: ['✓ found: Trattoria, Sushi Go', '✗ FAILED Trattoria full'] },
      changed: ['plan'],
      log: 'replanner → 2 steps',
      hl: ['def replanner', 'return {"plan": new.steps}'],
    },
    {
      title: 'Remaining steps succeed',
      edge: 'e-d',
      packet: 'booked + invited',
      node: 'done',
      tone: 'ok',
      narration: 'Executor finishes 2b and 3; the plan is empty so the route returns END. Cap replans (e.g. 3) so an impossible goal ends with an explanation.',
      state: { plan: [], done: ['✓ found', '✗ Trattoria full', '✓ booked Sushi Go', '✓ invite sent'] },
      changed: ['plan', 'done'],
      log: 'plan empty → END',
      hl: ['return "executor" if state["plan"] else END'],
    },
  ],
  match: /plan[- ]and[- ]execute|planning|task decomposition|planner|scheduling|delegation/i,
  takeaways: ['Plan once with a strong model, execute with a cheap one.', 'Keep completed work; replan only what remains.', 'Bound the number of replans.'],
}

/* ================================================================ reflection */

const REFLECTION: AgentSim = {
  id: 'reflection-loop',
  title: 'Reflection: generator and critic loop',
  framework: 'Pattern',
  group: 'Agent patterns',
  module: '08',
  level: 'Beginner',
  summary: 'A generator drafts, a critic scores against a rubric with concrete feedback, and the loop stops at a threshold or a max-attempts cap.',
  scenario: 'Write a SQL query for “monthly revenue per country in 2025”. The critic runs it against a test database.',
  nodes: [
    { id: 'task', label: 'Task', x: 90, y: 200, kind: 'user' },
    { id: 'gen', label: 'Generator', sub: 'writes SQL', x: 320, y: 90, kind: 'llm' },
    { id: 'critic', label: 'Critic', sub: 'runs tests, scores', x: 560, y: 90, kind: 'guard' },
    { id: 'gate', label: 'Gate', sub: 'score ≥ 8 or 3 tries', x: 440, y: 300, kind: 'router' },
    { id: 'out', label: 'Best answer', x: 700, y: 300, kind: 'end' },
  ],
  edges: [
    { id: 't-g', from: 'task', to: 'gen' },
    { id: 'g-c', from: 'gen', to: 'critic' },
    { id: 'c-gt', from: 'critic', to: 'gate' },
    { id: 'gt-g', from: 'gate', to: 'gen' },
    { id: 'gt-o', from: 'gate', to: 'out' },
  ],
  code: `def reflect(task: str, max_tries: int = 3) -> str:
    best, best_score, feedback = None, -1, ""
    for attempt in range(1, max_tries + 1):
        draft = generator.invoke({"task": task, "feedback": feedback})
        review = critic.invoke({"task": task, "draft": draft})   # runs the SQL
        if review.score > best_score:
            best, best_score = draft, review.score
        if review.score >= 8:
            break
        feedback = review.feedback          # concrete, actionable
    return best`,
  steps: [
    {
      title: 'Attempt 1: draft',
      edge: 't-g',
      packet: 'task',
      narration: 'The first draft is written with no feedback.',
      state: { attempt: '1', score: '—', best_score: '-1', feedback: '' },
      changed: ['attempt'],
      log: 'generator → draft 1',
      hl: ['for attempt in range', 'draft = generator.invoke'],
    },
    {
      title: 'Critic tests it',
      edge: 'g-c',
      packet: 'SQL v1',
      narration: 'The critic executes the query on a small fixture DB. A critic grounded in a real check is far better than one that only “reads” the draft.',
      log: 'critic runs SQL v1 on fixture DB',
      hl: ['review = critic.invoke'],
    },
    {
      title: 'Score 4: wrong grouping',
      edge: 'c-gt',
      packet: 'score 4',
      tone: 'warn',
      narration: 'The query groups by day, not month, and forgets the 2025 filter. Feedback names both problems precisely.',
      state: { attempt: '1', score: '4', best_score: '4', feedback: 'Group by DATE_TRUNC(month); add WHERE year = 2025' },
      changed: ['score', 'best_score', 'feedback'],
      log: 'score 4 < 8 → retry with feedback',
      hl: ['if review.score > best_score', 'feedback = review.feedback'],
      predict: {
        question: 'What does the generator receive on attempt 2?',
        options: ['Only the task again', 'The task plus the critic\'s specific feedback', 'The best draft only', 'Nothing — it stops here'],
        answer: 1,
        explain: 'Feeding back concrete, actionable criticism is what makes each attempt better instead of just different.',
      },
    },
    {
      title: 'Attempt 2 with feedback',
      edge: 'gt-g',
      packet: 'feedback',
      node: 'gen',
      narration: 'The generator fixes exactly the named issues.',
      state: { attempt: '2', score: '4', best_score: '4', feedback: 'Group by DATE_TRUNC(month); add WHERE year = 2025' },
      changed: ['attempt'],
      log: 'generator → draft 2',
    },
    {
      title: 'Critic re-tests',
      edge: 'g-c',
      packet: 'SQL v2',
      narration: 'Tests pass and the output matches the expected fixture.',
      log: 'critic runs SQL v2 → tests pass',
    },
    {
      title: 'Score 9 → stop',
      edge: 'c-gt',
      packet: 'score 9',
      node: 'gate',
      tone: 'ok',
      narration: 'Score is above the threshold, so the loop breaks.',
      state: { attempt: '2', score: '9', best_score: '9', feedback: '' },
      changed: ['score', 'best_score', 'feedback'],
      log: 'score 9 ≥ 8 → break',
      hl: ['if review.score >= 8', 'break'],
    },
    {
      title: 'Return the best draft',
      edge: 'gt-o',
      packet: 'SQL v2',
      tone: 'ok',
      narration: 'Always return the best-scoring draft, not the last one — a later attempt can be worse. max_tries bounds cost.',
      log: 'return best (score 9)',
      hl: ['return best'],
    },
  ],
  match: /reflect|self-critique|critic|evaluator|optimizer|self[- ]correct/i,
  takeaways: ['Ground the critic in a real check (tests, schema, retrieval).', 'Feedback must be specific and actionable.', 'Keep the best draft; cap attempts.'],
}

/* ================================================================ swarm / handoffs */

const HANDOFF: AgentSim = {
  id: 'swarm-handoff',
  title: 'Swarm handoffs: agents pass control directly',
  framework: 'OpenAI Agents SDK',
  group: 'Multi-agent',
  module: '08',
  level: 'Intermediate',
  summary: 'No central supervisor: the active agent hands the conversation to a peer via a handoff tool, and that peer talks to the user next.',
  scenario: 'A customer writes “I was charged twice for order 881, please refund one.”',
  nodes: [
    { id: 'user', label: 'Customer', x: 90, y: 200, kind: 'user' },
    { id: 'triage', label: 'Triage agent', sub: 'handoffs only', x: 320, y: 200, kind: 'router' },
    { id: 'billing', label: 'Billing agent', sub: 'lookup_charges', x: 560, y: 80, kind: 'agent' },
    { id: 'refund', label: 'Refund agent', sub: 'issue_refund', x: 560, y: 320, kind: 'agent' },
    { id: 'pay', label: 'Payments API', x: 740, y: 200, kind: 'tool' },
  ],
  edges: [
    { id: 'u-t', from: 'user', to: 'triage' },
    { id: 't-b', from: 'triage', to: 'billing' },
    { id: 'b-p', from: 'billing', to: 'pay', bend: -15 },
    { id: 'p-b', from: 'pay', to: 'billing', bend: -15 },
    { id: 'b-r', from: 'billing', to: 'refund' },
    { id: 'r-p', from: 'refund', to: 'pay', bend: 15 },
    { id: 'r-u', from: 'refund', to: 'user', bend: 60 },
  ],
  code: `refund_agent = Agent(
    name="Refunds", instructions="Refund duplicate charges after confirming the charge ids.",
    tools=[issue_refund])
billing_agent = Agent(
    name="Billing", instructions="Investigate charges. Hand off to Refunds if a refund is due.",
    tools=[lookup_charges], handoffs=[refund_agent])
triage_agent = Agent(
    name="Triage", instructions="Route to the right specialist. Never answer billing questions yourself.",
    handoffs=[billing_agent, refund_agent])

result = await Runner.run(triage_agent, "Charged twice for order 881, refund one", max_turns=10)
print(result.last_agent.name, result.final_output)`,
  steps: [
    {
      title: 'Triage receives the message',
      edge: 'u-t',
      packet: 'charged twice',
      narration: 'Triage has no business tools — only handoffs. Its whole job is picking who should own the conversation.',
      state: { active_agent: 'Triage', turns: '1', history: ['user: charged twice for 881'] },
      changed: ['active_agent'],
      log: 'Runner.run(triage)',
      hl: ['triage_agent = Agent(', 'result = await Runner.run'],
    },
    {
      title: 'Handoff to Billing',
      edge: 't-b',
      packet: 'transfer_to_billing()',
      node: 'billing',
      narration: 'A handoff is exposed to the model as a tool named transfer_to_billing. Calling it switches the active agent; the conversation history comes along.',
      state: { active_agent: 'Billing', turns: '2', history: ['user: charged twice for 881', 'triage → handoff Billing'] },
      changed: ['active_agent', 'turns', 'history'],
      log: 'handoff: Triage → Billing',
      hl: ['handoffs=[billing_agent, refund_agent]'],
      predict: {
        question: 'After the handoff, who talks to the customer next?',
        options: ['Triage, after Billing reports back', 'Billing — it now owns the conversation', 'A supervisor', 'Nobody until a human approves'],
        answer: 1,
        explain: 'Unlike the supervisor pattern, control does not return to a router. The new agent continues the conversation.',
      },
    },
    {
      title: 'Billing investigates',
      edge: 'b-p',
      packet: 'lookup_charges(881)',
      narration: 'Billing uses its own tool to confirm the duplicate.',
      log: 'lookup_charges(881)',
      hl: ['tools=[lookup_charges]'],
    },
    {
      title: 'Duplicate confirmed',
      edge: 'p-b',
      packet: 'ch_1, ch_2 same amount',
      narration: 'Two identical $49 charges, 3 seconds apart.',
      state: { active_agent: 'Billing', turns: '3', history: ['…', 'billing: 2 charges of $49 (ch_1, ch_2)'] },
      changed: ['history', 'turns'],
      log: 'charges: ch_1, ch_2 ($49 each)',
    },
    {
      title: 'Handoff to Refunds',
      edge: 'b-r',
      packet: 'transfer_to_refunds()',
      node: 'refund',
      narration: 'Billing is not allowed to refund (least privilege), so it hands off to the agent that is.',
      state: { active_agent: 'Refunds', turns: '4', history: ['…', 'billing → handoff Refunds'] },
      changed: ['active_agent', 'turns', 'history'],
      log: 'handoff: Billing → Refunds',
      hl: ['handoffs=[refund_agent]'],
    },
    {
      title: 'Refund issued',
      edge: 'r-p',
      packet: 'issue_refund(ch_2)',
      node: 'pay',
      narration: 'The Refunds agent refunds the second charge.',
      log: 'issue_refund(ch_2) → ok',
      hl: ['tools=[issue_refund]'],
    },
    {
      title: 'Refunds replies directly',
      edge: 'r-u',
      packet: 'refunded $49',
      node: 'user',
      tone: 'ok',
      narration: 'result.last_agent is Refunds. max_turns stops agents from bouncing the user around forever.',
      state: { active_agent: 'Refunds', turns: '5', history: ['…', 'refunds: refunded $49 for ch_2'] },
      changed: ['history', 'turns'],
      log: 'final_output from Refunds',
      hl: ['print(result.last_agent.name', 'max_turns=10'],
    },
  ],
  match: /handoff|swarm|openai agents sdk|peer-to-peer|manager and handoff/i,
  takeaways: ['Handoffs transfer ownership; there is no central router.', 'Give each agent only the tools its role needs.', 'Use max_turns to stop ping-pong.'],
}

/* ================================================================ hierarchical teams */

const HIERARCHY: AgentSim = {
  id: 'hierarchical-teams',
  title: 'Hierarchical teams: supervisors of supervisors',
  framework: 'LangGraph',
  group: 'Multi-agent',
  module: '08',
  level: 'Advanced',
  summary: 'A top-level supervisor delegates to team leads, each running its own sub-graph of workers, and only summaries flow back up.',
  scenario: 'Produce a market report: a research team (web + papers) and a writing team (writer + chart maker).',
  nodes: [
    { id: 'top', label: 'Top supervisor', x: 420, y: 50, kind: 'router' },
    { id: 'rlead', label: 'Research lead', sub: 'sub-graph', x: 220, y: 180, kind: 'router' },
    { id: 'wlead', label: 'Writing lead', sub: 'sub-graph', x: 620, y: 180, kind: 'router' },
    { id: 'web', label: 'Web searcher', x: 110, y: 330, kind: 'agent' },
    { id: 'paper', label: 'Paper reader', x: 330, y: 330, kind: 'agent' },
    { id: 'writer', label: 'Writer', x: 520, y: 330, kind: 'llm' },
    { id: 'chart', label: 'Chart maker', x: 720, y: 330, kind: 'tool' },
  ],
  edges: [
    { id: 't-r', from: 'top', to: 'rlead', bend: -15 },
    { id: 'r-t', from: 'rlead', to: 'top', bend: -15 },
    { id: 't-w', from: 'top', to: 'wlead', bend: -15 },
    { id: 'w-t', from: 'wlead', to: 'top', bend: -15 },
    { id: 'r-web', from: 'rlead', to: 'web' },
    { id: 'r-pap', from: 'rlead', to: 'paper' },
    { id: 'w-wr', from: 'wlead', to: 'writer' },
    { id: 'w-ch', from: 'wlead', to: 'chart' },
  ],
  code: `research_team = build_team(lead_prompt=RESEARCH_LEAD, workers=[web_searcher, paper_reader]).compile()
writing_team  = build_team(lead_prompt=WRITING_LEAD,  workers=[writer, chart_maker]).compile()

def call_research(state):
    out = research_team.invoke({"messages": [state["messages"][-1]]})   # isolated context
    return {"messages": [AIMessage(summarize(out), name="research_team")]}

def call_writing(state):
    out = writing_team.invoke({"messages": state["messages"][-2:]})
    return {"messages": [AIMessage(out["messages"][-1].content, name="writing_team")]}

top = StateGraph(MessagesState)
top.add_node("supervisor", top_supervisor)
top.add_node("research_team", call_research)
top.add_node("writing_team", call_writing)`,
  steps: [
    {
      title: 'Top supervisor delegates research',
      edge: 't-r',
      packet: 'research EV market',
      narration: 'The top supervisor only knows two “workers”: the research team and the writing team. Each team is a whole compiled graph used as a node.',
      state: { 'top context': ['user: EV market report'], 'research ctx': [], 'writing ctx': [] },
      log: 'top → research_team',
      hl: ['def call_research', 'research_team.invoke'],
    },
    {
      title: 'Research lead fans out',
      edge: 'r-web',
      packet: 'search news',
      node: 'web',
      narration: 'The research team starts with a fresh, isolated context — just the task. Its workers never see the writing team\'s chatter.',
      state: { 'top context': ['user: EV market report'], 'research ctx': ['task: research EV market', 'web: sales +25% YoY'], 'writing ctx': [] },
      changed: ['research ctx'],
      log: 'research lead → web searcher',
    },
    {
      title: 'Paper reader',
      edge: 'r-pap',
      packet: 'read reports',
      node: 'paper',
      state: { 'top context': ['user: EV market report'], 'research ctx': ['task', 'web: sales +25%', 'paper: battery cost -14%', '…12 more messages'], 'writing ctx': [] },
      changed: ['research ctx'],
      narration: 'Inside the team, context grows to 15 messages of raw findings.',
      log: 'research lead → paper reader',
    },
    {
      title: 'Only a summary goes up',
      edge: 'r-t',
      packet: 'summary (180 tokens)',
      node: 'top',
      narration: 'The team returns one summarized message. The top level stays small and cheap no matter how much work happened below.',
      state: { 'top context': ['user: EV market report', 'research_team: sales +25%, battery cost -14%, top 3 brands…'], 'research ctx': ['(discarded)'], 'writing ctx': [] },
      changed: ['top context', 'research ctx'],
      log: 'research_team → summary to top',
      hl: ['return {"messages": [AIMessage(summarize(out)'],
      predict: {
        question: 'Why return a summary instead of all 15 research messages?',
        options: ['LangGraph forbids long messages', 'To keep the top supervisor\'s context small and focused', 'Summaries are more accurate', 'To hide errors'],
        answer: 1,
        explain: 'Context isolation is the main benefit of hierarchies: each level sees only what it needs to decide.',
      },
    },
    {
      title: 'Delegate writing',
      edge: 't-w',
      packet: 'write report',
      narration: 'The writing team gets the task plus the research summary — the last two messages.',
      state: { 'top context': ['user: EV market report', 'research_team: summary'], 'research ctx': ['(discarded)'], 'writing ctx': ['task + research summary'] },
      changed: ['writing ctx'],
      log: 'top → writing_team',
      hl: ['writing_team.invoke({"messages": state["messages"][-2:]})'],
    },
    {
      title: 'Writer and chart maker',
      edge: 'w-ch',
      packet: 'bar chart',
      node: 'chart',
      narration: 'The writing lead runs the writer and the chart maker inside its own sub-graph.',
      log: 'writing lead → writer, chart maker',
    },
    {
      title: 'Report returned',
      edge: 'w-t',
      packet: 'final report',
      node: 'top',
      tone: 'ok',
      narration: 'The top supervisor finishes. Hierarchies scale to many workers, at the cost of extra LLM hops and latency per level.',
      state: { 'top context': ['user: EV market report', 'research_team: summary', 'writing_team: report + chart'], 'research ctx': ['(discarded)'], 'writing ctx': ['(discarded)'] },
      changed: ['top context', 'writing ctx'],
      log: 'top → END',
    },
  ],
  match: /hierarch|team|sub-?graph|orchestration architectures|orchestration engine/i,
  takeaways: ['Use whole graphs as nodes to build teams.', 'Pass summaries up, not raw transcripts.', 'Each level adds latency — keep hierarchies shallow.'],
}

/* ================================================================ orchestrator-workers / map-reduce */

const MAP_REDUCE: AgentSim = {
  id: 'map-reduce-send',
  title: 'Orchestrator-workers: dynamic fan-out with Send',
  framework: 'LangGraph',
  group: 'Multi-agent',
  module: '08',
  level: 'Advanced',
  summary: 'The orchestrator decides at run time how many workers to start; LangGraph\'s Send runs them in parallel and a reducer collects results.',
  scenario: 'Review a pull request that touches 3 files — one worker per file, then a combined review.',
  nodes: [
    { id: 'orch', label: 'Orchestrator', sub: 'splits the work', x: 120, y: 200, kind: 'router' },
    { id: 'w1', label: 'worker: api.py', x: 400, y: 70, kind: 'agent' },
    { id: 'w2', label: 'worker: db.py', x: 400, y: 200, kind: 'agent' },
    { id: 'w3', label: 'worker: ui.tsx', x: 400, y: 330, kind: 'agent' },
    { id: 'red', label: 'Synthesizer', sub: 'reduce', x: 680, y: 200, kind: 'llm' },
  ],
  edges: [
    { id: 'o-1', from: 'orch', to: 'w1' },
    { id: 'o-2', from: 'orch', to: 'w2' },
    { id: 'o-3', from: 'orch', to: 'w3' },
    { id: '1-r', from: 'w1', to: 'red' },
    { id: '2-r', from: 'w2', to: 'red' },
    { id: '3-r', from: 'w3', to: 'red' },
  ],
  code: `class State(TypedDict):
    files: list[str]
    reviews: Annotated[list[str], operator.add]     # collects worker output

def fan_out(state):
    return [Send("review_file", {"file": f}) for f in state["files"]]

def review_file(arg):                                  # gets only its own file
    return {"reviews": [reviewer.invoke(read(arg["file"])).content]}

def synthesize(state):
    return {"summary": llm.invoke(f"Combine: {state['reviews']}").content}

builder.add_conditional_edges("orchestrator", fan_out, ["review_file"])
builder.add_edge("review_file", "synthesize")`,
  steps: [
    {
      title: 'Orchestrator lists the work',
      node: 'orch',
      narration: 'The number of workers is not known when you write the graph — it depends on the PR.',
      state: { files: ['api.py', 'db.py', 'ui.tsx'], reviews: [] },
      changed: ['files'],
      log: 'orchestrator: 3 changed files',
    },
    {
      title: 'Send → worker 1',
      edge: 'o-1',
      packet: 'Send(file=api.py)',
      narration: 'fan_out returns one Send per file. Each Send starts the same node with its own private input.',
      log: 'Send("review_file", api.py)',
      hl: ['def fan_out', 'return [Send("review_file"'],
    },
    {
      title: 'Send → worker 2',
      edge: 'o-2',
      packet: 'Send(file=db.py)',
      narration: 'All three run in the same super-step, in parallel.',
      log: 'Send("review_file", db.py)',
    },
    {
      title: 'Send → worker 3',
      edge: 'o-3',
      packet: 'Send(file=ui.tsx)',
      narration: 'Each worker sees only one file — small context, focused review.',
      log: 'Send("review_file", ui.tsx)',
      hl: ['def review_file'],
      predict: {
        question: 'All three workers write to `reviews` at the same time. What makes that safe?',
        options: ['A lock in review_file', 'The operator.add reducer on reviews', 'They run one after another', 'LangGraph keeps only the last one'],
        answer: 1,
        explain: 'Parallel writes to one key need a reducer; operator.add concatenates the three lists.',
      },
    },
    {
      title: 'Results merge',
      edge: '1-r',
      packet: 'review 1',
      narration: 'The reducer concatenates every worker\'s list into reviews.',
      state: { files: ['api.py', 'db.py', 'ui.tsx'], reviews: ['api.py: missing auth check', 'db.py: N+1 query in loop', 'ui.tsx: OK'] },
      changed: ['reviews'],
      log: 'reviews += 3 (operator.add)',
      hl: ['reviews: Annotated[list[str], operator.add]'],
    },
    {
      title: 'Synthesize',
      edge: '2-r',
      packet: 'all reviews',
      node: 'red',
      tone: 'ok',
      narration: 'The synthesizer runs after all workers finish and writes one prioritized review. Latency ≈ slowest worker, not the sum.',
      log: 'synthesize → "2 blocking issues: auth, N+1"',
      hl: ['def synthesize', 'builder.add_edge("review_file", "synthesize")'],
    },
  ],
  match: /map[- ]?reduce|orchestrator[- ]workers?|send api|parallel|fan-?out|scatter/i,
  takeaways: ['Send creates a dynamic number of parallel workers.', 'Each worker gets a private, small input.', 'A reducer gathers results; latency is the slowest worker.'],
}

/* ================================================================ debate / voting */

const VOTING: AgentSim = {
  id: 'debate-voting',
  title: 'Consensus: independent answers, debate, vote',
  framework: 'Pattern',
  group: 'Multi-agent',
  module: '08',
  level: 'Advanced',
  summary: 'Three agents answer independently, see each other\'s reasoning for one debate round, then a judge takes the majority with confidence.',
  scenario: '“Is this transaction fraudulent?” — a $4,900 purchase from a new device in another country.',
  nodes: [
    { id: 'q', label: 'Case', x: 90, y: 200, kind: 'user' },
    { id: 'a1', label: 'Agent A', sub: 'rules expert', x: 340, y: 70, kind: 'llm' },
    { id: 'a2', label: 'Agent B', sub: 'behaviour model', x: 340, y: 200, kind: 'llm' },
    { id: 'a3', label: 'Agent C', sub: 'history analyst', x: 340, y: 330, kind: 'llm' },
    { id: 'judge', label: 'Judge', sub: 'majority + confidence', x: 640, y: 200, kind: 'guard' },
  ],
  edges: [
    { id: 'q-1', from: 'q', to: 'a1' },
    { id: 'q-2', from: 'q', to: 'a2' },
    { id: 'q-3', from: 'q', to: 'a3' },
    { id: '1-j', from: 'a1', to: 'judge' },
    { id: '2-j', from: 'a2', to: 'judge' },
    { id: '3-j', from: 'a3', to: 'judge' },
    { id: 'j-2', from: 'judge', to: 'a2', bend: 30 },
  ],
  code: `async def decide(case):
    votes = await asyncio.gather(*(a.ainvoke(case) for a in (rules, behaviour, history)))
    if len({v.label for v in votes}) > 1:                         # disagreement
        shared = "\\n".join(v.reasoning for v in votes)
        votes = await asyncio.gather(*(a.ainvoke({**case, "others": shared})
                                       for a in (rules, behaviour, history)))
    label, n = Counter(v.label for v in votes).most_common(1)[0]
    confidence = n / len(votes)
    return label if confidence >= 2 / 3 else "ESCALATE_TO_HUMAN"`,
  steps: [
    {
      title: 'Independent answers in parallel',
      edge: 'q-1',
      packet: 'case',
      narration: 'Agents answer without seeing each other first — that independence is what makes a vote meaningful.',
      state: { round: '1', votes: [], decision: '—' },
      log: 'gather(rules, behaviour, history)',
      hl: ['votes = await asyncio.gather'],
    },
    {
      title: 'Votes arrive',
      edge: '2-j',
      packet: 'B: legit',
      node: 'judge',
      narration: 'A and C say fraud, B says legitimate (the user travels often).',
      state: { round: '1', votes: ['A: FRAUD (new device + amount)', 'B: LEGIT (frequent traveller)', 'C: FRAUD (never spent > $800)'], decision: '—' },
      changed: ['votes'],
      log: 'votes: FRAUD, LEGIT, FRAUD',
    },
    {
      title: 'Disagreement → one debate round',
      edge: 'j-2',
      packet: 'others\' reasoning',
      node: 'a2',
      narration: 'Each agent now sees the others\' reasoning and may update. One round is usually enough; more rounds tend to converge on the loudest agent.',
      state: { round: '2', votes: ['A: FRAUD', 'B: LEGIT', 'C: FRAUD'], decision: '—' },
      changed: ['round'],
      log: 'disagreement → debate round',
      hl: ['if len({v.label for v in votes}) > 1', 'shared = '],
      predict: {
        question: 'If the final vote were 2 vs 1, should the system auto-block the card?',
        options: ['Yes, majority wins', 'Only if confidence ≥ the threshold (2/3 here)', 'Never auto-block', 'Ask Agent B again'],
        answer: 1,
        explain: 'Majority plus a confidence threshold; anything below it escalates to a human.',
      },
    },
    {
      title: 'B updates its vote',
      edge: '1-j',
      packet: 'A: FRAUD',
      node: 'judge',
      narration: 'B notices the device was registered 4 minutes before the purchase and changes to FRAUD.',
      state: { round: '2', votes: ['A: FRAUD', 'B: FRAUD (device age 4 min)', 'C: FRAUD'], decision: '—' },
      changed: ['votes'],
      log: 'round 2: FRAUD ×3',
    },
    {
      title: 'Judge decides',
      edge: '3-j',
      packet: 'C: FRAUD',
      node: 'judge',
      tone: 'ok',
      narration: 'Unanimous, confidence 1.0 ≥ 2/3 → block. Below the threshold the case would go to a human reviewer.',
      state: { round: '2', votes: ['A: FRAUD', 'B: FRAUD', 'C: FRAUD'], decision: 'FRAUD (confidence 1.0)' },
      changed: ['decision'],
      log: 'decision FRAUD, confidence 1.0',
      hl: ['label, n = Counter', 'confidence = n / len(votes)', 'return label if confidence'],
    },
  ],
  match: /consensus|voting|debate|conflict resolution|cooperative|competitive/i,
  takeaways: ['Collect independent answers before any discussion.', 'Limit debate rounds.', 'Decide with majority plus a confidence threshold; escalate the rest.'],
}

/* ================================================================ A2A */

const A2A: AgentSim = {
  id: 'a2a-protocol',
  title: 'A2A: one agent hires another over the network',
  framework: 'A2A',
  group: 'Multi-agent',
  module: '08',
  level: 'Intermediate',
  summary: 'A client agent discovers a remote agent through its Agent Card, sends a task, receives status updates and collects the artifact.',
  scenario: 'A travel-planner agent asks a remote “visa checker” agent (another team, another framework) whether a trip needs a visa.',
  nodes: [
    { id: 'client', label: 'Travel planner', sub: 'A2A client', x: 110, y: 200, kind: 'agent' },
    { id: 'card', label: 'Agent Card', sub: '/.well-known/agent.json', x: 420, y: 60, kind: 'service' },
    { id: 'server', label: 'Visa checker', sub: 'A2A server (ADK)', x: 700, y: 200, kind: 'agent' },
    { id: 'task', label: 'Task store', sub: 'id · status · artifacts', x: 420, y: 340, kind: 'memory' },
  ],
  edges: [
    { id: 'c-card', from: 'client', to: 'card' },
    { id: 'card-c', from: 'card', to: 'client', bend: 30 },
    { id: 'c-s', from: 'client', to: 'server', bend: -20 },
    { id: 's-c', from: 'server', to: 'client', bend: -20 },
    { id: 's-t', from: 'server', to: 'task' },
  ],
  code: `# client side
card = httpx.get("https://visa.example.com/.well-known/agent.json").json()
assert "visa-requirements" in [s["id"] for s in card["skills"]]

client = A2AClient(url=card["url"], auth=bearer_token())
task = await client.send_message(message={
    "role": "user",
    "parts": [{"kind": "text", "text": "Indian passport, 10 days in Japan for tourism"}]})

async for event in client.subscribe(task.id):           # SSE stream
    if event.status.state == "completed":
        visa = event.artifacts[0].parts[0].data           # structured result
    elif event.status.state == "input-required":
        await client.send_message(task_id=task.id, message=ask_user(event))`,
  steps: [
    {
      title: 'Discover the remote agent',
      edge: 'c-card',
      packet: 'GET agent.json',
      narration: 'The Agent Card is a public JSON document: name, endpoint URL, auth scheme and the skills the agent offers.',
      state: { task_id: '—', status: '—', artifact: '—' },
      log: 'GET /.well-known/agent.json',
      hl: ['card = httpx.get'],
    },
    {
      title: 'Check skills',
      edge: 'card-c',
      packet: 'skills: visa-requirements',
      narration: 'The client confirms the remote agent advertises the skill it needs. Neither side needs to know what framework the other uses.',
      log: 'skill visa-requirements ✓',
      hl: ['assert "visa-requirements"'],
    },
    {
      title: 'Send a message → task created',
      edge: 'c-s',
      packet: 'message/send',
      narration: 'Communication is JSON-RPC over HTTP. The server creates a Task with an id and a lifecycle state.',
      state: { task_id: 't-913', status: 'submitted', artifact: '—' },
      changed: ['task_id', 'status'],
      log: 'POST message/send → task t-913',
      hl: ['task = await client.send_message'],
    },
    {
      title: 'Server works on it',
      edge: 's-t',
      packet: 'status: working',
      node: 'task',
      narration: 'The remote agent runs its own tools and models; its internals stay private. Status changes are persisted with the task.',
      state: { task_id: 't-913', status: 'working', artifact: '—' },
      changed: ['status'],
      log: 'task t-913 → working',
    },
    {
      title: 'Streamed status update',
      edge: 's-c',
      packet: 'SSE: working',
      node: 'client',
      narration: 'The client subscribes and receives updates over Server-Sent Events, so long tasks do not block an HTTP request.',
      log: 'SSE: status working',
      hl: ['async for event in client.subscribe'],
      predict: {
        question: 'The visa checker needs the travel date to answer. What does A2A provide for this?',
        options: ['The task fails', 'Status input-required; the client replies on the same task id', 'The client must start a new task', 'The server guesses'],
        answer: 1,
        explain: 'input-required pauses the task until the client sends another message with the same task_id.',
      },
    },
    {
      title: 'Completed with an artifact',
      edge: 's-c',
      packet: 'artifact: visa required',
      node: 'client',
      tone: 'ok',
      narration: 'Results come back as typed artifacts (text, files or structured data), not just chat text.',
      state: { task_id: 't-913', status: 'completed', artifact: '{"visa": "required", "type": "e-Visa", "days": 5}' },
      changed: ['status', 'artifact'],
      log: 'task completed, 1 artifact',
      hl: ['if event.status.state == "completed"', 'visa = event.artifacts'],
    },
  ],
  match: /\ba2a\b|agent-to-agent|agent communication|distributed agent communication|discovery/i,
  takeaways: ['Agent Cards make remote agents discoverable.', 'Tasks have ids and states (submitted, working, input-required, completed).', 'MCP connects agents to tools; A2A connects agents to agents.'],
}

/* ================================================================ MCP */

const MCP: AgentSim = {
  id: 'mcp-session',
  title: 'MCP: initialize, list tools, call a tool',
  framework: 'MCP',
  group: 'Agents',
  module: '02',
  level: 'Beginner',
  summary: 'Follow the JSON-RPC messages between an MCP client and server, and see how the server\'s tools end up in the LLM\'s tool list.',
  scenario: 'A coding agent connects to a GitHub MCP server and opens an issue.',
  nodes: [
    { id: 'llm', label: 'LLM', x: 110, y: 90, kind: 'llm' },
    { id: 'host', label: 'Host + MCP client', sub: 'your agent app', x: 330, y: 220, kind: 'agent' },
    { id: 'server', label: 'MCP server', sub: 'github (stdio)', x: 610, y: 220, kind: 'service' },
    { id: 'api', label: 'GitHub API', x: 610, y: 360, kind: 'tool' },
  ],
  edges: [
    { id: 'h-s', from: 'host', to: 'server', bend: -25 },
    { id: 's-h', from: 'server', to: 'host', bend: -25 },
    { id: 'h-l', from: 'host', to: 'llm', bend: -20 },
    { id: 'l-h', from: 'llm', to: 'host', bend: -20 },
    { id: 's-a', from: 'server', to: 'api' },
  ],
  code: `async with stdio_client(StdioServerParameters(command="github-mcp")) as (r, w):
    async with ClientSession(r, w) as session:
        await session.initialize()                      # capabilities handshake
        tools = (await session.list_tools()).tools      # name, description, inputSchema
        llm_tools = [to_openai_schema(t) for t in tools]

        msg = llm(messages, tools=llm_tools)
        for call in msg.tool_calls:
            result = await session.call_tool(call.name, json.loads(call.arguments))
            messages.append(tool_message(call.id, result.content))`,
  steps: [
    {
      title: 'initialize',
      edge: 'h-s',
      packet: 'initialize',
      narration: 'The client starts the server process (stdio transport) and they exchange protocol versions and capabilities.',
      state: { connected: 'false', tools: [] },
      log: '→ initialize {protocolVersion, capabilities}',
      hl: ['async with stdio_client', 'await session.initialize()'],
    },
    {
      title: 'tools/list',
      edge: 's-h',
      packet: 'create_issue, search_code, …',
      narration: 'The server describes its tools with names, descriptions and JSON Schemas — exactly what an LLM needs for tool calling.',
      state: { connected: 'true', tools: ['create_issue(repo, title, body)', 'search_code(query)', 'get_pr(number)'] },
      changed: ['connected', 'tools'],
      log: '← tools/list: 3 tools',
      hl: ['tools = (await session.list_tools()).tools', 'llm_tools = '],
    },
    {
      title: 'LLM sees the tools',
      edge: 'h-l',
      packet: 'messages + 3 tool schemas',
      narration: 'The host converts MCP tool schemas into the model provider\'s tool format. The LLM does not know MCP exists.',
      log: 'host → LLM with 3 tools',
      hl: ['msg = llm(messages, tools=llm_tools)'],
      predict: {
        question: 'Who actually sends the request to the GitHub API?',
        options: ['The LLM', 'The host app directly', 'The MCP server', 'The user\'s browser'],
        answer: 2,
        explain: 'The host forwards the tool call to the MCP server, which owns the credentials and calls GitHub.',
      },
    },
    {
      title: 'Model calls create_issue',
      edge: 'l-h',
      packet: 'create_issue(...)',
      narration: 'A normal tool call from the model\'s point of view.',
      log: 'LLM → tool_call create_issue',
    },
    {
      title: 'tools/call',
      edge: 'h-s',
      packet: 'tools/call create_issue',
      node: 'server',
      narration: 'The client sends a tools/call request to the server that owns the tool.',
      log: '→ tools/call create_issue',
      hl: ['result = await session.call_tool'],
    },
    {
      title: 'Server calls GitHub',
      edge: 's-a',
      packet: 'POST /issues',
      node: 'api',
      narration: 'Credentials live in the server process, not in the prompt or the host.',
      log: 'server → GitHub API',
    },
    {
      title: 'Result back to the model',
      edge: 's-h',
      packet: 'issue #42 created',
      node: 'host',
      tone: 'ok',
      narration: 'The result returns as MCP content and is appended as a tool message. Write the tool once as a server; any MCP host can use it.',
      log: '← result: issue #42',
      hl: ['messages.append(tool_message'],
    },
  ],
  match: /\bmcp\b|model context protocol|tool ecosystems?/i,
  takeaways: ['MCP standardizes tool discovery (tools/list) and execution (tools/call).', 'Credentials stay in the server.', 'The host translates MCP tools into the LLM\'s tool format.'],
}

/* ================================================================ Saga */

const SAGA: AgentSim = {
  id: 'saga-compensation',
  title: 'Saga: undo completed steps when a later agent fails',
  framework: 'Pattern',
  group: 'Multi-agent',
  module: '09',
  level: 'Advanced',
  summary: 'Multi-agent workflows that touch real systems cannot roll back a database transaction. A saga runs compensating actions in reverse order instead.',
  scenario: 'Trip booking: flight agent → hotel agent → car agent. The car agent fails after flight and hotel are already booked.',
  nodes: [
    { id: 'orch', label: 'Saga orchestrator', sub: 'durable log', x: 120, y: 200, kind: 'router' },
    { id: 'flight', label: 'Flight agent', x: 420, y: 70, kind: 'agent' },
    { id: 'hotel', label: 'Hotel agent', x: 420, y: 200, kind: 'agent' },
    { id: 'car', label: 'Car agent', x: 420, y: 330, kind: 'agent' },
    { id: 'log', label: 'Saga log', sub: 'step + compensation', x: 700, y: 200, kind: 'memory' },
  ],
  edges: [
    { id: 'o-f', from: 'orch', to: 'flight', bend: -15 },
    { id: 'f-o', from: 'flight', to: 'orch', bend: -15 },
    { id: 'o-h', from: 'orch', to: 'hotel', bend: -15 },
    { id: 'h-o', from: 'hotel', to: 'orch', bend: -15 },
    { id: 'o-c', from: 'orch', to: 'car', bend: -15 },
    { id: 'c-o', from: 'car', to: 'orch', bend: -15 },
    { id: 'f-l', from: 'flight', to: 'log' },
    { id: 'h-l', from: 'hotel', to: 'log' },
  ],
  code: `STEPS = [("flight", book_flight, cancel_flight),
         ("hotel",  book_hotel,  cancel_hotel),
         ("car",    book_car,    cancel_car)]

async def run_saga(trip):
    completed = []
    for name, action, compensate in STEPS:
        try:
            ref = await action(trip, idempotency_key=f"{trip.id}:{name}")
            completed.append((name, compensate, ref))
            saga_log.write(trip.id, name, ref)          # durable before continuing
        except Exception as err:
            for done_name, undo, done_ref in reversed(completed):
                await undo(done_ref, idempotency_key=f"{trip.id}:undo:{done_name}")
            return {"status": "rolled_back", "failed_at": name, "reason": str(err)}
    return {"status": "booked"}`,
  steps: [
    {
      title: 'Book the flight',
      edge: 'o-f',
      packet: 'book_flight',
      narration: 'Each step has an action and a compensating action. Idempotency keys make retries safe.',
      state: { completed: [], status: 'running' },
      log: 'flight agent: book',
      hl: ['STEPS = [("flight"', 'ref = await action'],
    },
    {
      title: 'Record it durably',
      edge: 'f-l',
      packet: 'FL-77',
      node: 'log',
      narration: 'The saga log is written before moving on, so a crash later still knows what must be undone.',
      state: { completed: ['flight FL-77'], status: 'running' },
      changed: ['completed'],
      log: 'saga log: flight FL-77',
      hl: ['saga_log.write'],
    },
    {
      title: 'Book the hotel',
      edge: 'o-h',
      packet: 'book_hotel',
      narration: 'Second step succeeds too.',
      log: 'hotel agent: book',
    },
    {
      title: 'Hotel recorded',
      edge: 'h-l',
      packet: 'HT-12',
      node: 'log',
      state: { completed: ['flight FL-77', 'hotel HT-12'], status: 'running' },
      changed: ['completed'],
      narration: 'Two real-world side effects now exist.',
      log: 'saga log: hotel HT-12',
    },
    {
      title: 'Car agent fails',
      edge: 'o-c',
      packet: 'book_car',
      node: 'car',
      tone: 'bad',
      narration: 'No cars available. There is no database transaction to roll back — the flight and hotel are real bookings with other companies.',
      log: 'car agent: ✗ no availability',
      predict: {
        question: 'In what order should compensations run?',
        options: ['Flight then hotel', 'Hotel then flight (reverse order)', 'In parallel, any order', 'Do not compensate, ask the user'],
        answer: 1,
        explain: 'Undo in reverse order, mirroring a stack — later steps may depend on earlier ones.',
      },
    },
    {
      title: 'Compensate: cancel hotel',
      edge: 'h-o',
      packet: 'cancel_hotel(HT-12)',
      node: 'hotel',
      tone: 'warn',
      narration: 'Walking the completed list in reverse: hotel first.',
      state: { completed: ['flight FL-77', 'hotel HT-12 ↺ cancelled'], status: 'compensating' },
      changed: ['completed', 'status'],
      log: 'compensate: cancel_hotel',
      hl: ['for done_name, undo, done_ref in reversed(completed)', 'await undo('],
    },
    {
      title: 'Compensate: cancel flight',
      edge: 'f-o',
      packet: 'cancel_flight(FL-77)',
      node: 'orch',
      tone: 'ok',
      narration: 'Everything is undone and the user gets a clear reason. Compensations must themselves be idempotent and retried until they succeed.',
      state: { completed: ['flight FL-77 ↺ cancelled', 'hotel HT-12 ↺ cancelled'], status: 'rolled_back (car)' },
      changed: ['completed', 'status'],
      log: 'compensate: cancel_flight → rolled_back',
      hl: ['return {"status": "rolled_back"'],
    },
  ],
  match: /saga|distributed transaction|compensat|durable/i,
  takeaways: ['Pair every side-effecting step with a compensation.', 'Log each step durably before continuing.', 'Compensate in reverse order, idempotently.'],
}

/* ================================================================ durable execution */

const DURABLE: AgentSim = {
  id: 'durable-resume',
  title: 'Durable execution: crash mid-run and resume',
  framework: 'LangGraph',
  group: 'Multi-agent',
  module: '09',
  level: 'Advanced',
  summary: 'The worker process dies during step 3 of 4. Because each super-step was checkpointed, a new worker resumes at step 3 without redoing paid work.',
  scenario: 'A nightly research pipeline: fetch → analyse (expensive) → write → publish. The pod is killed during “write”.',
  nodes: [
    { id: 'w1', label: 'Worker pod A', x: 120, y: 110, kind: 'service' },
    { id: 'w2', label: 'Worker pod B', x: 120, y: 310, kind: 'service' },
    { id: 'graph', label: 'Graph run', sub: 'thread nightly-0412', x: 420, y: 210, kind: 'agent' },
    { id: 'pg', label: 'Postgres', sub: 'checkpoints', x: 700, y: 210, kind: 'memory' },
  ],
  edges: [
    { id: 'a-g', from: 'w1', to: 'graph' },
    { id: 'g-pg', from: 'graph', to: 'pg', bend: -20 },
    { id: 'pg-g', from: 'pg', to: 'graph', bend: -20 },
    { id: 'b-g', from: 'w2', to: 'graph' },
  ],
  code: `graph = builder.compile(checkpointer=PostgresSaver.from_conn_string(DB_URL))
cfg = {"configurable": {"thread_id": "nightly-0412"}}

def run_or_resume():
    snapshot = graph.get_state(cfg)
    if snapshot.next:                       # unfinished run exists
        return graph.invoke(None, cfg)      # None = resume from last checkpoint
    return graph.invoke({"topic": "EV batteries"}, cfg)`,
  steps: [
    {
      title: 'Pod A starts the run',
      edge: 'a-g',
      packet: 'invoke(topic)',
      narration: 'Every graph run is keyed by thread_id and checkpointed to Postgres after each super-step.',
      state: { completed: [], next: 'fetch', 'paid LLM calls': '0' },
      log: 'pod A: new run nightly-0412',
      hl: ['return graph.invoke({"topic"'],
    },
    {
      title: 'fetch + analyse checkpointed',
      edge: 'g-pg',
      packet: 'checkpoint #2',
      node: 'pg',
      narration: 'fetch and the expensive analyse step finish; both results are saved.',
      state: { completed: ['fetch', 'analyse ($3.40)'], next: 'write', 'paid LLM calls': '14' },
      changed: ['completed', 'next', 'paid LLM calls'],
      log: 'checkpoint after analyse',
      hl: ['compile(checkpointer=PostgresSaver'],
    },
    {
      title: 'Pod A is killed during write',
      node: 'w1',
      tone: 'bad',
      narration: 'An autoscaler evicts the pod mid-step. The write step\'s partial work is lost; nothing after the last checkpoint was saved.',
      log: '✗ pod A SIGKILL during write',
      predict: {
        question: 'Pod B picks up the job. Where does the run continue?',
        options: ['From the beginning (fetch)', 'From analyse', 'From write — the first unfinished step', 'It cannot resume'],
        answer: 2,
        explain: 'The last checkpoint says next = write. Completed steps are not re-run, so the $3.40 analysis is not paid twice.',
      },
    },
    {
      title: 'Pod B checks for an unfinished run',
      edge: 'b-g',
      packet: 'get_state()',
      narration: 'snapshot.next is ["write"], so pod B resumes instead of starting over.',
      log: 'pod B: get_state → next=write',
      hl: ['snapshot = graph.get_state(cfg)', 'if snapshot.next'],
    },
    {
      title: 'Load the checkpoint',
      edge: 'pg-g',
      packet: 'checkpoint #2',
      node: 'graph',
      narration: 'invoke(None, cfg) means “no new input, continue from the saved state”.',
      log: 'invoke(None) → resume at write',
      hl: ['return graph.invoke(None, cfg)'],
    },
    {
      title: 'Finish write + publish',
      edge: 'g-pg',
      packet: 'checkpoint #4',
      node: 'pg',
      tone: 'ok',
      narration: 'Only the unfinished steps run. Make each node idempotent, because a step that crashed half-way will run again.',
      state: { completed: ['fetch', 'analyse ($3.40)', 'write', 'publish'], next: '—', 'paid LLM calls': '17' },
      changed: ['completed', 'next', 'paid LLM calls'],
      log: 'run complete (analyse not repeated)',
    },
  ],
  match: /durable|fault tolerance|failover|recovery|crash|disaster|reliability/i,
  takeaways: ['Checkpoint after every step with a persistent saver.', 'Resume with invoke(None, cfg) on the same thread.', 'Nodes must be idempotent — the interrupted one re-runs.'],
}

export const PATTERN_SIMS: AgentSim[] = [PLAN_EXECUTE, REFLECTION, HANDOFF, HIERARCHY, MAP_REDUCE, VOTING, A2A, MCP, SAGA, DURABLE]
