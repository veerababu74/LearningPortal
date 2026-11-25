/**
 * Curated Mermaid diagrams for the Async & Concurrency track.
 * Each diagram is pinned to the section it explains (`where.source` + `where.section`).
 * Validated by scripts/validate-diagrams.mjs.
 */
const C = (n) => new RegExp(`concurrent/${n}_`)
const FASTAPI = /sources\/fastapi-async-interview-guide/

export const ASYNC_DIAGRAMS = [
  /* ---------------------------------------------------------- 01 fundamentals */
  {
    id: 'conc-vs-par',
    where: { source: C('01'), section: /concurrency vs parallelism/i },
    title: 'Concurrency (interleaving) vs parallelism (simultaneous)',
    mermaid: `
flowchart LR
  subgraph C1["Concurrency — 1 CPU core"]
    direction LR
    a1["Task A step 1"] --> b1["Task B step 1"] --> a2["Task A step 2"] --> b2["Task B step 2"]
  end
  subgraph P2["Parallelism — 2 CPU cores"]
    direction LR
    pa1["Core 1: Task A step 1"] --> pa2["Core 1: Task A step 2"]
    pb1["Core 2: Task B step 1"] --> pb2["Core 2: Task B step 2"]
  end`,
    explain: `**Concurrency** is about *dealing with* many things at once: one core switches between tasks, so both make progress but only one runs at any instant. **Parallelism** is about *doing* many things at once: separate cores execute tasks at the same moment. Threads and asyncio give you concurrency in CPython; only multiple processes (or GIL-free C code) give you CPU parallelism.`,
  },
  {
    id: 'blocking-vs-nonblocking',
    where: { source: C('01'), section: /blocking vs non-blocking/i },
    title: 'Blocking vs non-blocking I/O',
    mermaid: `
sequenceDiagram
  participant App as Your code
  participant OS as OS / network
  Note over App,OS: Blocking call
  App->>OS: recv() on socket
  Note over App: thread is parked, does nothing
  OS-->>App: data arrives after 200 ms
  Note over App,OS: Non-blocking call
  App->>OS: register socket for read readiness
  App->>App: run other tasks meanwhile
  OS-->>App: socket is ready
  App->>OS: recv() returns immediately with data`,
    explain: `A **blocking** call parks the calling thread until the operation completes, so that thread can do nothing else for the whole wait. A **non-blocking** call only *registers interest* and returns at once; the OS later reports readiness and the program reads the data without waiting. asyncio is built on the non-blocking style: the event loop waits for many sockets at once with \`select/epoll/kqueue\`.`,
  },
  {
    id: 'io-vs-cpu',
    where: { source: C('01'), section: /i\/o-bound vs cpu-bound/i },
    title: 'Where the time goes: I/O-bound vs CPU-bound',
    mermaid: `
flowchart TB
  subgraph IO["I/O-bound request — mostly waiting"]
    direction LR
    i1["CPU 2 ms"] --> i2["wait for DB 80 ms"] --> i3["CPU 1 ms"] --> i4["wait for API 120 ms"] --> i5["CPU 2 ms"]
  end
  subgraph CPU["CPU-bound job — mostly computing"]
    direction LR
    c1["parse 300 ms"] --> c2["transform 900 ms"] --> c3["compress 400 ms"]
  end
  IO --> fix1["Overlap the waits: threads or asyncio"]
  CPU --> fix2["Add cores: multiprocessing / ProcessPoolExecutor"]`,
    explain: `Profile first: if most of the wall-clock time is spent **waiting** (network, disk, database), the work is I/O-bound and you speed it up by overlapping the waits. If most of the time is spent **computing**, it is CPU-bound and only more cores help — which in CPython means more processes, because the GIL lets just one thread execute Python bytecode at a time.`,
  },
  {
    id: 'gil-handoff',
    where: { source: C('01'), section: /\bgil\b|global interpreter lock/i },
    title: 'How the GIL is handed between threads',
    mermaid: `
sequenceDiagram
  participant T1 as Thread 1
  participant G as GIL
  participant T2 as Thread 2
  T1->>G: acquire
  Note over T1: runs Python bytecode
  T2->>G: wants the GIL, sets drop request
  Note over T1,T2: after switch interval of about 5 ms
  T1->>G: release at a safe point
  G->>T2: T2 acquires
  Note over T2: runs Python bytecode
  T2->>G: release before blocking I/O
  G->>T1: T1 acquires while T2 waits on the socket`,
    explain: `The GIL is a mutex inside CPython: a thread must hold it to execute bytecode. A waiting thread asks for it, and the running thread drops it after the **switch interval** (\`sys.getswitchinterval()\`, 5 ms by default) or immediately when it starts **blocking I/O**. That is why threads overlap I/O well but CPU-bound threads take turns instead of running in parallel.`,
  },
  {
    id: 'which-model',
    where: { source: C('01'), section: /when to use threads|processes, or async/i },
    title: 'Picking threads, processes or asyncio',
    mermaid: `
flowchart TD
  start(["What dominates the work?"]) --> q1{"Mostly waiting on I/O?"}
  q1 -->|yes| q2{"Async libraries available and many connections?"}
  q2 -->|yes| asyncio["asyncio — thousands of sockets on one thread"]
  q2 -->|no| threads["Threads — ThreadPoolExecutor around blocking libraries"]
  q1 -->|no| q3{"Pure Python CPU work?"}
  q3 -->|yes| procs["Processes — ProcessPoolExecutor, one per core"]
  q3 -->|"no, C code releases the GIL"| threads2["Threads are fine — numpy, hashing, compression"]
  asyncio --> mix["Mixed workload: asyncio plus run_in_executor for the blocking or CPU parts"]
  threads --> mix
  procs --> mix`,
    explain: `Answer two questions: *is the work waiting or computing?* and *are the libraries async-capable?* Waiting + async libraries → asyncio; waiting + blocking libraries → threads; pure-Python computing → processes. Real services are usually mixed, so the common production shape is an asyncio core that pushes blocking or CPU-heavy calls to an executor.`,
  },

  /* ------------------------------------------------------------ 02 threading */
  {
    id: 'thread-lifecycle',
    where: { source: C('02'), section: /creating and starting threads/i },
    title: 'Thread lifecycle',
    mermaid: `
flowchart LR
  new["New — Thread object created"] -->|"start()"| ready["Runnable — waiting for the GIL / CPU"]
  ready -->|scheduled| running["Running — executing target()"]
  running -->|"sleep, lock, I/O, join"| blocked["Blocked / waiting"]
  blocked -->|"woken up"| ready
  running -->|"switch interval"| ready
  running -->|"target returns or raises"| dead["Terminated — is_alive() is False"]
  dead -.->|"join() returns"| main["Main thread continues"]`,
    explain: `Creating a \`Thread\` does nothing until \`start()\`; then the thread alternates between **runnable**, **running** and **blocked** until its \`target\` returns or raises. A thread can only be started once, and an exception inside it does not propagate to the main thread — it is printed (or sent to \`threading.excepthook\`) and the thread simply ends.`,
  },
  {
    id: 'daemon-threads',
    where: { source: C('02'), section: /daemon/i },
    title: 'What happens to threads when the main thread finishes',
    mermaid: `
flowchart TD
  m["Main thread reaches the end of the script"] --> q{"Any non-daemon threads alive?"}
  q -->|yes| wait["Interpreter waits — implicit join on every non-daemon thread"]
  wait --> q
  q -->|no| exit["Interpreter shutdown begins"]
  exit --> kill["Daemon threads are stopped abruptly — no finally blocks, no flushes"]`,
    explain: `Python exits only when every **non-daemon** thread has finished. **Daemon** threads (\`daemon=True\`) are killed abruptly at shutdown, so they suit background helpers like heartbeats or cache warmers — never work that must finish cleanly, such as writing files or committing transactions.`,
  },
  {
    id: 'join-timeout',
    where: { source: C('02'), section: /join and timeout/i },
    title: 'join() with a timeout',
    mermaid: `
sequenceDiagram
  participant M as Main thread
  participant W as Worker thread
  M->>W: start()
  M->>W: join(timeout=2)
  Note over M: blocks at most 2 seconds
  alt worker finished in time
    W-->>M: join returns, is_alive() is False
  else still running
    M->>M: join returns anyway, is_alive() is True
    M->>M: decide: wait again, signal stop with an Event, or log
  end`,
    explain: `\`join(timeout)\` always returns \`None\`, so after it returns you must call \`is_alive()\` to know whether the thread actually finished. Threads cannot be killed from outside; the clean way to stop one is to give it a \`threading.Event\` it checks periodically.`,
  },
  {
    id: 'thread-local',
    where: { source: C('02'), section: /thread local/i },
    title: 'threading.local(): one object, separate values per thread',
    mermaid: `
flowchart LR
  tl["ctx = threading.local()"] --> t1["Thread 1: ctx.user = 'alice'"]
  tl --> t2["Thread 2: ctx.user = 'bob'"]
  t1 --> r1["Thread 1 reads ctx.user → 'alice'"]
  t2 --> r2["Thread 2 reads ctx.user → 'bob'"]`,
    explain: `Attributes set on a \`threading.local()\` object are stored per thread, so the same global name holds different values in each thread. It is the classic way to keep per-request state such as a DB connection or request id. In asyncio code use \`contextvars.ContextVar\` instead, because many tasks share one thread.`,
  },

  /* ------------------------------------------------------ 03 synchronization */
  {
    id: 'race-condition',
    where: { source: C('03'), section: /race conditions/i },
    title: 'A lost update: counter += 1 from two threads',
    mermaid: `
sequenceDiagram
  participant T1 as Thread 1
  participant C as counter (shared)
  participant T2 as Thread 2
  T1->>C: read counter → 0
  T2->>C: read counter → 0
  T1->>T1: compute 0 + 1
  T2->>T2: compute 0 + 1
  T1->>C: write 1
  T2->>C: write 1
  Note over C: two increments, value is 1 — one update was lost`,
    explain: `\`counter += 1\` is several bytecodes: load, add, store. If a thread switch happens between the load and the store, both threads read the same old value and one increment disappears. The GIL does not prevent this — it protects the interpreter's internals, not your read-modify-write sequences.`,
  },
  {
    id: 'lock-mutex',
    where: { source: C('03'), section: /^3\.2|lock \(mutex\)/i },
    title: 'Lock: one thread in the critical section at a time',
    mermaid: `
sequenceDiagram
  participant T1 as Thread 1
  participant L as Lock
  participant T2 as Thread 2
  T1->>L: acquire()
  L-->>T1: granted
  T2->>L: acquire()
  Note over T2: blocked
  T1->>T1: read, modify, write counter
  T1->>L: release()
  L-->>T2: granted
  T2->>T2: read, modify, write counter
  T2->>L: release()`,
    explain: `A \`Lock\` turns the read-modify-write into an atomic unit: whoever holds it runs the critical section while others wait. Always use \`with lock:\` so the lock is released even if the body raises, and keep the locked region as small as possible.`,
  },
  {
    id: 'rlock',
    where: { source: C('03'), section: /rlock|reentrant/i },
    title: 'Lock vs RLock when the same thread acquires twice',
    mermaid: `
flowchart TD
  a["Thread calls transfer(), which takes the lock"] --> b["transfer() calls withdraw(), which takes the same lock"]
  b --> q{"Lock type?"}
  q -->|Lock| dead["Deadlock — the thread waits for itself forever"]
  q -->|RLock| ok["Owner thread re-enters; recursion count goes to 2"]
  ok --> rel["Each release() decrements; the lock is free again at 0"]`,
    explain: `A plain \`Lock\` has no owner, so a thread that tries to acquire it twice blocks forever. An \`RLock\` remembers its **owner thread** and a **recursion count**, letting nested methods that share one lock call each other. It is slightly slower, so use it only when re-entry is genuinely needed.`,
  },
  {
    id: 'semaphore',
    where: { source: C('03'), section: /^3\.4|semaphore/i },
    title: 'Semaphore(3): at most three threads inside',
    mermaid: `
flowchart LR
  req["Thread wants a slot"] --> q{"permits > 0?"}
  q -->|yes| take["acquire(): permits − 1"] --> work["Use the limited resource"] --> give["release(): permits + 1"]
  q -->|no| wait["Wait until another thread releases"] --> q`,
    explain: `A semaphore is a counter of available permits. It is the standard tool for **bounding concurrency** — for example at most 3 simultaneous downloads or 10 DB connections. \`BoundedSemaphore\` additionally raises if you release more times than you acquired, which catches bugs early.`,
  },
  {
    id: 'event',
    where: { source: C('03'), section: /^3\.5|\bevent\b/i },
    title: 'Event: one signal wakes every waiter',
    mermaid: `
sequenceDiagram
  participant W1 as Worker 1
  participant E as Event
  participant W2 as Worker 2
  participant M as Main
  W1->>E: wait()
  W2->>E: wait()
  Note over W1,W2: both blocked, flag is False
  M->>E: set()
  E-->>W1: wake up
  E-->>W2: wake up
  Note over E: flag stays True until clear()`,
    explain: `An \`Event\` is a boolean flag threads can wait on. \`set()\` releases **all** current and future waiters until \`clear()\` is called. Typical uses: a "ready" signal after start-up, or a shutdown flag that worker loops check with \`while not stop.is_set():\`.`,
  },
  {
    id: 'condition',
    where: { source: C('03'), section: /^3\.6|condition/i },
    title: 'Condition: wait for a state change',
    mermaid: `
sequenceDiagram
  participant C as Consumer
  participant K as Condition and its lock
  participant P as Producer
  C->>K: with cond: while not items: cond.wait()
  Note over C: wait() releases the lock and sleeps
  P->>K: with cond: items.append(x)
  P->>K: cond.notify()
  K-->>C: wakes, re-acquires the lock
  C->>C: re-check the while condition, then pop the item`,
    explain: `A \`Condition\` couples a lock with a wait/notify queue. The waiter must always re-check its predicate in a \`while\` loop, because wake-ups can be spurious or another thread may have consumed the item first. \`notify()\` wakes one waiter; \`notify_all()\` wakes all of them.`,
  },
  {
    id: 'barrier',
    where: { source: C('03'), section: /^3\.7|barrier/i },
    title: 'Barrier(3): nobody continues until all three arrive',
    mermaid: `
flowchart LR
  t1["Thread 1 arrives, waits"] --> b{{"Barrier — parties = 3"}}
  t2["Thread 2 arrives, waits"] --> b
  t3["Thread 3 arrives"] --> b
  b -->|"3rd arrival trips it"| go["All three are released together"]
  go --> reset["Barrier resets for the next round"]`,
    explain: `A \`Barrier\` synchronises a fixed group of threads at a meeting point — useful for phased simulations or for load tests that need every worker to start at the same instant. If a waiting thread times out, the barrier becomes *broken* and the others get \`BrokenBarrierError\`.`,
  },

  /* --------------------------------------------------------- 04 patterns */
  {
    id: 'producer-consumer-threads',
    where: { source: C('04'), section: /producer-consumer/i },
    title: 'Producer–consumer with a bounded queue.Queue',
    mermaid: `
flowchart LR
  p1["Producer 1"] -->|"put()"| q[("queue.Queue — maxsize = 100")]
  p2["Producer 2"] -->|"put()"| q
  q -->|"get()"| c1["Consumer 1"]
  q -->|"get()"| c2["Consumer 2"]
  q -->|"get()"| c3["Consumer 3"]
  c1 -->|"task_done()"| done["queue.join() returns when every item is processed"]
  c2 --> done
  c3 --> done
  full["Queue full"] -.->|"put() blocks — backpressure"| p1`,
    explain: `The queue decouples the speed of producers from the speed of consumers and does all the locking for you. A **bounded** queue gives natural backpressure: producers block when consumers fall behind instead of using unlimited memory. Stop consumers with one sentinel per consumer (for example \`None\`) and use \`task_done()\` / \`join()\` to wait for completion.`,
  },
  {
    id: 'threadpool',
    where: { source: C('04'), section: /thread pool pattern|threadpoolexecutor/i },
    title: 'ThreadPoolExecutor internals',
    mermaid: `
flowchart LR
  code["submit(fn, arg)"] --> fut["Future returned immediately — PENDING"]
  code --> wq[("internal work queue")]
  wq --> w1["worker thread 1"]
  wq --> w2["worker thread 2"]
  wq --> w3["worker thread N"]
  w1 --> res["fn runs, result or exception stored in the Future"]
  w2 --> res
  w3 --> res
  res --> get["future.result() or as_completed(futures)"]`,
    explain: `The executor keeps a fixed set of worker threads that pull jobs from an internal queue, so you avoid the cost of one thread per task and get a hard cap on concurrency. Every \`submit()\` returns a **Future**; exceptions raised inside the job are re-raised when you call \`result()\`, so always collect results.`,
  },
  {
    id: 'rw-lock',
    where: { source: C('04'), section: /reader-writer/i },
    title: 'Reader–writer lock',
    mermaid: `
flowchart TD
  r["Reader wants access"] --> q1{"Writer active?"}
  q1 -->|no| read["readers += 1, read concurrently with other readers"]
  q1 -->|yes| wr["wait"]
  w["Writer wants access"] --> q2{"Any readers or writer active?"}
  q2 -->|no| write["exclusive write"]
  q2 -->|yes| ww["wait — consider writer preference to avoid starvation"]`,
    explain: `Many readers may share access, but a writer needs the resource alone. This helps read-heavy caches and configuration objects. Python's standard library has no RW lock, so it is built from a \`Condition\` plus counters; decide on reader or writer preference, otherwise a steady stream of readers can starve writers.`,
  },
  {
    id: 'double-checked',
    where: { source: C('04'), section: /double-checked/i },
    title: 'Double-checked locking for a lazy singleton',
    mermaid: `
flowchart TD
  call["get_instance()"] --> c1{"_instance is None?"}
  c1 -->|no| ret["return _instance — fast path, no lock"]
  c1 -->|yes| lock["with _lock:"]
  lock --> c2{"still None?"}
  c2 -->|"yes, we are first"| make["create the instance"] --> ret
  c2 -->|"no, another thread won"| ret`,
    explain: `The first check avoids taking the lock on every call; the second check, made *inside* the lock, stops two threads that both saw \`None\` from creating two instances. In Python the simpler option is often a module-level object or \`functools.cache\` on a factory function.`,
  },
  {
    id: 'future-pattern',
    where: { source: C('04'), section: /future pattern/i },
    title: 'Future: a placeholder for a result that is not ready yet',
    mermaid: `
flowchart LR
  s["submit work"] --> p["Future PENDING"] --> r["RUNNING"] --> f{"finished"}
  f -->|ok| ok["result() returns the value"]
  f -->|error| err["result() re-raises the exception"]
  p -->|"cancel() before it starts"| c["CANCELLED"]`,
    explain: `A future lets the caller continue immediately and collect the result later. \`cancel()\` only works while the job is still pending; once a worker has started it, it runs to completion. Callbacks can be attached with \`add_done_callback\`.`,
  },

  /* ---------------------------------------------------- 05 multiprocessing */
  {
    id: 'process-memory',
    where: { source: C('05'), section: /why multiprocessing/i },
    title: 'Each process has its own interpreter, memory and GIL',
    mermaid: `
flowchart TB
  main["Main process — interpreter, memory, GIL"]
  main -->|"start()"| p1["Child 1 — own interpreter, memory, GIL"]
  main -->|"start()"| p2["Child 2 — own interpreter, memory, GIL"]
  main -->|"start()"| p3["Child 3 — own interpreter, memory, GIL"]
  p1 <-.->|"pickled messages: Queue / Pipe"| main
  p2 <-.-> main
  p3 <-.-> main`,
    explain: `Separate processes do not share a GIL, so CPU-bound Python code really runs on several cores. The price is isolation: memory is not shared, so arguments and results travel as **pickled** messages, and starting a process costs far more than starting a thread. Use them when the computation per task is large compared to the data you send.`,
  },
  {
    id: 'start-methods',
    where: { source: C('05'), section: /fork vs spawn|start methods/i },
    title: 'fork vs spawn vs forkserver',
    mermaid: `
flowchart TD
  start["Process.start()"] --> m{"start method"}
  m -->|fork| f["Copy the parent's memory, copy-on-write — fast; unsafe if the parent has threads"]
  m -->|spawn| s["Start a fresh interpreter and re-import the main module — slower; needs the __main__ guard"]
  m -->|forkserver| fs["Fork from a clean single-threaded server process — safer fork"]
  s --> g["Code at module top level runs again in every child"]`,
    explain: `**spawn** is the default on Windows and macOS (and recent Python versions are moving away from fork elsewhere). Because spawn re-imports your main module, any code that creates processes must sit under \`if __name__ == "__main__":\`, otherwise each child tries to start more children. **fork** is fast but can deadlock if other threads held locks at the moment of the fork.`,
  },
  {
    id: 'process-results',
    where: { source: C('05'), section: /process arguments and return values/i },
    title: 'Getting results back from a Process',
    mermaid: `
flowchart LR
  parent["Parent"] -->|"args are pickled"| child["Child runs target(args)"]
  child -->|"return value is lost"| x["Process has no result attribute"]
  child -->|"put result"| q[("multiprocessing.Queue")]
  q -->|"get()"| parent
  pool["Prefer Pool / ProcessPoolExecutor"] -->|"returns results directly"| parent`,
    explain: `A bare \`Process\` discards its target's return value, so results must be sent back explicitly through a \`Queue\`, \`Pipe\` or shared memory. For most jobs a \`Pool\` or \`ProcessPoolExecutor\` is simpler because it returns results (and re-raises exceptions) for you.`,
  },

  /* ----------------------------------------------------------- 06 IPC */
  {
    id: 'ipc-overview',
    where: { source: C('06'), section: /ipc\) overview|inter-process communication/i },
    title: 'Choosing an IPC mechanism',
    mermaid: `
flowchart TD
  need["Processes need to exchange data"] --> q{"Shape of the communication?"}
  q -->|"many producers / consumers"| queue["Queue — pickled messages, process-safe"]
  q -->|"exactly two endpoints"| pipe["Pipe — faster, two connection objects"]
  q -->|"shared dict or list"| mgr["Manager — proxies to a server process, flexible but slow"]
  q -->|"numbers or arrays, hot path"| shm["Value / Array / shared_memory — no copying, you add locking"]`,
    explain: `Every mechanism trades convenience against speed. Queues and pipes **copy** data by pickling; managers add a network-style round trip per operation; shared memory avoids copying but leaves synchronisation to you. Start with a Queue and move to shared memory only for large numeric data on a hot path.`,
  },
  {
    id: 'mp-queue',
    where: { source: C('06'), section: /^6\.2|queues/i },
    title: 'What happens inside multiprocessing.Queue.put()',
    mermaid: `
sequenceDiagram
  participant P as Producer process
  participant F as Feeder thread
  participant OS as OS pipe
  participant C as Consumer process
  P->>F: put(obj) returns quickly
  F->>F: pickle obj
  F->>OS: write bytes
  C->>OS: get() reads bytes
  C->>C: unpickle into a new object`,
    explain: `\`put()\` hands the object to a background feeder thread that pickles it and writes it to an OS pipe; the consumer unpickles a **copy**. So mutating the object after sending it does not affect what the consumer sees, and every object you send must be picklable — lambdas, open sockets and locks are not.`,
  },
  {
    id: 'manager',
    where: { source: C('06'), section: /managers/i },
    title: 'Manager proxies',
    mermaid: `
flowchart LR
  w1["Worker 1: d['a'] = 1"] -->|"proxy call"| srv["Manager server process — owns the real dict"]
  w2["Worker 2: d.get('a')"] -->|"proxy call"| srv
  srv -->|"pickled reply"| w2`,
    explain: `A \`Manager().dict()\` is not shared memory: each worker holds a **proxy**, and every access is a message to the manager's server process. That makes managers flexible (any type, even across machines) but slow on a hot path. Note that mutating a nested object returned by a proxy changes only a local copy.`,
  },
  {
    id: 'shared-value',
    where: { source: C('06'), section: /shared memory/i },
    title: 'Shared Value with its lock',
    mermaid: `
flowchart LR
  v[("Value('i', 0) in shared memory")]
  p1["Process 1"] -->|"with v.get_lock(): v.value += 1"| v
  p2["Process 2"] -->|"with v.get_lock(): v.value += 1"| v`,
    explain: `\`Value\` and \`Array\` place C types in memory that all processes map, so there is no pickling. \`+=\` is still a read-modify-write, so wrap it in \`get_lock()\` — the same race seen with threads exists between processes.`,
  },

  /* ------------------------------------------------------------- 07 pools */
  {
    id: 'pool-map',
    where: { source: C('07'), section: /basic pool usage/i },
    title: 'Pool.map with chunksize',
    mermaid: `
flowchart LR
  it["iterable of 10 000 items"] --> ch["split into chunks — chunksize items each"]
  ch --> tq[("task queue")]
  tq --> w1["worker process 1"]
  tq --> w2["worker process 2"]
  tq --> w3["worker process 3"]
  w1 --> rq[("result queue")]
  w2 --> rq
  w3 --> rq
  rq --> out["results returned in input order"]`,
    explain: `\`Pool.map\` pickles work in **chunks**: bigger chunks mean less inter-process overhead, smaller chunks mean better load balancing when items take different times. It waits for everything and keeps input order; for very long iterables prefer \`imap\` so results stream back instead of being held in memory.`,
  },
  {
    id: 'pool-methods',
    where: { source: C('07'), section: /imap and imap_unordered|asynchronous pool methods/i },
    title: 'Which Pool method?',
    mermaid: `
flowchart TD
  q{"What do you need?"} -->|"all results, in order, list fits in memory"| map["map / starmap"]
  q -->|"stream results in order"| imap["imap"]
  q -->|"stream results as soon as each finishes"| imu["imap_unordered — best throughput"]
  q -->|"submit and keep working"| aa["apply_async / map_async + callback"]`,
    explain: `\`map\` blocks until everything is done; \`imap\` yields results lazily in order; \`imap_unordered\` yields whichever result finishes first. The \`_async\` variants return immediately with an \`AsyncResult\` — call \`.get(timeout)\` on it so worker exceptions surface instead of disappearing.`,
  },

  /* ------------------------------------------------------- 08 asyncio basics */
  {
    id: 'event-loop',
    where: { source: C('08'), section: /introduction to asynchronous/i },
    title: 'One turn of the event loop',
    mermaid: `
flowchart LR
  ready[("Ready queue")] --> run["Run each ready task until its next await"]
  run --> reg["Awaited I/O is registered with the selector"]
  reg --> poll["selector.select(timeout) — epoll / kqueue / IOCP"]
  poll --> cb["Ready sockets and expired timers schedule callbacks"]
  cb --> ready`,
    explain: `asyncio runs everything on **one thread**. Each turn, the loop runs every ready task until it hits an \`await\` on something not yet available, then asks the OS which sockets or timers are ready and schedules the tasks waiting on them. Nothing runs in parallel, so a task that never awaits — a CPU loop or a blocking call — freezes every other task.`,
  },
  {
    id: 'coroutine-states',
    where: { source: C('08'), section: /coroutines and await/i },
    title: 'From async def to a finished coroutine',
    mermaid: `
flowchart LR
  def["async def fetch()"] -->|"call fetch()"| obj["coroutine object — nothing has run yet"]
  obj -->|"await it or create_task()"| run["running until the next await"]
  run -->|"await on pending I/O"| sus["suspended — loop runs others"]
  sus -->|"I/O ready"| run
  run -->|return| done["finished — value goes to the awaiter"]
  obj -.->|"never awaited"| warn["RuntimeWarning: coroutine was never awaited"]`,
    explain: `Calling an \`async def\` function only creates a coroutine object; its body runs when something **awaits** it or wraps it in a Task. Each \`await\` is a possible suspension point where control returns to the event loop. Forgetting the \`await\` is the most common asyncio bug — the work silently never happens.`,
  },
  {
    id: 'create-task',
    where: { source: C('08'), section: /creating and managing tasks/i },
    title: 'Sequential awaits vs create_task',
    mermaid: `
sequenceDiagram
  participant M as main()
  participant L as Event loop
  Note over M,L: Sequential — about 3 seconds
  M->>L: await fetch(a) — 1 s
  M->>L: await fetch(b) — 1 s
  M->>L: await fetch(c) — 1 s
  Note over M,L: Concurrent — about 1 second
  M->>L: create_task(fetch(a)), (b), (c)
  L->>L: all three wait on I/O at the same time
  M->>L: await the tasks or gather them
  L-->>M: three results after about 1 s`,
    explain: `\`await coro\` runs one thing at a time. \`create_task\` schedules the coroutine on the loop **immediately**, so several waits overlap. Keep a reference to every task you create (or use a TaskGroup): the loop only keeps a weak reference, and an unreferenced task can be garbage-collected mid-flight.`,
  },
  {
    id: 'gather-vs-wait',
    where: { source: C('08'), section: /gather\(\) and asyncio\.wait/i },
    title: 'gather vs wait vs as_completed',
    mermaid: `
flowchart TD
  many["Several awaitables"] --> g["gather(*aws)"]
  many --> w["wait(tasks, return_when=...)"]
  many --> ac["as_completed(aws)"]
  g --> g1["one list of results in argument order; first error propagates unless return_exceptions=True"]
  w --> w1["returns (done, pending) sets; FIRST_COMPLETED, FIRST_EXCEPTION or ALL_COMPLETED"]
  ac --> a1["iterate results in completion order — fastest first"]`,
    explain: `Use **gather** when you want all results in order; **wait** when you need control over what happens to the pending tasks (cancel the rest, add a timeout); **as_completed** when you want to process each result as soon as it is ready. With gather, an exception does not cancel the other tasks — they keep running unless you cancel them.`,
  },
  {
    id: 'asyncio-sleep',
    where: { source: C('08'), section: /asyncio\.sleep\(\) and timing/i },
    title: 'time.sleep blocks the loop, asyncio.sleep yields',
    mermaid: `
sequenceDiagram
  participant A as Task A
  participant L as Event loop
  participant B as Task B
  A->>L: await asyncio.sleep(1)
  L->>B: run Task B meanwhile
  B->>L: await something
  L->>A: resume A after 1 s
  Note over A,B: time.sleep(1) instead would freeze L — B cannot run for that second`,
    explain: `\`asyncio.sleep\` suspends only the current task and lets the loop run others; \`time.sleep\` blocks the whole thread, so every task stalls. \`await asyncio.sleep(0)\` is a cheap way to yield control inside a long loop.`,
  },
  {
    id: 'asyncio-run',
    where: { source: C('08'), section: /running async code/i },
    title: 'What asyncio.run(main()) does',
    mermaid: `
flowchart LR
  r["asyncio.run(main())"] --> n["create a new event loop"] --> m["run main() to completion"] --> c["cancel leftover tasks"] --> s["shut down async generators and the default executor"] --> x["close the loop"]`,
    explain: `\`asyncio.run\` is the single entry point for a program: it owns the loop's whole lifetime. Call it once, at the top level; calling it from inside a running loop raises \`RuntimeError\`. In Jupyter, which already runs a loop, use top-level \`await\` instead.`,
  },

  /* --------------------------------------------------------- 09 tasks */
  {
    id: 'task-states',
    where: { source: C('09'), section: /deep dive into tasks/i },
    title: 'Task states',
    mermaid: `
flowchart LR
  p["Pending — scheduled"] --> r["Running"]
  r -->|await| s["Suspended"]
  s -->|"awaitable done"| r
  r -->|return| d["Done — result()"]
  r -->|raise| e["Done — exception()"]
  p -->|"cancel()"| x["Cancelled"]
  s -->|"cancel(): CancelledError at the await"| x`,
    explain: `A Task wraps a coroutine and drives it on the loop. \`done()\` is True after a result, an exception or a cancellation. If a task fails and nobody retrieves the exception, asyncio logs "Task exception was never retrieved" when it is garbage-collected — a sign of fire-and-forget code.`,
  },
  {
    id: 'taskgroup',
    where: { source: C('09'), section: /taskgroups/i },
    title: 'TaskGroup: structured concurrency',
    mermaid: `
flowchart TD
  tg["async with asyncio.TaskGroup() as tg"] --> t1["tg.create_task(a())"]
  tg --> t2["tg.create_task(b())"]
  tg --> t3["tg.create_task(c())"]
  t2 -->|raises| fail["b() fails"]
  fail --> cancel["the group cancels a() and c()"]
  cancel --> exitg["the with-block exits only after every task has finished"]
  exitg --> eg["ExceptionGroup is raised — handle with except*"]`,
    explain: `A TaskGroup (Python 3.11+) guarantees that no task outlives the block that created it. If one task fails, the siblings are cancelled and the errors are bundled into an \`ExceptionGroup\`. Prefer it over bare \`create_task\` + \`gather\` — it prevents leaked tasks and lost exceptions.`,
  },
  {
    id: 'cancellation',
    where: { source: C('09'), section: /cancellation handling/i },
    title: 'How cancellation travels into a task',
    mermaid: `
sequenceDiagram
  participant Caller
  participant T as Task
  Caller->>T: task.cancel()
  Note over T: CancelledError is raised at the current await
  T->>T: except / finally: release resources
  T-->>Caller: re-raise CancelledError
  Caller->>T: await task raises CancelledError — task.cancelled() is True`,
    explain: `Cancellation is a **request**: it raises \`CancelledError\` inside the task at its next await. Clean up in \`finally\` and let the error propagate — swallowing it breaks \`wait_for\`, timeouts and TaskGroups. Use \`asyncio.shield()\` only for short sections that must complete.`,
  },
  {
    id: 'timeouts',
    where: { source: C('09'), section: /advanced task patterns/i },
    title: 'Timeouts with asyncio.timeout / wait_for',
    mermaid: `
flowchart LR
  call["async with asyncio.timeout(2)"] --> work["await slow_call()"]
  work -->|"finishes in time"| ok["result"]
  work -->|"deadline passes"| cx["inner task is cancelled"] --> te["TimeoutError raised to the caller"]`,
    explain: `A timeout is implemented by cancelling the inner work when the deadline passes and converting the resulting \`CancelledError\` into \`TimeoutError\`. Put timeouts on every network call: one hung dependency can otherwise hold resources forever.`,
  },

  /* ------------------------------------------------- 10 asyncio synchronization */
  {
    id: 'async-race',
    where: { source: C('10'), section: /why async synchronization/i },
    title: 'Races still happen in asyncio — at await points',
    mermaid: `
sequenceDiagram
  participant A as Task A
  participant S as balance = 100
  participant B as Task B
  A->>S: read balance → 100
  A->>A: await bank_api() — suspends
  B->>S: read balance → 100
  B->>S: write 100 − 80 = 20
  A->>S: write 100 − 80 = 20
  Note over S: two withdrawals of 80, balance is 20 instead of failing`,
    explain: `asyncio is single-threaded, so code *between* awaits is atomic — but any \`await\` inside a read-modify-write lets another task interleave. Use \`asyncio.Lock\` (not \`threading.Lock\`, which would block the whole loop) around such sections.`,
  },
  {
    id: 'async-semaphore',
    where: { source: C('10'), section: /asyncio\.semaphore/i },
    title: 'Bounding concurrency with asyncio.Semaphore',
    mermaid: `
flowchart LR
  urls["1 000 fetch coroutines"] --> sem{{"async with Semaphore(20)"}}
  sem -->|"20 in flight"| api["remote API"]
  sem -->|"980 waiting"| q["suspended, not blocking the loop"]
  api -->|"one finishes, releases"| sem`,
    explain: `\`gather\` over 1 000 coroutines starts them **all at once**, which can exhaust sockets, connection pools or a partner's rate limit. Wrapping the request in \`async with sem:\` keeps at most N in flight while the rest wait cheaply.`,
  },
  {
    id: 'async-queue',
    where: { source: C('10'), section: /asyncio\.queue/i },
    title: 'asyncio.Queue worker pool',
    mermaid: `
flowchart LR
  prod["producer: await q.put(item)"] --> q[("asyncio.Queue(maxsize=100)")]
  q --> w1["worker 1: item = await q.get()"]
  q --> w2["worker 2"]
  q --> w3["worker N"]
  w1 -->|"q.task_done()"| j["await q.join() — all items processed"]
  w2 --> j
  w3 --> j
  j --> stop["cancel the idle workers"]`,
    explain: `The async version of producer–consumer: \`put\` suspends when the queue is full (backpressure) and \`get\` suspends when it is empty. Start N worker tasks, \`await q.join()\` to wait until every item is processed, then cancel the workers.`,
  },
  {
    id: 'async-event',
    where: { source: C('10'), section: /asyncio\.event/i },
    title: 'asyncio.Event for start-up and shutdown signals',
    mermaid: `
sequenceDiagram
  participant W as Worker tasks
  participant E as asyncio.Event
  participant M as main
  W->>E: await ready.wait()
  M->>M: open DB pool, warm caches
  M->>E: ready.set()
  E-->>W: all waiting workers resume`,
    explain: `Identical in spirit to \`threading.Event\`, but \`wait()\` is awaited so it suspends a task instead of blocking a thread. A shared \`stop\` event that every loop checks is a clean way to implement graceful shutdown.`,
  },

  /* ---------------------------------------------------------- 11 advanced */
  {
    id: 'async-generator',
    where: { source: C('11'), section: /async generators and async iterators/i },
    title: 'Streaming pages with an async generator',
    mermaid: `
sequenceDiagram
  participant U as async for row in rows()
  participant G as async generator
  participant API as Paginated API
  U->>G: __anext__()
  G->>API: await get(page 1)
  API-->>G: 100 rows
  G-->>U: yield row 1 … row 100
  U->>G: __anext__()
  G->>API: await get(page 2)
  Note over U,G: memory holds one page at a time`,
    explain: `An \`async def\` containing \`yield\` is an async generator: the consumer pulls items with \`async for\`, and the generator can \`await\` between yields — ideal for pagination, file streaming and database cursors. Close it properly (\`aclose()\` or \`contextlib.aclosing\`) if you stop iterating early.`,
  },
  {
    id: 'run-blocking',
    where: { source: C('11'), section: /running blocking code in async/i },
    title: 'Keeping blocking work off the event loop',
    mermaid: `
flowchart TD
  t["Inside a coroutine you must call blocking code"] --> q{"What kind?"}
  q -->|"blocking I/O: requests, legacy DB driver"| th["await asyncio.to_thread(fn, ...) or run_in_executor(None, fn)"]
  q -->|"CPU-heavy pure Python"| pp["await loop.run_in_executor(process_pool, fn, ...)"]
  q -->|"async library exists"| lib["switch to it: httpx, asyncpg, aiofiles"]
  th --> loop["Event loop keeps serving other tasks"]
  pp --> loop`,
    explain: `Any call that does not await blocks the whole loop. Push blocking I/O to a thread with \`asyncio.to_thread\`, push CPU work to a process pool, and prefer native async libraries when they exist. A quick check for a blocked loop: \`asyncio.run(main(), debug=True)\` logs callbacks slower than 100 ms.`,
  },
  {
    id: 'async-cm',
    where: { source: C('11'), section: /async context managers/i },
    title: 'async with: awaitable setup and teardown',
    mermaid: `
flowchart LR
  a["async with pool.acquire() as conn"] --> e["await __aenter__() — get a connection"]
  e --> b["body: await conn.fetch(...)"]
  b --> x["await __aexit__() — return the connection, even on error"]`,
    explain: `\`async with\` is the asynchronous form of \`with\`: both entering and leaving can await, which is exactly what network resources need — acquiring a pooled connection, opening a session, committing a transaction. Write your own with \`@contextlib.asynccontextmanager\`.`,
  },

  /* ------------------------------------------------- 12 concurrent.futures */
  {
    id: 'executor-api',
    where: { source: C('12'), section: /introduction to concurrent\.futures/i },
    title: 'One API, two executors',
    mermaid: `
flowchart TD
  ex["Executor interface: submit(), map(), shutdown()"] --> tpe["ThreadPoolExecutor — I/O-bound, shares memory"]
  ex --> ppe["ProcessPoolExecutor — CPU-bound, pickles arguments"]
  tpe --> fut["Future objects"]
  ppe --> fut
  fut --> ac["as_completed() / wait() / result()"]`,
    explain: `\`concurrent.futures\` hides threads and processes behind the same interface, so switching from I/O-bound to CPU-bound work is often a one-word change. Use the executor as a context manager — the \`with\` block calls \`shutdown(wait=True)\` so every job finishes before you continue.`,
  },
  {
    id: 'first-completed',
    where: { source: C('12'), section: /first_completed/i },
    title: 'wait(..., return_when=FIRST_COMPLETED)',
    mermaid: `
sequenceDiagram
  participant M as main
  participant A as mirror A
  participant B as mirror B
  participant C as mirror C
  M->>A: submit download
  M->>B: submit download
  M->>C: submit download
  B-->>M: finished first
  M->>M: wait returns done = {B}, pending = {A, C}
  M->>A: cancel() if not started
  M->>C: cancel() if not started`,
    explain: `\`wait\` returns two sets so you decide what to do with the rest — the basis for "fastest mirror wins" or hedged requests. Remember that \`cancel()\` cannot stop a job that is already running in a pool.`,
  },

  /* ---------------------------------------------- 13 async I/O libraries */
  {
    id: 'client-session',
    where: { source: C('13'), section: /aiohttp/i },
    title: 'Reuse one ClientSession',
    mermaid: `
flowchart LR
  app["Application start-up"] --> s["one aiohttp.ClientSession"]
  s --> pool[("connection pool — TCPConnector(limit=100)")]
  pool -->|"keep-alive reuse"| h1["api.example.com"]
  pool --> h2["auth.example.com"]
  r1["request 1"] --> s
  r2["request 2"] --> s
  r3["request N"] --> s`,
    explain: `A session owns a **connection pool**; creating one per request throws away keep-alive connections and TLS handshakes and can leak sockets. Create one session at start-up, share it, close it at shutdown, and set the connector limit to cap concurrency per host.`,
  },
  {
    id: 'async-db-pool',
    where: { source: C('13'), section: /async databases|asyncpg/i },
    title: 'Async database connection pool',
    mermaid: `
flowchart LR
  req["many concurrent requests"] --> acq["async with pool.acquire()"]
  acq --> pool[("asyncpg pool — min 5, max 20")]
  pool --> db[("PostgreSQL")]
  acq -->|"pool exhausted"| wait["task waits without blocking the loop"]`,
    explain: `The pool bounds how many connections each process opens. Size it from the database side: workers × max pool size must stay under the server's connection limit, otherwise adding replicas of your service takes the database down.`,
  },

  /* ---------------------------------------------- 14 mixing concurrency */
  {
    id: 'hybrid',
    where: { source: C('14'), section: /when to mix/i },
    title: 'A hybrid architecture',
    mermaid: `
flowchart LR
  loop["asyncio event loop — HTTP, websockets, DB"] -->|"run_in_executor"| tp["ThreadPool — blocking SDKs"]
  loop -->|"run_in_executor"| pp["ProcessPool — CPU-heavy work"]
  tp -->|"Future"| loop
  pp -->|"Future"| loop`,
    explain: `Most real systems combine models: the event loop handles the many slow network conversations, a thread pool wraps libraries that only offer blocking APIs, and a process pool does the heavy computation. The loop awaits the executor futures, so it never blocks.`,
  },
  {
    id: 'threadsafe',
    where: { source: C('14'), section: /running asyncio from threads/i },
    title: 'Calling into a running loop from another thread',
    mermaid: `
sequenceDiagram
  participant T as Worker thread
  participant L as Event loop thread
  T->>L: asyncio.run_coroutine_threadsafe(coro, loop)
  L->>L: schedule coro as a Task
  L-->>T: concurrent.futures.Future
  T->>T: future.result(timeout=5) blocks only this thread`,
    explain: `asyncio objects are **not thread-safe**. From another thread, use \`run_coroutine_threadsafe\` (for coroutines) or \`loop.call_soon_threadsafe\` (for plain callbacks); calling \`create_task\` or touching an \`asyncio.Queue\` directly from a foreign thread causes subtle bugs.`,
  },

  /* ---------------------------------------------- 15 design patterns */
  {
    id: 'pipeline',
    where: { source: C('15'), section: /pipeline pattern/i },
    title: 'Pipeline: stages connected by queues',
    mermaid: `
flowchart LR
  src["source"] --> q1[("queue")] --> s1["stage 1: download — 10 workers"] --> q2[("queue")] --> s2["stage 2: parse — 4 workers"] --> q3[("queue")] --> s3["stage 3: store — 2 workers"]`,
    explain: `Each stage scales independently: give slow stages more workers, and use bounded queues so a slow stage pushes back on the faster ones. Shut the pipeline down by sending a sentinel through every stage in order.`,
  },
  {
    id: 'fan-out-in',
    where: { source: C('15'), section: /fan-out|fan-in/i },
    title: 'Fan-out / fan-in',
    mermaid: `
flowchart LR
  req["one request"] --> f{{"fan out"}}
  f --> a["call service A"]
  f --> b["call service B"]
  f --> c["call service C"]
  a --> j{{"fan in: gather with timeout"}}
  b --> j
  c --> j
  j --> resp["merged response"]`,
    explain: `Split one job into independent parts, run them concurrently, then combine the results. Total latency becomes the slowest branch instead of the sum, so put a timeout on the fan-in and decide what a partial result looks like.`,
  },
  {
    id: 'circuit-breaker',
    where: { source: C('15'), section: /circuit breaker/i },
    title: 'Circuit breaker states',
    mermaid: `
flowchart LR
  closed["CLOSED — calls pass through"] -->|"failures reach the threshold"| open["OPEN — fail fast, no calls"]
  open -->|"reset timeout expires"| half["HALF-OPEN — allow one trial call"]
  half -->|success| closed
  half -->|failure| open`,
    explain: `When a dependency is down, retrying every request only adds load and latency. The breaker counts failures; once the threshold is hit it **opens** and fails immediately, then after a cool-down lets a single probe through to decide whether to close again.`,
  },
  {
    id: 'retry-backoff',
    where: { source: C('15'), section: /retry pattern/i },
    title: 'Retry with exponential backoff and jitter',
    mermaid: `
flowchart TD
  attempt["call()"] --> ok{"success?"}
  ok -->|yes| done["return"]
  ok -->|no| tr{"transient error and attempts left?"}
  tr -->|no| raise["raise"]
  tr -->|yes| sleep["sleep base × 2^attempt + random jitter"] --> attempt`,
    explain: `Retry only errors that can succeed later (timeouts, 503, connection resets), never validation errors. Exponential backoff gives the dependency time to recover, and **jitter** stops thousands of clients from retrying in lock-step.`,
  },
  {
    id: 'bulkhead',
    where: { source: C('15'), section: /bulkhead/i },
    title: 'Bulkhead: isolate resource pools',
    mermaid: `
flowchart LR
  traffic["incoming work"] --> p1["payments pool — 10 slots"]
  traffic --> p2["search pool — 20 slots"]
  traffic --> p3["reports pool — 5 slots"]
  p3 -->|"slow reports fill their own pool"| x["only reports degrade"]`,
    explain: `Give each dependency or feature its own bounded pool (semaphore, executor or connection pool). A slow downstream then exhausts only its own slots instead of every worker in the service.`,
  },
  {
    id: 'worker-pool-pattern',
    where: { source: C('15'), section: /worker pool pattern/i },
    title: 'Fixed worker pool',
    mermaid: `
flowchart LR
  jobs[("job queue")] --> w1["worker 1"]
  jobs --> w2["worker 2"]
  jobs --> w3["worker N"]
  w1 --> res[("results")]
  w2 --> res
  w3 --> res`,
    explain: `N long-lived workers pull jobs from one queue, so concurrency is capped at N no matter how many jobs arrive, and workers are reused instead of created per job. The same shape works with threads, processes or asyncio tasks.`,
  },

  /* ------------------------------------------- 16-18 performance, debugging, testing */
  {
    id: 'perf-loop',
    where: { source: C('16'), section: /profiling concurrent code/i },
    title: 'Optimise from measurements',
    mermaid: `
flowchart LR
  m["Measure wall time and CPU time"] --> b{"CPU time close to wall time?"}
  b -->|yes| cpu["CPU-bound: profile with cProfile or py-spy, then use processes"]
  b -->|no| io["I/O-bound: find the waits, then add concurrency or caching"]
  cpu --> v["Re-measure"]
  io --> v
  v --> m`,
    explain: `Compare wall-clock time with CPU time: if they are close the program is computing, if wall time is much larger it is waiting. \`py-spy dump\` shows what every thread is doing right now, which is often faster than reasoning about the code.`,
  },
  {
    id: 'deadlock',
    where: { source: C('17'), section: /common concurrency bugs/i },
    title: 'Deadlock from inconsistent lock order',
    mermaid: `
flowchart LR
  t1["Thread 1 holds lock A"] -->|"waits for"| lb["lock B"]
  t2["Thread 2 holds lock B"] -->|"waits for"| la["lock A"]
  lb -.->|"owned by"| t2
  la -.->|"owned by"| t1`,
    explain: `Each thread holds one lock and waits for the other's: a cycle that never resolves. Prevent it by always acquiring locks in one global order, by using timeouts (\`lock.acquire(timeout=...)\`), or by needing only one lock. \`faulthandler.dump_traceback_later\` or \`py-spy dump\` shows where the threads are stuck.`,
  },
  {
    id: 'deterministic-test',
    where: { source: C('18'), section: /deterministic testing/i },
    title: 'Forcing an interleaving in a test',
    mermaid: `
sequenceDiagram
  participant T1 as Thread 1
  participant E as Events in the test
  participant T2 as Thread 2
  T1->>T1: read value
  T1->>E: set "read_done", wait "write_done"
  E-->>T2: start now
  T2->>T2: write value
  T2->>E: set "write_done"
  E-->>T1: continue and write
  Note over T1,T2: the race now happens on every run`,
    explain: `Races are flaky because the interleaving is random. Inject hooks (events or barriers) at the suspicious points so the test forces the bad ordering every time; for asyncio code, mock time or step the loop explicitly instead of sleeping.`,
  },

  /* ----------------------------------------------- 20 best practices */
  {
    id: 'decision-final',
    where: { source: C('20'), section: /choosing the right concurrency model/i },
    title: 'Production decision guide',
    mermaid: `
flowchart TD
  a(["New concurrent feature"]) --> b{"Bottleneck?"}
  b -->|network or disk| c{"How many concurrent operations?"}
  c -->|"tens"| th["ThreadPoolExecutor"]
  c -->|"thousands"| as["asyncio + async libraries + Semaphore limits"]
  b -->|CPU in Python| pr["ProcessPoolExecutor, chunked work"]
  b -->|"CPU in numpy / C"| th2["threads — the C code releases the GIL"]
  b -->|"both"| hy["asyncio front + process pool back"]
  as --> ops["Always: timeouts, bounded queues, graceful shutdown, metrics"]
  th --> ops
  pr --> ops
  hy --> ops`,
    explain: `The model follows from the bottleneck and the scale. Whatever you choose, the same production safeguards apply: bounded concurrency, timeouts on every external call, cancellation-safe cleanup, graceful shutdown, and metrics for queue depth and latency.`,
  },

  /* ----------------------------------------------- FastAPI guide */
  {
    id: 'asgi-stack',
    where: { source: FASTAPI, section: /asgi stack/i },
    title: 'Request path through the ASGI stack',
    mermaid: `
flowchart LR
  c["client"] --> lb["load balancer"] --> u["Uvicorn worker — event loop"]
  u -->|"scope, receive, send"| st["Starlette middleware and routing"]
  st --> f["FastAPI: dependencies, validation"]
  f --> r["your route coroutine"]
  r -->|"response"| u`,
    explain: `Uvicorn accepts connections on one event loop per worker process and calls the ASGI application with \`(scope, receive, send)\`. Starlette routes the request, FastAPI resolves dependencies and validates input, and your route runs as a coroutine on that same loop — which is why one blocking call in a route stalls every other request on the worker.`,
  },
  {
    id: 'async-vs-def-routes',
    where: { source: FASTAPI, section: /async def vs def routes/i },
    title: 'How FastAPI runs async def vs def routes',
    mermaid: `
flowchart TD
  r["incoming request"] --> q{"route declared as"}
  q -->|"async def"| loop["runs directly on the event loop — every I/O call must be awaited"]
  q -->|"def"| tp["runs in the threadpool via anyio — blocking libraries are fine"]
  loop --> bad["requests.get or time.sleep here blocks ALL requests"]
  tp --> cap["limited by the threadpool size — 40 threads by default"]`,
    explain: `FastAPI inspects the route: \`async def\` routes run on the loop, plain \`def\` routes are sent to a thread pool. So a blocking library inside an \`async def\` route is the single most damaging mistake, while the same code in a \`def\` route is merely limited by the pool size.`,
  },
  {
    id: 'gunicorn-uvicorn',
    where: { source: FASTAPI, section: /gunicorn \+ uvicorn/i },
    title: 'Gunicorn master with Uvicorn workers',
    mermaid: `
flowchart TB
  g["Gunicorn master — restarts dead workers"] --> w1["Uvicorn worker 1 — event loop"]
  g --> w2["Uvicorn worker 2 — event loop"]
  g --> w3["Uvicorn worker N — event loop"]
  w1 --> pool1[("own DB pool")]
  w2 --> pool2[("own DB pool")]
  w3 --> pool3[("own DB pool")]`,
    explain: `One event loop uses one core, so production runs several worker **processes** (often about one per core) under a supervisor. Each worker has its own loop and its own connection pools, which is why total DB connections = workers × pool size.`,
  },
  {
    id: 'littles-law',
    where: { source: FASTAPI, section: /little's law/i },
    title: "Little's law for capacity planning",
    mermaid: `
flowchart LR
  l["arrival rate λ: 10 000 req/s"] --> m(("L = λ × W"))
  w["time in system W: 0.2 s"] --> m
  m --> r["≈ 2 000 requests in flight at any moment"]
  r --> d["size workers, pools and file-descriptor limits for that"]`,
    explain: `The number of requests in flight equals arrival rate multiplied by average latency. It turns "1 million users" into concrete numbers for concurrent connections, worker count, pool sizes and OS limits — and shows that cutting latency reduces the capacity you need.`,
  },
]
