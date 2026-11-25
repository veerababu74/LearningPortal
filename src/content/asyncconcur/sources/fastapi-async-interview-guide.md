<!-- Generated from asyncconcur/async/Async_Programming_FastAPI_Interview_Guide.pdf by scripts/pdf-to-md.py. Edit the PDF converter, not this file. -->

# Asynchronous Programming with FastAPI — Interview Mastery Guide

# Chapter 1 — Synchronous vs Asynchronous: The Mental Model

Before diving into coroutines, event loops, and FastAPI internals, you need a rock-solid mental model of what "asynchronous" actually means. Most interview answers go off the rails because candidates conflate asynchronous with "parallel" or "multi-threaded". They are not the same thing. This chapter builds the correct mental model using a single analogy that scales from a single Python function to a million-user deployment. Once you internalise this model, every other concept in this guide becomes a corollary.

## 1.1 The Restaurant Waiter Analogy

Imagine a small restaurant with one waiter. In the synchronous model, the waiter takes an order from table A, walks to the kitchen, stands there waiting for the chef to cook the dish, carries it back to table A, and only then moves to table B to take their order. The waiter spends 90 percent of the time idle, just standing outside the kitchen. If a hundred tables arrive, the last table waits hours for its first order to be taken. In the asynchronous model, the waiter takes table A's order, hands it to the chef, and immediately walks to table B. The waiter keeps taking orders from other tables while the chef cooks. When table A's dish is ready, the chef rings a bell, and the waiter picks it up the next time they pass by. The waiter is never idle, the kitchen is fully utilised, and all tables are served within minutes. The waiter is the event loop. The kitchen is the I/O subsystem (database, HTTP API, file system). The bell is the operating-system readiness notification (epoll, kqueue, IOCP).

The key insight is this: async does not make the kitchen cook faster. A 200-millisecond database query still takes 200 milliseconds. What async does is let the waiter handle a hundred tables with one pair of legs. Concurrency goes up; per-request latency does not go down (and often improves slightly because the queue is shorter). If your kitchen is the bottleneck - i.e., your database or downstream API is saturated - adding more waiters (threads or processes) will not help. You need to fix the kitchen.

## 1.2 Blocking vs Non-Blocking I/O

A "blocking" call is one where the calling thread is parked by the operating system until the operation completes. time.sleep(1), requests.get(url), psycopg2.cursor.execute(sql) are all blocking. When you call them, the OS marks the thread as "waiting on I/O" and gives the CPU to another thread. The thread literally cannot do anything else until the I/O completes.

A "non-blocking" call is one where the calling thread submits the I/O request to the OS and immediately gets back control. The OS promises to notify the thread later when the result is ready. socket.recv in non-blocking mode, asyncio.sleep, httpx.AsyncClient.get, and asyncpg.fetchrow are all non-blocking. The thread can submit a hundred such requests and then sleep until the OS says "hey, request 7 is done".

**Interview answer template**

When the interviewer asks "what is async programming?", start with: "Async programming is a style where a single thread overlaps multiple I/O operations by submitting them to the OS and waiting for readiness notifications, instead of blocking on each one." Then give the waiter analogy. Then explain that this works because I/O-bound workloads spend most of their time waiting, not computing.

## 1.3 When Async Wins and When It Loses

Async wins decisively when the workload is I/O-bound: HTTP APIs that call other APIs, websockets, database queries, message queue producers, file streaming. In all these cases the CPU spends less than 5 percent of the time actually computing; the rest is waiting on the network or disk. A single async thread can handle thousands of simultaneous connections because each connection only needs the CPU during the brief moments when data is actually being processed.

Async loses badly when the workload is CPU-bound: image processing, JSON serialisation of huge payloads, machine-learning inference, cryptography, regex on giant strings. The async event loop runs on a single thread. If your coroutine computes for 500 milliseconds, the event loop is blocked for 500 milliseconds - every other connection waits. In this case, threads (via asyncio.to_thread) or multiprocessing (via ProcessPoolExecutor) are the correct tools, not raw async.

A practical rule of thumb: if your route does mostly await calls, make it async def; if it does mostly synchronous computation, make it def (FastAPI will run it in a threadpool) or offload it to a background worker. Mixing both - using async def for a route that then calls blocking libraries - is the single most common production bug in async FastAPI code.

# Chapter 2 — The Event Loop, Coroutines, Tasks, and Futures

The async stack in Python has four primitives that candidates routinely confuse: coroutines, tasks, futures, and the event loop itself. An interviewer can instantly tell whether you actually use async or just memorised syntax by asking you to define each one precisely. This chapter gives you those definitions, the relationships between them, and the code patterns that demonstrate each.

## 2.1 The Event Loop

The event loop is the single thread that runs your async program. Its job is simple in description and complex in implementation: (1) maintain a list of ready-to-run coroutines, (2) maintain a list of pending I/O operations with their callbacks, (3) repeatedly run all ready coroutines until they yield, then ask the OS for any new I/O that has completed (via epoll on Linux, kqueue on macOS, IOCP on Windows), then move the corresponding coroutines back to the ready list. This cycle - run ready coroutines, poll OS, promote ready coroutines - is called a "tick".

In modern Python you rarely touch the loop directly. You call asyncio.run(main()), which creates a fresh loop, runs main() until it completes, then closes the loop. Inside an ASGI server like Uvicorn, the loop is created once at startup and shared across all request coroutines. There is exactly one event loop per worker process. Multiple workers means multiple loops, each in its own process, completely isolated.

```python
import asyncio
async def main():
    print("hello")
    await asyncio.sleep(1)   # yields control to the loop
    print("world")
asyncio.run(main())  # creates loop, runs main, closes loop
```

## 2.2 Coroutines: Functions vs Objects

A coroutine function is any function defined with async def. A coroutine object is what you get when you call a coroutine function - but the body has not run yet. This distinction is critical. Calling main() does not execute main; it returns a coroutine object that you must then await or schedule as a task. Forgetting this is the #1 beginner mistake.

```python
async def fetch(url):
    ...
```

# WRONG - calling the function does not run it

```python
fetch("https://example.com")        # returns <coroutine object>
```

# RIGHT - you must await it or schedule it

```python
result = await fetch("https://example.com")
# or:
task = asyncio.create_task(fetch("https://example.com"))
```

**Interview gotcha**

If you call a coroutine and forget to await it, Python will print a "coroutine was never awaited" warning at garbage-collection time. The coroutine body never executes. This is one of the most common bugs in async code review and an interviewer favourite.

