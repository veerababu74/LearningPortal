/**
 * Curated Mermaid diagrams for the VeeraAgents track.
 * Each diagram is pinned to the section it explains (`where.source` + `where.section`).
 * Validated by scripts/validate-diagrams.mjs.
 */
export const AGENT_DIAGRAMS = [
  /* ------------------------------------------------------------- 01 foundations */
  {
    id: 'agent-anatomy',
    where: { source: /^01_agent_foundations/, topic: /What is an AI Agent/i, section: /concept explanation/i, fallbackFirst: true },
    title: 'Anatomy of an agent: model + tools + memory + loop',
    mermaid: `
flowchart LR
  U(["User goal"]) --> L
  subgraph A["Agent"]
    L["LLM brain - decides next step"]
    M[("Memory - history, facts")]
    P["Planner - break goal into steps"]
    L <--> M
    L <--> P
  end
  L -- "tool call" --> T["Tools - APIs, DB, search, code"]
  T -- "observation" --> L
  L -- "final answer" --> R(["Response"])`,
    explain: `A chatbot is only the **LLM box**: text in, text out. An **agent** wraps the LLM in a loop and gives it **tools** (to act on the world), **memory** (to remember across steps and turns) and optionally a **planner**. The arrows between LLM and tools repeat until the LLM decides it has enough information to answer — that repetition is what makes it an agent.`,
  },
  {
    id: 'agent-vs-chatbot-vs-workflow',
    where: { source: /^01_agent_foundations/, topic: /Agent vs Chatbot/i, section: /concept explanation/i, fallbackFirst: true },
    title: 'Chatbot vs workflow vs agent — who decides the next step?',
    mermaid: `
flowchart TB
  subgraph C["Chatbot"]
    c1["Prompt"] --> c2["LLM"] --> c3["Answer"]
  end
  subgraph W["Workflow - code decides"]
    w1["Step 1 fixed"] --> w2["Step 2 fixed"] --> w3["Step 3 fixed"]
  end
  subgraph G["Agent - LLM decides"]
    g1["LLM chooses action"] --> g2{"Done?"}
    g2 -- "no" --> g3["Run tool"] --> g1
    g2 -- "yes" --> g4["Answer"]
  end`,
    explain: `The difference is **who controls the path**. A chatbot has one hop. A workflow has many hops but the **developer** hard-codes their order. An agent lets the **model** pick the next action at run time, so the number and order of steps is not known in advance. Use a workflow when the steps are predictable — it is cheaper and easier to test.`,
  },
  {
    id: 'react-loop',
    where: { source: /^01_agent_foundations/, topic: /ReAct/i, section: /concept explanation/i, fallbackFirst: true },
    title: 'ReAct: Thought → Action → Observation, repeated',
    mermaid: `
sequenceDiagram
  participant U as User
  participant LLM as LLM
  participant T as Tool
  U->>LLM: What is the weather in Paris in Fahrenheit?
  Note over LLM: Thought - I need the current weather
  LLM->>T: Action get_weather(city=Paris)
  T-->>LLM: Observation 18 C, cloudy
  Note over LLM: Thought - convert 18 C to F
  LLM->>T: Action calculator(18*9/5+32)
  T-->>LLM: Observation 64.4
  Note over LLM: Thought - I can answer now
  LLM-->>U: Final answer - 64.4 F and cloudy`,
    explain: `ReAct interleaves **reasoning** (Thought) with **acting** (Action) and feeds each tool result back as an **Observation**. Every observation is appended to the prompt, so the next thought is grounded in real data instead of guesses. The loop ends when the model emits a final answer — or when your **max-iterations** guard stops it.`,
  },
  {
    id: 'agent-loop-observe-think-act',
    where: { source: /^01_agent_foundations/, topic: /Agent Loops/i, section: /concept explanation/i, fallbackFirst: true },
    title: 'Production agent loop with guards',
    mermaid: `
flowchart TD
  S(["Start - user message"]) --> B["Build context - system + history + tool schemas"]
  B --> C["Call LLM"]
  C --> D{"Response has tool calls?"}
  D -- "no" --> F(["Return final answer"])
  D -- "yes" --> G{"Guards OK? - steps < max, budget left, tool allowed"}
  G -- "no" --> H(["Stop safely - partial answer + reason"])
  G -- "yes" --> E["Execute tools - timeout + retry"]
  E --> O["Append tool results as observations"]
  O --> B`,
    explain: `This is the whole engine behind every framework. The only exit for a healthy run is **no more tool calls**. The **guard box** is what separates a demo from production: a step limit stops infinite loops, a token/cost budget stops runaway spend, and an allow-list stops the model calling tools it should not. Tool execution always gets a timeout and a retry policy.`,
  },
  {
    id: 'memory-types',
    where: { source: /^01_agent_foundations/, topic: /Agent Memory Types/i, section: /concept explanation/i, fallbackFirst: true },
    title: 'Agent memory types',
    mermaid: `
flowchart LR
  Q["New user message"] --> STM["Short-term - messages in this thread"]
  Q --> R{"Need older knowledge?"}
  R -- "facts about user" --> SEM[("Semantic - profile, preferences")]
  R -- "what happened before" --> EPI[("Episodic - past sessions, outcomes")]
  R -- "how to do it" --> PRO[("Procedural - instructions, skills")]
  STM --> CTX["Context window"]
  SEM --> CTX
  EPI --> CTX
  PRO --> CTX
  CTX --> LLM["LLM"]`,
    explain: `**Short-term memory** is just the message list for the current thread — it lives in the context window and is lost when the thread ends. **Long-term memory** is stored outside the model and *retrieved* into the context when relevant: semantic (facts), episodic (past experiences) and procedural (how-to instructions). Everything the model "remembers" must end up in the context window.`,
  },

  /* ------------------------------------------------------------- 02 tool calling */
  {
    id: 'tool-calling-roundtrip',
    where: { source: /^0_tool_calling\.ipynb/, section: /how tool calling works/i },
    title: 'Tool calling round trip — the model never runs your code',
    mermaid: `
sequenceDiagram
  participant App as Your code
  participant LLM as LLM API
  participant Fn as get_weather()
  App->>LLM: messages + tool schemas (name, description, JSON params)
  LLM-->>App: assistant message with tool_calls [get_weather, city=Paris]
  App->>Fn: parse JSON args and call the real function
  Fn-->>App: 18 C cloudy
  App->>LLM: messages + tool message (tool_call_id, result)
  LLM-->>App: final text answer`,
    explain: `The model only **proposes** a call as structured JSON — your code decides whether to run it, runs it, and sends the result back as a **tool message** linked by \`tool_call_id\`. That is why tool calling is safe to sandbox: validation, auth checks and timeouts all live in *your* code between steps 2 and 4.`,
  },
  {
    id: 'tool-schema-selection',
    where: { source: /^02_tool_use_function_calling/, section: /CONCEPT 1/i },
    title: 'How the model picks a tool from its schema',
    mermaid: `
flowchart LR
  Q["User - refund order 123"] --> LLM["LLM reads tool names + descriptions"]
  LLM --> S1["search_docs - Search the help center"]
  LLM --> S2["get_order - Look up an order by id"]
  LLM --> S3["issue_refund - Refund an order. Requires order_id"]
  S3 -. "best match" .-> J["tool_call issue_refund order_id=123"]
  J --> V{"Args valid against JSON schema?"}
  V -- "yes" --> X["Execute"]
  V -- "no" --> E["Return validation error to the model"]`,
    explain: `Tool selection is just **reading comprehension**: the model matches the request against each tool's *name* and *description*. Vague descriptions cause wrong-tool bugs. Arguments are validated against the JSON schema before execution, and a validation error is sent back to the model so it can correct itself instead of crashing the run.`,
  },
  {
    id: 'mcp-architecture',
    where: { source: /^11-advanced-patterns/, section: /MCP/i },
    title: 'MCP: one protocol between agents and tool servers',
    mermaid: `
flowchart LR
  subgraph Host["Host app - IDE, chat app, agent"]
    C1["MCP client"]
    C2["MCP client"]
  end
  C1 <-- "JSON-RPC over stdio" --> S1["MCP server - files"]
  C2 <-- "JSON-RPC over HTTP" --> S2["MCP server - GitHub"]
  S1 --> R1[("Local disk")]
  S2 --> R2[("GitHub API")]
  Host --> LLM["LLM sees tools listed by servers"]`,
    explain: `**MCP (Model Context Protocol)** standardises how an agent discovers and calls tools. Each server exposes *tools*, *resources* and *prompts*; the host keeps one client per server and lists the server's tools to the model. Write a tool once as an MCP server and every MCP-aware agent can use it.`,
  },

  /* ------------------------------------------------------------- 03 from scratch */
  {
    id: 'scratch-building-blocks',
    where: { source: /^05-building-agents-without-frameworks/, section: /building blocks/i },
    title: 'An agent from scratch: the five building blocks',
    mermaid: `
flowchart TB
  A["1. LLM client - call the API"] --> B["2. Tool registry - name to function + schema"]
  B --> C["3. Message history - list of dicts"]
  C --> D["4. Loop - call, check tool_calls, execute, append"]
  D --> E["5. Stop conditions - final answer, max steps, errors"]
  E -. "repeat until done" .-> D`,
    explain: `Every framework is a nicer wrapper around these five pieces. If you can write them in ~80 lines of plain Python you understand what LangChain, LangGraph and ADK are doing for you — and you can debug them when they misbehave.`,
  },
  {
    id: 'loop-topologies',
    where: { source: /^09-context-engineering/, section: /Agent Loop Topologies/i },
    title: 'Agent loop topologies',
    mermaid: `
flowchart LR
  subgraph R["ReAct - single loop"]
    r1["think"] --> r2["act"] --> r3["observe"] --> r1
  end
  subgraph PE["Plan and execute"]
    p1["plan all steps"] --> p2["execute step"] --> p3{"more steps?"}
    p3 -- "yes" --> p2
    p3 -- "replan" --> p1
  end
  subgraph RF["Reflection"]
    f1["draft"] --> f2["critique"] --> f3{"good enough?"}
    f3 -- "no" --> f1
  end`,
    explain: `Pick the loop shape by the task: **ReAct** for short, tool-heavy questions; **plan-and-execute** for long tasks where a plan keeps the agent on track (and you can replan when a step fails); **reflection** when quality matters more than latency, because a critic pass catches mistakes before the user sees them.`,
  },

  /* ------------------------------------------------------------- 04 langchain */
  {
    id: 'lcel-pipeline',
    where: { source: /^02-langchain-deep-dive/, section: /LCEL/i },
    title: 'LCEL: prompt | model | parser',
    mermaid: `
flowchart LR
  I["input dict - topic"] --> P["ChatPromptTemplate - fills variables"]
  P -- "list of messages" --> M["ChatModel - invoke API"]
  M -- "AIMessage" --> O["StrOutputParser or PydanticOutputParser"]
  O --> R["str or typed object"]`,
    explain: `In LCEL every piece is a **Runnable** with the same interface (\`invoke\`, \`batch\`, \`stream\`, \`ainvoke\`). The \`|\` operator pipes the output of one into the next, so \`chain = prompt | model | parser\` automatically gets streaming, batching and async for free.`,
  },

  /* ------------------------------------------------------------- 05 langgraph */
  {
    id: 'langgraph-mental-model',
    where: { source: /^03-langgraph-deep-dive/, section: /Core Concepts/i },
    title: 'LangGraph: nodes update shared state, edges choose the next node',
    mermaid: `
flowchart TD
  ST(["START"]) --> A["agent node - call LLM"]
  A --> D{"tools_condition - did the LLM ask for a tool?"}
  D -- "yes" --> T["tools node - ToolNode runs calls"]
  T --> A
  D -- "no" --> E(["END"])
  S[("State - messages list with add_messages reducer")] -.-> A
  S -.-> T`,
    explain: `A LangGraph app is a **state machine**. Each node receives the current **state**, returns a *partial update*, and the **reducer** for each key merges that update (for \`messages\`, \`add_messages\` appends instead of overwriting). **Conditional edges** read the state to pick the next node — here: loop back through tools until the model stops asking for them.`,
  },
  {
    id: 'reducer-merge',
    where: { source: /^0_a_langgraph_reducsers\.ipynb/, section: /How LangGraph Calls a Reducer/i },
    title: 'What a reducer does with a node update',
    mermaid: `
flowchart LR
  O["old state - messages [m1, m2]"] --> R{"reducer for messages"}
  U["node returns - messages [m3]"] --> R
  R -- "no reducer - overwrite" --> X["[m3] - history lost"]
  R -- "add_messages - append or replace by id" --> Y["[m1, m2, m3]"]`,
    explain: `Without a reducer LangGraph **overwrites** the key with whatever the node returned — the classic "my chat history disappeared" bug. With \`Annotated[list, add_messages]\` (or \`operator.add\`) the update is **merged**. Reducers also make parallel branches safe: two nodes writing the same key in one step are combined, not raced.`,
  },
  {
    id: 'conditional-fan-out',
    where: { source: /^langgraph_advanced\.ipynb/, section: /What is Fan-Out/i },
    title: 'Fan-out / fan-in: parallel branches in one super-step',
    mermaid: `
flowchart LR
  S(["START"]) --> A["split"]
  A --> B1["summarise"]
  A --> B2["translate"]
  A --> B3["extract keywords"]
  B1 --> J["join - reducer merges results"]
  B2 --> J
  B3 --> J
  J --> E(["END"])`,
    explain: `When a node has several outgoing edges, LangGraph runs the targets **in the same super-step (in parallel)**. The join node waits until all branches finish. Because the branches write to the same state key, that key **needs a reducer** like \`operator.add\`, otherwise LangGraph raises an *InvalidUpdateError*.`,
  },

  /* ------------------------------------------------------------- 06 memory, HITL */
  {
    id: 'checkpointer-threads',
    where: { source: /^7_checkpointers_complete\.ipynb/, section: /Build the correct vocabulary/i, fallbackFirst: true },
    title: 'Checkpointers: a saved snapshot after every super-step',
    mermaid: `
flowchart LR
  I["invoke - thread_id=user-42"] --> N1["node A"] --> C1[("checkpoint 1")]
  C1 --> N2["node B"] --> C2[("checkpoint 2")]
  C2 --> N3["node C"] --> C3[("checkpoint 3 - latest")]
  C3 -. "next invoke, same thread_id" .-> R["resume with full history"]
  C1 -. "time travel - checkpoint_id" .-> F["fork from an old state"]`,
    explain: `Compile a graph with a **checkpointer** (MemorySaver, SqliteSaver, PostgresSaver…) and every super-step writes a snapshot keyed by \`thread_id\`. Invoking again with the same thread continues the conversation; a different thread starts fresh. Old checkpoints enable **time travel** — replay or fork from any earlier state — and they are what makes human-in-the-loop interrupts possible.`,
  },
  {
    id: 'hitl-interrupt',
    where: { source: /^human_in_loop\.ipynb/, section: /What is Human-in-the-Loop/i },
    title: 'Human-in-the-loop: interrupt, persist, resume',
    mermaid: `
sequenceDiagram
  participant U as User / reviewer
  participant API as Your API
  participant G as Graph
  participant CP as Checkpointer
  U->>API: Refund order 123
  API->>G: invoke(thread_id=t1)
  G->>G: agent decides issue_refund
  G->>CP: save state, interrupt before tool
  G-->>API: __interrupt__ - approval needed
  API-->>U: Approve refund of 120 USD?
  U->>API: approve
  API->>G: invoke(Command(resume=approved), thread_id=t1)
  G->>CP: load state
  G->>G: run issue_refund, continue
  G-->>API: final answer`,
    explain: `\`interrupt()\` pauses the graph **and saves its state** with the checkpointer, so the process can even restart while waiting for a human. Resuming with \`Command(resume=...)\` on the **same thread_id** reloads the state and continues exactly where it stopped. No checkpointer → no interrupts.`,
  },

  /* ------------------------------------------------------------- 07 Google ADK */
  {
    id: 'adk-stack',
    where: { source: /^day_01_adk_foundations/, section: /ADK Architecture Stack/i },
    title: 'Google ADK architecture stack',
    mermaid: `
flowchart TB
  UI["adk web / adk run / your FastAPI app"] --> RN["Runner - drives one invocation"]
  RN --> AG["Agent tree - LlmAgent, SequentialAgent, ParallelAgent, LoopAgent"]
  AG --> TL["Tools - FunctionTool, AgentTool, MCPToolset, google_search"]
  AG --> MD["Model - Gemini or LiteLLM (OpenAI, Anthropic)"]
  RN --> SS[("SessionService - events + state")]
  RN --> MS[("MemoryService - long-term recall")]
  RN --> AS[("ArtifactService - files, blobs")]`,
    explain: `In ADK you **declare** agents; the **Runner** executes them. For each user message the Runner loads the session from the **SessionService**, runs the agent tree, and records every step as an **Event**. Memory and artifacts are separate services, so you can swap in-memory implementations for databases or Vertex AI without touching agent code.`,
  },
  {
    id: 'adk-event-flow',
    where: { source: /^day_03_runner_sessions_events/, section: /Session Lifecycle/i, fallbackFirst: true },
    title: 'ADK invocation: one message becomes a stream of Events',
    mermaid: `
sequenceDiagram
  participant App as Your code
  participant R as Runner
  participant S as SessionService
  participant A as LlmAgent
  participant T as Tool
  App->>R: run_async(user_id, session_id, new_message)
  R->>S: get_session, append user Event
  R->>A: run with InvocationContext
  A-->>R: Event - function_call get_weather
  R->>T: execute tool
  T-->>R: Event - function_response
  A-->>R: Event - final text, state_delta
  R->>S: append_event (commits state_delta)
  R-->>App: async stream of Events, last one is_final_response()`,
    explain: `\`runner.run_async()\` yields **Events** as they happen: tool calls, tool responses, partial text and the final response. State changes travel inside \`event.actions.state_delta\` and are **committed only when the Runner appends the event** to the session — so always change state through context/EventActions, never by mutating a session object you fetched.`,
  },
  {
    id: 'adk-state-scopes',
    where: { source: /^day_07_session_state/, section: /State scope hierarchy/i, fallbackFirst: true },
    title: 'ADK session state prefixes and scopes',
    mermaid: `
flowchart TB
  APP[("app: prefix - shared by all users")] --> USER[("user: prefix - one user, all sessions")]
  USER --> SES[("no prefix - this session only")]
  SES --> TMP[("temp: prefix - this invocation only, never saved")]`,
    explain: `The **key prefix decides the lifetime**: \`app:\` keys are global, \`user:\` keys follow a user across sessions, unprefixed keys belong to one session, and \`temp:\` keys vanish after the current invocation. Use \`temp:\` for scratch values passed between agents in one turn.`,
  },
  {
    id: 'adk-workflow-agents',
    where: { source: /^day_11_workflow_agents/, section: /Three Workflow Patterns/i, fallbackFirst: true },
    title: 'ADK workflow agents: Sequential, Parallel, Loop',
    mermaid: `
flowchart LR
  subgraph SQ["SequentialAgent"]
    s1["researcher"] --> s2["writer"] --> s3["editor"]
  end
  subgraph PA["ParallelAgent"]
    p0["fan out"] --> p1["flights"]
    p0 --> p2["hotels"]
    p0 --> p3["weather"]
  end
  subgraph LP["LoopAgent"]
    l1["draft"] --> l2["critic"] --> l3{"escalate or max_iterations?"}
    l3 -- "no" --> l1
  end`,
    explain: `Workflow agents are **deterministic orchestrators** — no LLM decides the order. *Sequential* passes results through shared state (\`output_key\`), *Parallel* runs sub-agents concurrently in isolated branches, and *Loop* repeats until a sub-agent escalates or \`max_iterations\` is hit. Combine them with LlmAgents to get predictable pipelines with smart steps.`,
  },
  {
    id: 'adk-callbacks',
    where: { source: /^day_13_callbacks/, section: /Pipeline \+ Callback/i, fallbackFirst: true },
    title: 'Where ADK callbacks fire',
    mermaid: `
flowchart LR
  BA["before_agent"] --> BM["before_model"] --> M["Model call"] --> AM["after_model"]
  AM --> BT["before_tool"] --> T["Tool run"] --> AT["after_tool"]
  AT --> BM
  AM --> AA["after_agent"]`,
    explain: `Callbacks are hooks around the three expensive things an agent does: run an **agent**, call the **model**, run a **tool**. Returning a value from a *before_* callback **skips** the real call (use it for guardrails, caching or mocking); *after_* callbacks can inspect or rewrite the result (redaction, logging, metrics).`,
  },

  /* ------------------------------------------------------------- 08 multi-agent */
  {
    id: 'supervisor-pattern',
    where: { source: /^03_multi_agent_systems/, section: /Supervisor Agent Pattern/i },
    title: 'Supervisor pattern: one router, many specialists',
    mermaid: `
flowchart TD
  U(["User request"]) --> SUP{"Supervisor LLM - who should act next?"}
  SUP -- "research" --> R["Research agent - web search"]
  SUP -- "code" --> C["Coder agent - sandbox"]
  SUP -- "data" --> D["Analyst agent - SQL"]
  R --> SUP
  C --> SUP
  D --> SUP
  SUP -- "FINISH" --> F(["Final answer"])`,
    explain: `The supervisor never does the work — it **routes**. Each specialist has a small prompt and only the tools it needs, which improves accuracy and limits blast radius. Results come back to the supervisor, which decides the next specialist or \`FINISH\`. Add a max-handoff counter so two agents cannot bounce work back and forth forever.`,
  },
  {
    id: 'plan-and-execute',
    where: { source: /^12_agentic_design_patterns/, section: /Plan-and-Execute/i },
    title: 'Plan-and-execute with replanning',
    mermaid: `
flowchart LR
  G(["Goal"]) --> P["Planner LLM - ordered step list"]
  P --> E["Executor - run step i with tools"]
  E --> C{"Step OK?"}
  C -- "yes, more steps" --> E
  C -- "failed or new info" --> RP["Replanner - update remaining steps"]
  RP --> E
  C -- "all done" --> S["Synthesize answer"]`,
    explain: `A strong (expensive) model writes the **plan** once; a cheaper model or plain code **executes** each step. When a step fails or reveals something new, the **replanner** edits only the remaining steps. This keeps long tasks on track and is cheaper than asking the big model to reason at every step.`,
  },
  {
    id: 'reflexion',
    where: { source: /^12_agentic_design_patterns/, section: /Reflexion/i },
    title: 'Reflexion: generate, critique, retry',
    mermaid: `
flowchart LR
  T(["Task"]) --> G["Generator - draft answer"]
  G --> C["Critic - score + specific feedback"]
  C --> D{"score >= threshold or attempts = max?"}
  D -- "no" --> G
  D -- "yes" --> O(["Best answer"])`,
    explain: `The critic's **specific feedback** is added to the generator's next prompt, so each attempt fixes concrete problems. Always cap attempts and keep the best-scoring draft — critics can be wrong, and an unbounded loop burns tokens.`,
  },

  /* ------------------------------------------------------------- 09 production */
  {
    id: 'guardrail-layers',
    where: { source: /^08-guardrails-safety/, section: /Types of Guardrails/i },
    title: 'Guardrails wrap every hop of the agent',
    mermaid: `
flowchart LR
  IN(["User input"]) --> IG["Input guard - injection, PII, topic"]
  IG --> LLM["LLM"]
  LLM --> TG["Tool guard - allow-list, args, permissions, human approval"]
  TG --> TOOL["Tool"]
  TOOL --> LLM
  LLM --> OG["Output guard - schema, toxicity, leaks, grounding"]
  OG --> OUT(["Response"])
  LG["Loop guard - max steps, budget, repeat detection"] -.-> LLM`,
    explain: `Guardrails are not one filter — they sit at **every boundary**: before the model (input), before side effects (tool), before the user (output), and around the loop itself. The tool guard matters most: it is the only thing between a prompt-injected model and a real action like sending money or deleting data.`,
  },
  {
    id: 'infinite-loop-detection',
    where: { source: /^08-guardrails-safety/, section: /Handling Infinite Loops/i },
    title: 'Detecting and stopping infinite agent loops',
    mermaid: `
flowchart TD
  S["Next step proposed"] --> A{"step_count >= max_steps?"}
  A -- "yes" --> X(["Stop - return best partial answer"])
  A -- "no" --> B{"same tool + same args seen N times?"}
  B -- "yes" --> Y["Inject hint - you already tried this, change approach"]
  B -- "no" --> C{"tokens or cost over budget?"}
  C -- "yes" --> X
  C -- "no" --> R["Run step"]
  Y --> R`,
    explain: `Loops come from the model repeating a failing call or two agents handing work back and forth. Defend in layers: a **hard step cap**, **repeat detection** on (tool, args) hashes with a corrective hint, and a **token/cost budget**. When you stop, return what you have and *why* — never fail silently.`,
  },
]