## 2.3 Tasks: Scheduled Coroutines

A Task is a coroutine that the event loop has scheduled to run. When you call asyncio.create_task(coro), the loop wraps your coroutine in a Task object and adds it to its ready list. The Task will start running on the next tick of the loop (not immediately - the current coroutine keeps running until it yields). Tasks are how you achieve concurrency within a single event loop: create several tasks, then await them together.

```python
import asyncio
import time
async def fetch(url):
    await asyncio.sleep(1)
    return f"data from {url}"
async def main():
    start = time.perf_counter()
    # Sequential: 3 seconds
    a = await fetch("a")
    b = await fetch("b")
    c = await fetch("c")
    sequential_time = time.perf_counter() - start
    start = time.perf_counter()
    # Concurrent: ~1 second
    t1 = asyncio.create_task(fetch("a"))
    t2 = asyncio.create_task(fetch("b"))
    t3 = asyncio.create_task(fetch("c"))
    a, b, c = await asyncio.gather(t1, t2, t3)
    concurrent_time = time.perf_counter() - start
    print(f"Sequential: {sequential_time:.2f}s  Concurrent: {concurrent_time:.2f}s")
asyncio.run(main())
```

## 2.4 asyncio.gather vs asyncio.wait vs asyncio.create_task

These three are constantly confused. asyncio.gather(*coros) takes coroutines (or tasks), schedules them all concurrently, and returns a single awaitable that resolves to a list of results in the same order. It is the most common way to fan out. asyncio.wait(coros) is older and returns two sets - done and pending - letting you process results as they complete. asyncio.create_task(coro) schedules a single coroutine and returns a Task you can await later; useful when you want to "fire" something now but check on it later.

API Input Returns Use When asyncio.gather Multiple coros/awaitables List of results (in order) You want all results, in order, all-or-nothing asyncio.wait Iterable of awaitables (done, pending) sets You want to process results as they finish, or with timeout asyncio.create_task Single coroutine Task object You want to start something now,

```python
await later
```

asyncio.as_complet ed Iterable of awaitables Iterator of awaitables You want to handle each result as soon as it completes, in completion order

## 2.5 Futures: Low-Level Awaitables

A Future is a low-level object that represents a value that will be available later. Tasks are actually a subclass of Future. You rarely create Futures yourself; they are used by libraries (asyncio, asyncpg, aiohttp) to bridge between callback-based C code and async/await syntax. The one place you might use a Future directly is when integrating with a callback-based library: you create a Future, pass a callback that resolves it, and await it from your coroutine.

```python
import asyncio
async def main():
    loop = asyncio.get_running_loop()
    future = loop.create_future()
    # Some callback-based code resolves the future later
    loop.call_later(1.0, future.set_result, "hello from the future")
    result = await future   # blocks until set_result is called
    print(result)
asyncio.run(main())
```

# Chapter 3 — async/await Syntax Demystified

The async and await keywords were added in Python 3.5 to make coroutine code look sequential while behaving concurrently. They are syntactic sugar over the older generator-based coroutine protocol, but they enforce clarity: await can only appear inside async def, and an async def function always returns a coroutine object. This chapter explains what each keyword does at runtime, so you can answer "what does await actually do?" without mumbling.

## 3.1 What async def Actually Does

When Python sees async def foo():, it compiles foo as a coroutine function, not a regular function. Calling foo() does not execute the body; it constructs a coroutine object that wraps the body. The body only starts executing when something awaits the coroutine (or schedules it via create_task). Inside the body, every await expression is a potential suspension point: at that moment, the coroutine yields control back to the event loop, which can run other coroutines until the awaited operation is ready to resume.

A useful mental model: async def defines a state machine where each await is a state. The coroutine starts at state 0, runs until it hits an await, suspends, and later resumes from that state. This is exactly how generators work under the hood - coroutines were built on top of the generator protocol before they became a first-class concept.

## 3.2 What await Actually Does

When Python evaluates await expr, it does the following: (1) evaluates expr to get an awaitable (a coroutine, a Task, a Future, or any object with an __await__ method); (2) calls __await__, which returns an iterator; (3) yields each value from that iterator to the event loop; (4) when the iterator raises StopIteration(value), the await expression evaluates to value and the coroutine resumes. From the developer's perspective, await means "wait here for this operation to complete, but let other coroutines run while we wait". Interview-grade answer "await yields control to the event loop, allowing other coroutines to run, until the awaited operation completes. The current coroutine is suspended at that exact line and resumed later with the result." This is the answer that demonstrates you understand async, not just use it.

## 3.3 Common async/await Mistakes

Several anti-patterns recur in async code review and are guaranteed interview questions. Memorise the symptom, the cause, and the fix for each.

Mistake Symptom Fix Awaiting a non-awaitable TypeError: object X cannot be used in await expression Only await coroutines, Tasks, or Futures.

Sync functions are not awaitable.

Mistake Symptom Fix Forgetting await RuntimeWarning: coroutine was never awaited; result is a coroutine object instead of a value Always await coroutine calls. Use a linter like flake8-async.

Awaiting inside a list comprehension SyntaxError in older Python; or you write [coro() for x in y] which never runs them Use asyncio.gather(*[coro(x) for x in y]) to run them concurrently.

Using requests inside async def Event loop blocked for the duration of each request Use httpx.AsyncClient or aiohttp instead.

Mixing asyncio.run and an existing loop RuntimeError: asyncio.run() cannot be called from a running event loop Inside an app, never call asyncio.run; rely on the framework's loop (Uvicorn, etc.)

# Chapter 4 — When, Where, and Why to Use Async

Knowing how async works is not enough. You must also know when to use it, when to avoid it, and when to combine it with threads or processes. Interviewers love asking "should I make this route async?" - the correct answer is almost never "always" or "never". This chapter gives you the decision matrix.

## 4.1 The Three Workload Types

Every backend workload falls into one of three categories: I/O-bound (waiting on network/disk), CPU-bound (computing), or mixed. The async decision depends entirely on which category dominates. A route that does 50ms of DB query and 5ms of JSON parsing is I/O-bound; making it async is a clear win. A route that does 5ms of DB query and 500ms of image resizing is CPU-bound; making it async will block the event loop and hurt every other request.

Workload Type Example Best Tool Why I/O-bound (network-heavy) REST API fan-out, websocket, DB queries asyncio + FastAPI async routes Single thread handles thousands of connections; CPU stays idle during I/O waits.

I/O-bound (simple) Internal CRUD app, low traffic Sync FastAPI + Uvicorn threadpool Simpler code; threadpool handles concurrency up to ~50 req/s easily.

CPU-bound (single request) Image resize, JSON parse of 50MB payload, ML inference ProcessPoolExecutor or offload to worker Async loop would be blocked; separate process uses other CPU cores.

Mixed (I/O + light CPU) API that queries DB then does moderate processing async route + run_in_executor for CPU parts Most code stays async; only the heavy CPU step is offloaded.

CPU-bound (continuous) Background video transcoding, batch ETL Celery / RQ / Dramatiq with multiprocessing Async is the wrong tool entirely; you need true parallelism.

## 4.2 asyncio vs Threads vs Multiprocessing vs Gevent

Python offers four concurrency models. Each has a sweet spot. Knowing the trade-offs cold is a top-10 interview question.

Model Concurrency Mechanism Best For Cost per Unit Pitfalls asyncio Single thread, cooperative multitasking via event loop I/O-bound, many idle connections ~KB of memory per coroutine Blocking calls freeze everything; harder to debug Threading OS threads, preemptive, GIL-serialised CPU work I/O-bound with blocking libraries; background tasks ~8MB stack default; GIL contention Race conditions, deadlocks, GIL prevents CPU parallelism Multiprocessing OS processes, true parallelism CPU-bound work ~30-100MB per process High memory; IPC is slow; startup cost Gevent / Eventlet Green threads via monkey-patching Legacy codebases; transparent async Low memory per greenlet Monkey-patching surprises; not compatible with asyncio

## 4.3 The Decision Tree

When asked "should I use async for this?", walk the interviewer through this decision tree. It is remarkably effective at showing you understand the trade-offs.

•  Step 1: Is the workload dominated by waiting on network, disk, or external services? If yes, async is a strong candidate.

•  Step 2: Are the libraries you need (DB driver, HTTP client) async-native? If no, async buys you nothing - the blocking libraries will freeze the loop. Either switch libraries or stay sync. •  Step 3: Do you need to handle thousands of simultaneous connections on one box? If yes, async (or Go) is essentially mandatory; threads do not scale past a few hundred per process.

•  Step 4: Is there significant CPU work per request (image processing, large JSON, ML)? If yes, use async for I/O plus asyncio.to_thread or ProcessPoolExecutor for CPU. Or just use sync + workers. •  Step 5: Is the team comfortable with async debugging? Async stack traces are harder to read; aiohttp bugs are notorious. If team experience is low, sync + horizontal scaling may ship faster.

# Chapter 5 — FastAPI Async Internals

FastAPI is built on Starlette, which is built on the ASGI specification. Understanding this stack is essential because every "how does FastAPI handle async?" interview question ultimately reduces to "how does ASGI and Starlette schedule my route function?". This chapter walks the request lifecycle from TCP socket to your route function and back, with code.

## 5.1 The ASGI Stack

ASGI (Asynchronous Server Gateway Interface) is the async successor to WSGI. Where WSGI is synchronous (one callable per request, blocking), ASGI is async and supports long-lived connections (websockets, HTTP/2 server push). The stack is: Uvicorn (the ASGI server, manages the event loop and HTTP parsing) -> Starlette (the ASGI framework, routing, middleware, requests/responses) -> FastAPI (the API framework, dependency injection, Pydantic validation, OpenAPI generation). Your route function is the innermost layer.

```python
# The ASGI application interface
async def app(scope, receive, send):
    # scope: dict with request metadata (type, method, path, headers)
    # receive: async callable that yields event dicts (http.request, http.disconnect)
    # send:    async callable that accepts event dicts (http.response.start,
```

http.response.body)

```python
    ...
```

# Uvicorn invokes this for every request, all on the same event loop.

# Multiple requests run concurrently as separate coroutines.

## 5.2 async def vs def Routes

FastAPI lets you declare routes as either async def or plain def. This is not cosmetic. async def routes run directly on the event loop, sharing the single thread with every other request. Plain def routes are run in a threadpool (Starlette uses anyio.to_thread.run_sync), so they do not block the loop. This is FastAPI's escape hatch for blocking libraries.

```python
from fastapi import FastAPI
import requests
app = FastAPI()
```

# CORRECT - async route uses async HTTP client

```python
@app.get("/async")
async def fetch_async():
    async with httpx.AsyncClient() as client:
        r = await client.get("https://api.example.com/data")
    return r.json()
```

# CORRECT - sync route with sync library, runs in threadpool

```python
@app.get("/sync")
def fetch_sync():
    r = requests.get("https://api.example.com/data")

    return r.json()
```

# WRONG - async route with sync library, blocks the event loop!

```python
@app.get("/broken")
async def fetch_broken():
    r = requests.get("https://api.example.com/data")  # BLOCKS LOOP
    return r.json()
```

**The single most important FastAPI rule**

If you declare a route as async def, every I/O call inside it must be async. No exceptions. A single requests.get or time.sleep in an async route will block the entire event loop and every concurrent request will stall. This is the #1 production performance bug in FastAPI apps.

## 5.3 How Uvicorn Schedules Requests

When Uvicorn receives an HTTP request, it parses the headers and body on the event loop, then calls the ASGI app (FastAPI). FastAPI routes to your handler function. If the handler is async def, it is awaited directly on the loop - your code runs interleaved with every other in-flight request. If the handler is def, Starlette wraps it in anyio.to_thread.run_sync, which submits it to a thread pool (default 40 threads) and returns an awaitable. The loop is never blocked by sync handlers.

This means a single Uvicorn worker can handle thousands of concurrent async def requests (bounded by memory and downstream capacity), but only ~40 concurrent def requests. To scale sync handlers horizontally, you run multiple Uvicorn workers (one per CPU core typically) behind Gunicorn. Each worker is a separate process with its own event loop and threadpool.

## 5.4 Dependencies, Background Tasks, and Middleware

FastAPI's dependency injection system supports both async def and def dependencies; the same rule applies: async def deps run on the loop, def deps run in the threadpool. Dependencies are resolved sequentially by default; if you need parallel dependency resolution, use asyncio.gather inside an async def dependency. Background tasks (BackgroundTasks) run after the response is sent. They run on the same event loop as the request, so the same async/sync rule applies. For long-running work, do not use BackgroundTasks - use a real task queue (Celery, RQ, Dramatiq) with a separate worker process. BackgroundTasks are for fire-and-forget work that takes milliseconds: send a notification, write a log.

```python
from fastapi import FastAPI, BackgroundTasks
import asyncio
app = FastAPI()
async def send_notification(user_id: str, msg: str):
    await asyncio.sleep(0.1)   # pretend: POST to push service
    # ...
@app.post("/message/{user_id}")
async def send_message(user_id: str, body: dict, bg: BackgroundTasks):
    bg.add_task(send_notification, user_id, body["text"])

    return {"status": "queued"}  # response sent immediately; task runs after
```

# Chapter 6 — Scaling to 1 Million Concurrent Users

The "1 million concurrent users" interview question is a classic. It is not really about FastAPI or asyncio - it is about distributed systems. The interviewer wants to see whether you understand that no single process handles 1M connections, and whether you can reason about every layer of the stack: OS tuning, connection pooling, horizontal scaling, caching, queueing, and graceful degradation. This chapter gives you the complete architecture and the math behind it.

## 6.1 The Math: Little's Law

Before any architecture, do the math. Little's Law states: L = lambda * W, where L is the average number of concurrent requests in flight, lambda is the arrival rate (requests per second), and W is the average time each request spends in the system. For 1M concurrent connections with 100ms average response time, you can serve 1M / 0.1s = 10M requests per second. If your average response time is 1 second, you can only serve 1M RPS - and every connection is occupied for that whole second.

**Interview framing**

Start your answer with: "1M concurrent connections is not 1M RPS. The two are related by Little's Law:

```python
throughput = concurrency / latency. To handle 1M concurrent connections at 100ms p99 latency, I
```

need to sustain 10M RPS across the fleet." This immediately signals you think like a systems engineer.

## 6.2 The Architecture

No single machine handles 1M connections. The architecture is a layered fan-out: CDN edge (Cloudflare/CloudFront for static + cacheable content) -> global load balancer (anycast DNS or AWS Route 53 latency-based routing) -> regional L7 LB (ALB / nginx / Envoy) -> Uvicorn worker pool (autoscaling group, 50-100 instances) -> async application layer -> pooled data layer (DB primary + read replicas, Redis cluster, Elasticsearch). Each layer absorbs a different kind of load.

Layer Role Capacity per Unit How Many for 1M CDN edge (Cloudflare) Cache static + cacheable API responses; absorb geo-distributed load Tens of millions of connections ~300 global PoPs ( provider-managed) Global LB (anycast) Route users to nearest healthy region No connection limit (packet-level) ~5-10 regions Regional L7 LB (ALB) Terminate TLS, route to Uvicorn workers, health checks ~100k concurrent per ALB ~10 ALBs across regions

Layer Role Capacity per Unit How Many for 1M Uvicorn worker pool Run async app, handle websockets / HTTP ~10k-50k connections per worker (memory-bound) 50-100 workers per region, autoscaled Redis cluster Session, cache, rate limit, pub/sub ~100k ops/s per shard 10-30 shards DB primary (Postgres) Source of truth; writes ~10k writes/s with tuning 1 primary + 5-10 read replicas Queue (Kafka / NATS) Decouple write-heavy paths, absorb spikes Millions of messages/s per partition 3-5 broker clusters

## 6.3 OS-Level Tuning

A default Linux box cannot handle 1M connections. Several kernel parameters must be tuned. This is a realistic interview question - candidates who can list these from memory stand out.

```python
# /etc/sysctl.conf for high-concurrency servers
# Increase max file descriptors (each connection = 1 fd)
```

fs.file-max = 2000000

```python
# Increase ephemeral port range (for outbound connections)
net.ipv4.ip_local_port_range = 10000 65535
# Increase connection backlog (queue of pending accepts)
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
# Reuse sockets in TIME_WAIT
net.ipv4.tcp_tw_reuse = 1
# Increase network buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
# Apply: sudo sysctl -p
# Also raise ulimit in /etc/security/limits.conf:
# *  soft  nofile  2000000
# *  hard  nofile  2000000
```

## 6.4 Connection Pool Sizing

The classic mistake: 100 Uvicorn workers each open a 50-connection DB pool = 5000 DB connections, and Postgres falls over at 500. The pool size must be sized for the total fleet, not per worker. Use the formula:

```python
pool_size_per_worker = (max_db_connections * safety_factor) / total_workers. For 1M connections, you
```

typically need only ~10-20 DB connections per worker because most requests are served from cache or do not touch the DB at all.

```python
# SQLAlchemy async engine with conservative pool
from sqlalchemy.ext.asyncio import create_async_engine
engine = create_async_engine(
    "postgresql+asyncpg://user:pass@db:5432/app",
    pool_size=10,           # 10 connections per worker
    max_overflow=5,         # burst up to 15
    pool_pre_ping=True,     # detect stale connections
    pool_recycle=1800,      # recycle every 30 min
)
# If you have 100 workers: 100 * 10 = 1000 connections.
# Postgres max_connections should be >= 1200 to give headroom.
```

## 6.5 The Gunicorn + Uvicorn Worker Pattern

In production you almost always run Uvicorn under Gunicorn. Gunicorn is a process manager: it forks N worker processes (each running Uvicorn), monitors them, and restarts on crash. The standard invocation uses the uvicorn.workers.UvicornWorker class. The number of workers should be 2 * CPU_cores + 1 for CPU-light async apps; for very I/O-heavy apps, more workers helps because each has its own event loop and connection pool.

```python
# gunicorn_conf.py
import multiprocessing
import os
bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 10000   # max concurrent connections per worker
keepalive = 5
timeout = 30
graceful_timeout = 30
max_requests = 1000          # recycle workers to prevent leaks
max_requests_jitter = 50
preload_app = True
# Run: gunicorn -c gunicorn_conf.py app:app
```

## 6.6 Caching, Queueing, and Degradation

1M concurrent users cannot all hit Postgres. The real architecture is a series of caches: edge cache (Cloudflare cache rules) -> app cache (Redis, 5-30s TTL on read-heavy endpoints) -> DB. For write-heavy paths (likes, views, analytics), do not write synchronously to the DB - push events to Kafka or Redis Streams, and a worker drains them in batches. This decouples the write path from the user-facing latency budget. Finally, design for graceful degradation. When the system is at capacity, return cached or partial data rather than erroring. Implement circuit breakers around downstream calls (via circuitbreaker library or tenacity with a fallback). Set per-request timeouts aggressively (1-3s for user-facing, 100-500ms for downstream). A

request that times out at 2s and returns a fallback is far better than a request that hangs for 60s and consumes a connection.

# Chapter 7 — Common Async Pitfalls and Anti-Patterns

Async code looks deceptively similar to sync code, which hides subtle bugs. This chapter catalogs the pitfalls that come up most often in code review and in interviews. For each, you get the bad pattern, why it breaks, and the corrected version.

## 7.1 Blocking the Event Loop

The cardinal sin. Any blocking call inside an async route freezes every other concurrent request for the duration. The most common offenders are requests, time.sleep, psycopg2, file I/O without aiofiles, and CPU-heavy operations like regex on huge strings.

```python
# BAD - blocks the loop
@app.get("/broken")
async def broken():
    time.sleep(2)                                    # BLOCKS
    data = requests.get("https://slow-api.com").json()  # BLOCKS
    return data
# GOOD - non-blocking equivalents
@app.get("/fixed")
async def fixed():
    await asyncio.sleep(2)                           # yields
    async with httpx.AsyncClient() as client:
        r = await client.get("https://slow-api.com") # yields
    return r.json()
```

## 7.2 Async Soup: Making Everything Async

A common over-reaction is to make every function async, even pure computational ones with no I/O. This adds overhead (coroutine object creation, scheduling) with zero benefit. Pure functions that just transform data should remain synchronous; they can be called from async code without issue. The rule: only make a function async if it contains await.

## 7.3 Forgetting to Await gather() Result

```python
# BAD - gather returns an awaitable; not awaiting it runs nothing
asyncio.gather(fetch("a"), fetch("b"))   # nothing happens!
# GOOD
results = await asyncio.gather(fetch("a"), fetch("b"))
```

## 7.4 Over-Subscription

Firing 10,000 concurrent DB queries against a 100-connection pool does not make anything faster - the pool serialises them anyway, and you have added 10,000 coroutines worth of memory pressure. Use asyncio.Semaphore to bound concurrency to what the downstream can actually handle.

```python
# BAD - 10k concurrent queries on a 100-conn pool
async def fetch_all(ids):
    return await asyncio.gather(*[db.fetch(id) for id in ids])  # chaos
# GOOD - bounded concurrency
sem = asyncio.Semaphore(50)
async def fetch_one(id):
    async with sem:
        return await db.fetch(id)
async def fetch_all(ids):
    return await asyncio.gather(*[fetch_one(id) for id in ids])
```

## 7.5 Swallowing Exceptions in gather

By default, asyncio.gather raises the first exception encountered and discards the others - including their results. Use return_exceptions=True if you want all results (including exceptions as objects) so you can handle them yourself.

```python
# BAD - one failure loses all other results
results = await asyncio.gather(*tasks)
```

# GOOD - get every result, including exceptions as objects

```python
results = await asyncio.gather(*tasks, return_exceptions=True)
for r in results:
    if isinstance(r, Exception):
        log.error("task failed: %s", r)
    else:
        process(r)
```

## 7.6 Creating Tasks Without Tracking Them

asyncio.create_task(coro) schedules a coroutine, but if you discard the returned Task, the task can be garbage-collected before completion (Python 3.7+ keeps a weak ref). The fix: keep a reference, or use a TaskGroup (Python 3.11+) which manages lifecycle automatically.

```python
# Python 3.11+ - preferred
async with asyncio.TaskGroup() as tg:
    t1 = tg.create_task(fetch("a"))
    t2 = tg.create_task(fetch("b"))
```

# all tasks awaited here; any exception is raised

# Chapter 8 — Hands-on Tasks

Theory only sticks if you write code. The following five tasks progress from converting a sync route to async, all the way to designing a websocket tier for 100k connections. Try each one before reading the hints. Self-evaluate against the rubric. These tasks exercise every concept in chapters 1-7.

### Task 1 — Convert a Sync REST API to Async

Problem: You are given the following Flask-style sync endpoint that calls three external APIs sequentially. Convert it to a FastAPI async endpoint that calls them concurrently. Measure the latency improvement.

```python
# Original (sync, ~3s total)
from flask import Flask
import requests
app = Flask(__name__)
@app.route("/user/<uid>")
def get_user(uid):
    profile = requests.get(f"https://api.example.com/profile/{uid}").json()
    posts   = requests.get(f"https://api.example.com/posts/{uid}").json()
    friends = requests.get(f"https://api.example.com/friends/{uid}").json()
    return {"profile": profile, "posts": posts, "friends": friends}
```

Hints:

•  Use httpx.AsyncClient. Reuse a single client instance (create it once at startup, not per request). •  Schedule all three requests with asyncio.gather.

•  Add timeouts (2s connect, 5s total) and handle failures with return_exceptions=True. •  Measure with time.perf_counter() in a test script using asyncio.run.

Expected outcome: Sequential 3s -> concurrent ~1s. Same data shape, same response.

Self-evaluation rubric: (a) Did you reuse the client? (b) Did you add timeouts? (c) Did you handle partial failures (one API down should not crash the whole response)? (d) Did you measure? (e) Did you update the route signature to async def?

### Task 2 — Concurrent URL Fetcher with Rate Limiting

Problem: Write a CLI tool that fetches 1000 URLs from a file, but limits concurrency to 20 simultaneous requests and reports successes and failures. Print the total time and success rate.

Hints:

•  Use asyncio.Semaphore(20) inside a wrapper coroutine.

•  Use asyncio.gather(*tasks, return_exceptions=True).

•  Reuse a single httpx.AsyncClient with connection pooling (limits=httpx.Limits(max_connections=20)). •  Print progress with tqdm.asyncio.tqdm.gather if you want a progress bar.

### Task 3 — Fan-out to 5 Microservices with Timeout and Fallback

Problem: Build a FastAPI endpoint GET /aggregate/{product_id} that calls five microservices (inventory, pricing, reviews, recommendations, shipping) concurrently. If any service fails or takes more than 500ms, return a fallback value for that field. Total response time must never exceed 800ms.

Hints:

•  Use asyncio.wait_for(coro, timeout=0.5) per service.

•  Wrap each call in a try/except and return None or a default on timeout/error.

•  Use asyncio.gather(*wrapped, return_exceptions=False) - each wrapper handles its own errors. •  For extra credit: add a circuit breaker (e.g., circuitbreaker library) that short-circuits a service that has failed 5 times in a row.

### Task 4 — Background Task That Pushes Events to Redis

Problem: Add a POST /events endpoint that accepts an event JSON and queues it to Redis Streams (so a worker can consume later). The endpoint must respond in under 10ms. Then write a separate consumer script that reads from the stream and "processes" the event (just print it).

```python
# Skeleton
from fastapi import FastAPI, BackgroundTasks
from redis import asyncio as aioredis
import json
app = FastAPI()
redis = aioredis.from_url("redis://localhost:6379")
@app.on_event("startup")
async def startup():
    await redis.ping()
@app.post("/events")
async def post_event(event: dict):
    # Your code here: push to stream, respond fast
    ...
# consumer.py - separate process
async def consume():
    # Read from stream, process
    ...
```

Hints: Use XADD with redis.xadd("events", event). The producer should await redis.xadd(...) directly - it is already fast (sub-ms locally). Only offload to a real background task if the push itself is slow.

### Task 5 — Design a Websocket Tier for 100k Connections

Problem: Design (do not necessarily code) a system that maintains 100,000 concurrent websocket connections, broadcasts messages to all of them within 1 second, and survives the loss of any single node. Provide: architecture diagram (in text), Uvicorn config, broadcast mechanism, and failure modes.

Expected design points:

•  Per-node target: 10k-20k connections. Need 5-10 Uvicorn workers behind a sticky-session LB. •  Use redis.asyncio.pubsub or NATS for cross-node broadcast: each node subscribes to a "broadcast" channel; when any node publishes, all nodes receive and fan out to their local connections. •  Heartbeat every 30s; drop dead connections to free file descriptors.

•  Use asyncio.Queue per connection to decouple receive loop from send loop.

•  On node crash: LB detects via health check, routes new connections to survivors; existing clients reconnect with exponential backoff.

•  OS tuning per chapter 6.3; worker_connections=20000 in Uvicorn.

# Chapter 9 — 10 Scenario-Based Interview Questions with Answers

These ten questions test whether you can apply async concepts to real production situations. Each answer is structured the way a strong senior engineer would respond in an interview: identify the failure mode, propose a diagnostic plan, then a fix, then a prevention plan.

### Q1. Your FastAPI service suddenly has 5-second response times under load. Walk me through how you debug

"First, I would separate two possibilities: is the event loop being blocked, or is a downstream call slow? I would check the Uvicorn dashboard or a custom middleware that logs time.perf_counter() at request entry and exit. If the gap between receive and send is much larger than the sum of downstream call times, the loop is blocked. If the downstream times themselves are high, the problem is downstream.

To confirm a blocked loop, I would add an asyncio watchdog that schedules a task which sleeps 10ms and measures actual elapsed time. If actual elapsed exceeds 10ms by more than 1ms, the loop is blocked. I would then grep the codebase for blocking calls: requests, time.sleep, psycopg2, sync file I/O, or any CPU-heavy operation. pipdeptree can reveal if a dependency secretly makes blocking calls.

If the issue is downstream, I would check the DB pool: are connections exhausted? Is there a slow query? I would also check p99 latency of each downstream with histograms. The fix could be adding a cache, increasing pool size, splitting a slow query, or adding asyncio.Semaphore to bound concurrency. For prevention: I would add a CI check that uses asyncio.blocking.detect or aiohttp.test_utils to catch blocking calls in tests, and add structured logging that includes downstream latencies on every request."

### Q2. A user reports that your websocket endpoint disconnects every 30 seconds. How do you diagnose?

"The 30-second pattern is the classic signature of a proxy or load balancer idle timeout. Many default ALB / nginx configs close idle connections at 60s; Cloudflare at 100s; some corporate proxies at 30s. I would first reproduce by connecting directly to the Uvicorn process (bypass the LB) - if disconnects stop, the LB is the culprit.

Fix: configure the LB idle timeout to be longer than your application heartbeat interval. If LB timeout is 60s, send a heartbeat (ping frame or empty JSON) every 30s. Also configure Uvicorn's ws_max_size, timeout, and ping_interval settings. On nginx: proxy_read_timeout 3600s. On ALB: set idle timeout to 3600s. On the client side, implement reconnect with exponential backoff and jitter. The system should be designed to assume disconnects will happen - they are normal on mobile networks. Server-side, log disconnect events with reason codes so you can distinguish clean close (1000), abnormal (1006), and going-away (1001)."

### Q3. You need to call 100 APIs concurrently but only 20 can run at a time. How do you implement this?

"Use asyncio.Semaphore(20) inside a wrapper coroutine. The semaphore is created once outside the loop; each wrapper acquires it before doing work and releases it after. Then use asyncio.gather(*wrapped) to drive them all.

Critically, the semaphore must be acquired around the I/O call, not around the whole function, otherwise setup/teardown work counts against the limit. Also, the semaphore should be the only thing limiting concurrency - do not also use a fixed-size asyncio.Queue of work items, as that adds confusion. For 100 items, just gather 100 wrapped coroutines; the semaphore handles the bound.

Alternative: asyncio.BoundedSemaphore prevents accidental over-release. For more sophisticated rate limiting (e.g., 20 calls per second), use a token-bucket library like aiolimiter. Always wrap with

```python
return_exceptions=True and handle failures individually so one bad API does not lose the other 99 results."
```

### Q4. Your async DB driver occasionally throws 'another operation in progress' errors. Why?

"This is the classic shared-connection bug. Most async DB drivers (asyncpg, async SQLAlchemy) do not allow two simultaneous operations on the same underlying connection. If two coroutines share a connection object and both try to execute concurrently, the second throws InterfaceError: another operation is in progress. Root causes: (1) You created a single connection at app startup and reused it across requests without a pool. (2) You used async_session (SQLAlchemy) as a singleton instead of per-request. (3) You are using asyncio.gather with multiple queries that all use the same session.

Fix: use a connection pool (create_async_engine with pool_size), and acquire a fresh session per request via async with AsyncSession() as session:. Inside a single request, if you need parallel queries, acquire multiple sessions from the pool. Never share a session or connection across coroutines. Run a linter that flags module-level session creation; in tests, use pytest-asyncio fixtures that yield a fresh session per test."

### Q5. You have a CPU-heavy image resize endpoint in FastAPI. How do you implement it without blocking other requests?

"Two options. Option A: declare the route as plain def instead of async def. FastAPI runs sync routes in a threadpool (default 40 threads), so the resize runs on a worker thread while the event loop keeps handling other requests. This is the simplest and works for moderate load.

Option B: keep the route as async def (because the route also does async DB / cache work) and offload only the resize to a process pool via asyncio.get_running_loop().run_in_executor(ProcessPoolExecutor(), resize_fn, image_bytes). Use a ProcessPoolExecutor not a thread pool, because Python's GIL prevents true parallel CPU work in threads.

Option C, for production: do not resize on the request path at all. Push the upload to S3, publish a message to a queue, and have a worker (Celery / RQ) do the resize offline. Notify the client via websocket or polling when

done. This is the only design that scales to thousands of resizes per minute."

### Q6. Your team wants to switch a Flask app to FastAPI for performance. What do you warn them about?

"The migration is not just syntax. I would warn them about three things. First, every blocking library must be replaced: requests -> httpx, psycopg2 -> asyncpg or psycopg3, redis-py sync -> redis.asyncio. Forgetting even one will tank performance worse than the original Flask app.

Second, sync code running inside an async route is much worse than sync code in Flask - because in Flask each request has its own thread, but in async FastAPI a blocking call freezes every concurrent request. The team needs code review discipline and CI checks for blocking calls.

Third, async debugging is harder. Stack traces span multiple coroutines; exceptions surface far from their cause. The team needs to invest in structured logging (with correlation IDs), distributed tracing (OpenTelemetry), and async-friendly profilers (py-spy, scalene). If the team has not budgeted time for this learning curve, the migration will hurt velocity for months."

### Q7. How would you implement graceful shutdown of an async FastAPI service?

"Graceful shutdown means: stop accepting new requests, let in-flight requests finish, close DB and Redis pools, then exit. FastAPI/Starlette gives you lifespan handlers for this. I would use the lifespan context manager (not the deprecated on_event) to set up and tear down resources.

On SIGTERM (sent by Kubernetes, Docker, or systemd), Uvicorn stops accepting new connections and waits up to timeout seconds for in-flight requests. I set this to 30s. Inside the lifespan shutdown, I await engine.dispose() to close DB connections and await redis.close(). For long-running background tasks, I keep a set of task references and await asyncio.gather(*tasks) with a hard timeout.

Crucially, the LB health check must start returning 503 immediately on SIGTERM, so new traffic stops coming in while we drain. Kubernetes does this via the preStop hook and a terminationGracePeriodSeconds higher than Uvicorn's timeout. Without this, you get 502 errors during deploys."

### Q8. A route makes 3 DB queries, then 2 API calls, then writes to a queue. How do you optimize it?

"First, identify which steps are independent. The 3 DB queries: if they do not depend on each other, run them with asyncio.gather. The 2 API calls: same, run concurrently. The queue write: if it does not affect the response, make it a BackgroundTask so the response returns immediately.

Second, profile to find the dominant step. If one DB query takes 200ms and the others take 5ms, parallelising the small ones saves nothing - fix the slow one. Common fixes: add an index, rewrite the query, add a Redis cache for the result.

Third, consider caching at multiple layers. If the DB queries return slowly-changing data, cache them in Redis with a 30s TTL. If the API calls are idempotent, cache by argument hash. Cache hits are sub-ms and eliminate downstream load entirely. For the queue write, batching helps: if you have many requests per second, accumulate writes and flush every 100ms. This reduces Redis ops by 10-100x."

### Q9. You see 'RuntimeWarning: coroutine was never awaited' in your logs. What is happening?

"This warning means somewhere in the code, a coroutine function was called (returning a coroutine object) but the object was never awaited or scheduled as a task. The coroutine body never ran. The most common cause: forgetting await on an async function call.

Other causes: storing a coroutine in a variable and discarding it before awaiting; passing a coroutine where a regular value was expected (e.g., a Pydantic field that calls an async function as a default); an exception raised before the await line that prevents awaiting but the coroutine was already created.

To find the source: the warning includes the coroutine's __qualname__ and creation location. In Python 3.11+, set PYTHONASYNCIODEBUG=1 to get more detail. Fix by adding await, or by asyncio.create_task(coro) if it should run in the background. Add flake8-async to CI to catch these statically."

### Q10. Design an async rate limiter for a public API. 100 requests per minute per user, with 1M users.

"For 1M users at 100 r/min, the peak rate is ~17M r/s - far beyond a single Redis instance. The design must be distributed and use a fast counter. I would use Redis with a sliding-window algorithm: each user has a key rl:{user_id}:{minute_bucket} with INCR and EXPIRE 120s. Each request does one INCR; if the result is over 100, return 429.

For 1M users, the hot keys are user-specific so they spread evenly. Redis cluster with 10-30 shards handles the throughput. To reduce Redis load further, use a token-bucket in local memory per Uvicorn worker: each worker refills its bucket from Redis every 1s. This reduces Redis ops by 100x at the cost of slight over-admission (acceptable for most use cases).

For burst handling, use a weighted fair queueing or leaky-bucket instead of fixed window. Header responses should include X-RateLimit-Remaining and Retry-After for client politeness. On 429, return JSON with the limit and reset time. Monitor per-user error rates to catch abusers - if one user is consistently rate-limited, consider shadow-banning or escalating to a CAPTCHA challenge."

# Chapter 10 — 10 Conceptual Interview Questions with Answers

These ten conceptual questions test whether you understand async at the level of mechanisms and definitions. Each answer is a complete, interview-ready explanation. Read them aloud; if you cannot paraphrase each one, re-read the corresponding chapter.

### Q1. What is the difference between a coroutine, a task, and a future?

A coroutine is the result of calling an async def function - it is an object that wraps a function body but has not started executing yet. You must await it or schedule it for the body to run. A Task is a coroutine that the event loop has scheduled to run; it wraps the coroutine and tracks its state (pending, running, done, cancelled). Tasks run concurrently on the loop. A Future is a low-level container for a value that will be available later; Tasks are a subclass of Future. Futures are usually used by libraries to bridge callback-based code with async/await - you rarely create them directly.

In one sentence: a coroutine is "code that can be suspended", a task is "a coroutine that the loop is running", and a future is "a placeholder for a result that has not arrived yet".

### Q2. What does the async/await keyword actually do at runtime?

async def compiles the function as a coroutine function. Calling it returns a coroutine object without running the body. await expr evaluates expr to get an awaitable (coroutine, task, future, or anything with __await__), then yields control back to the event loop. The loop can run other coroutines. When the awaited operation completes (its __await__ raises StopIteration(value)), the await expression returns value and the current coroutine resumes from the line after await.

Under the hood this is built on the generator protocol - coroutines were originally implemented as generators before becoming a separate type. The key practical implication: every await is a suspension point, and code between two awaits runs atomically (no other coroutine can interrupt it).

### Q3. Why does async not speed up CPU-bound work?

Async concurrency is single-threaded. The event loop runs on one OS thread, and only one coroutine executes at a time. Async buys concurrency by overlapping I/O waits - while coroutine A waits for a DB response, the loop runs coroutine B. For CPU-bound work, there is no I/O wait to overlap; the coroutine is just computing. The loop cannot run anything else until that coroutine yields.

Worse, async adds overhead: each coroutine object costs memory, each await has scheduling cost. For pure CPU work, this overhead makes async slower than sync code. To parallelise CPU work in Python, you need ProcessPoolExecutor (multiple processes, each with its own GIL) or a native extension that releases the GIL (NumPy, Cython). Threads do not help for CPU work in Python because of the GIL.

### Q4. What is the difference between concurrency and parallelism?

Concurrency is about dealing with many things at once - structuring a program so multiple tasks can make progress without waiting on each other. Parallelism is about doing many things at once - executing multiple tasks simultaneously on different CPU cores.

Asyncio is concurrent but not parallel: it deals with many connections on one thread, but only one coroutine runs at any instant. Multiprocessing is both concurrent and parallel: each process runs on its own core. Threading in Python is concurrent (multiple threads can make progress) but not parallel for CPU work (GIL serialises execution), though it is parallel for I/O (the GIL is released during I/O waits). Rob Pike's quote: "Concurrency is about dealing with lots of things at once. Parallelism is about doing lots of things at once." Asyncio is the canonical example of concurrency without parallelism.

### Q5. How does FastAPI decide whether to run a route on the event loop or in a threadpool?

By the function signature. If the route handler is declared with async def, FastAPI awaits it directly on the event loop - it shares the single thread with every other async route. If the handler is declared with plain def, FastAPI (via Starlette) wraps it in anyio.to_thread.run_sync, which submits the function to a thread pool (default 40 threads) and returns an awaitable that the loop can await.

The same rule applies to dependencies, background tasks, and middleware. This dual-mode design lets you mix async and sync code freely - but you must be careful: a sync library called from an async def route will block the loop, while an async library called from a def route will throw RuntimeError: no running event loop (because the thread does not have one).

### Q6. What is ASGI and how does it differ from WSGI?

WSGI (Web Server Gateway Interface) is the synchronous spec for Python web apps: a WSGI app is a callable app(environ, start_response) that returns an iterable of byte strings. It handles one request at a time, blocking. Each request needs its own thread.

ASGI (Asynchronous Server Gateway Interface) is the async successor. An ASGI app is an async callable

```python
async def app(scope, receive, send) that handles the request by sending events. It supports long-lived
```

connections (websockets, HTTP/2 server push), streaming request and response bodies, and concurrent request handling on a single event loop. ASGI is to WSGI what async/await is to sync functions: the same idea, but non-blocking and capable of representing long-lived connections.

WSGI servers (Gunicorn, uWSGI) spawn threads/processes for concurrency; ASGI servers (Uvicorn, Daphne, Hypercorn) use event loops. ASGI is required for FastAPI, Starlette, Django Channels, and any websocket/HTTP2 workload.

### Q7. What is the GIL and how does it affect async Python?

The Global Interpreter Lock (GIL) is a mutex in CPython that ensures only one thread executes Python bytecode at a time. It exists because CPython's memory management (reference counting) is not thread-safe. The GIL is released around I/O operations (file, socket, sleep) and around extensions that explicitly release it

(NumPy, hashlib).

For async, the GIL is mostly irrelevant: asyncio is single-threaded, so there is no contention. The GIL matters when you try to use threads to parallelise CPU work - all threads compete for the GIL and end up running serially. This is why ProcessPoolExecutor (not ThreadPoolExecutor) is the right tool for CPU-bound work in async code. Python 3.13+ has an experimental no-GIL build (PEP 703); when mature, it will make threading useful for CPU work too.

### Q8. What is a coroutine suspension point and why does it matter?

A suspension point is any line in a coroutine where execution can pause and yield control to the event loop. In Python, every await is a suspension point. Code between two suspension points runs atomically - no other coroutine can interrupt it.

This matters for two reasons. First, correctness: if you read a shared variable, do work, then write it back, and there is no await in between, you have an implicit atomic section and no race condition. But if there is an await in between, another coroutine could modify the variable in the gap - a race. Second, performance: long stretches of code without await block the loop. If you must do CPU work, offload it via asyncio.to_thread or break it up with await asyncio.sleep(0) (which yields to the loop).

In interviews, mentioning suspension points signals you understand that async is cooperative multitasking - coroutines must voluntarily yield for other coroutines to run.

### Q9. What is the difference between asyncio.gather, asyncio.wait, and asyncio.TaskGroup?

asyncio.gather(*coros) schedules all coroutines concurrently and returns an awaitable that resolves to a list of results in input order. By default it raises the first exception; with return_exceptions=True, exceptions are returned as objects in the list. Simplest API for fan-out.

asyncio.wait(coros) is older and lower-level. It returns a tuple of (done, pending) sets of tasks. You process results as they complete; useful with timeout or return_when=FIRST_COMPLETED. Returns Tasks, not values, so you must call .result() on each.

asyncio.TaskGroup (Python 3.11+) is the modern, structured-concurrency API. You create a group inside an async with block, add tasks with tg.create_task(coro), and the block waits for all tasks on exit. If any task raises, all other tasks are cancelled and the exception propagates as an ExceptionGroup. This is the safest pattern and should be preferred in new code.

### Q10. Why does Uvicorn use a single event loop per worker process? Why not multiple loops per process?

The event loop is a single-threaded scheduler. Having multiple loops in one process would give no benefit - only one thread runs at a time due to the GIL, so the loops would just compete for CPU. It would also complicate coroutine ownership (a coroutine created on loop A cannot be awaited on loop B).

For parallelism, you need multiple processes - each with its own Python interpreter, its own GIL, its own event loop. Uvicorn supports this via Gunicorn workers or its own --workers N flag. Each worker is an independent process; the OS schedules them on different cores. They share the listen socket (via SO_REUSEPORT or pre-fork) and the OS distributes incoming connections across them.

This is also why connection pools are per-worker: each worker has its own pool. Total DB connections = pool_size * workers, which is the formula you must use to size DB max_connections. For 8 workers with

```python
pool_size=10, Postgres must allow at least 80 connections plus headroom.
```
