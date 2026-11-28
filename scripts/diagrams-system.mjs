/**
 * Curated Mermaid diagrams for the VeeraSystem track. Each is placed on the first Learn lesson (in course
 * order) whose title matches `where.topic` inside `where.module`, next to the section matching
 * `where.section`. Validated by scripts/validate-diagrams.mjs.
 *
 * The curriculum topic files already carry one diagram each; these cover the chapter deep dives, the
 * scaling playbook, low-level design and the real-world case studies, which only had ASCII art.
 */
export const SD_DIAGRAMS = [
  /* ------------------------------------------------------------ 01 fundamentals */
  {
    id: 'sd-interview-flow',
    where: { module: '01', topic: /^01\.[^:]+: Introduction to System Design/i, section: /what is system design/i, fallbackFirst: true },
    title: 'How a system design discussion flows',
    mermaid: `
flowchart LR
  r["1 · Requirements: functional + non-functional"] --> e["2 · Estimates: users, QPS, storage, bandwidth"]
  e --> a["3 · API and data model"]
  a --> h["4 · High-level design: boxes and arrows"]
  h --> d["5 · Deep dive: the 1–2 hardest parts"]
  d --> b["6 · Bottlenecks, failure modes, trade-offs"]
  b -->|"new constraint discovered"| h`,
    explain: `Every design follows the same arc. Pin down **what** the system must do and **how well** (latency, availability, scale) before drawing anything. Rough numbers tell you whether one database is enough or you need sharding, caching or a CDN. Only then sketch the components, go deep on the hardest part, and finish by naming bottlenecks and the trade-offs you chose.`,
  },
  {
    id: 'sd-estimation',
    where: { module: '01', topic: /fundamentals: principles, estimation/i, section: /back-of-the-envelope/i, fallbackFirst: true },
    title: 'Back-of-the-envelope estimation, step by step',
    mermaid: `
flowchart TD
  dau["100M daily active users"] --> req["× 10 requests per user per day = 1B requests/day"]
  req --> qps["÷ 86,400 s ≈ 12K requests/s average"]
  qps --> peak["× 2–3 for peak ≈ 30K requests/s"]
  dau --> wr["10% write: 10M new items/day"]
  wr --> st["× 1 KB each = 10 GB/day ≈ 3.6 TB/year"]
  peak --> cap{"Fits one machine?"}
  cap -->|"~10K QPS per app server"| n["≈ 3–5 app servers + headroom"]
  st --> db{"Fits one database?"}
  db -->|"multi-TB per year"| sh["Plan replicas now, sharding later"]`,
    explain: `Estimates are about orders of magnitude, not precision. Turn users into requests per second (a day has ~86,400 seconds; round to 100K), multiply for peak traffic, and turn writes into storage per year. The numbers decide the architecture: 30K QPS needs a few app servers behind a load balancer; terabytes per year means planning replication and eventually sharding.`,
  },
  {
    id: 'sd-building-blocks',
    where: { module: '01', topic: /building blocks/i, section: /introduction|load balancer/i, fallbackFirst: true },
    title: 'The standard building blocks and where each sits',
    mermaid: `
flowchart LR
  u["Users"] --> dns["DNS"]
  u --> cdn["CDN: static files, images, video"]
  u --> lb["Load balancer"]
  lb --> a1["App server"]
  lb --> a2["App server"]
  a1 --> c[("Cache: Redis")]
  a2 --> c
  a1 --> db[("Primary DB")]
  db --> rr[("Read replicas")]
  a2 --> q[["Message queue"]]
  q --> w["Workers: email, thumbnails, analytics"]
  w --> obj[("Object storage")]`,
    explain: `Most web systems are combinations of the same parts. **DNS** and the **CDN** sit at the edge; the **load balancer** spreads requests over stateless **app servers**; a **cache** absorbs hot reads before they reach the **database**, which scales reads with replicas; slow work goes onto a **queue** for **workers**; large files live in **object storage**. Learning when each block earns its place is most of system design.`,
  },

  /* ------------------------------------------------------------ 02 networking */
  {
    id: 'sd-api-styles',
    where: { module: '02', topic: /API Design — REST, GraphQL, gRPC/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'REST vs GraphQL vs gRPC — the same request three ways',
    mermaid: `
flowchart TB
  subgraph REST["REST: resources over HTTP"]
    r1["GET /users/42"] --> r2["GET /users/42/posts"]
    r2 --> r3["2 round trips, fixed response shapes"]
  end
  subgraph GQL["GraphQL: one endpoint, client picks fields"]
    g1["POST /graphql { user(id: 42) { name posts { title } } }"] --> g2["1 round trip, exactly the fields asked for"]
  end
  subgraph GRPC["gRPC: typed RPC over HTTP/2"]
    p1["UserService.GetUserWithPosts(id=42)"] --> p2["binary Protobuf, streaming, generated clients"]
  end`,
    explain: `**REST** models resources and is the default for public APIs: simple, cacheable, but clients may need several calls (under-fetching) or get fields they do not need (over-fetching). **GraphQL** lets the client ask for exactly the shape it needs in one call — great for mobile and complex UIs, harder to cache and rate-limit. **gRPC** is for service-to-service calls: a typed contract, compact binary messages and streaming over HTTP/2.`,
  },

  /* ------------------------------------------------------------ 03 databases */
  {
    id: 'sd-sql-nosql',
    where: { module: '03', topic: /SQL vs NoSQL Databases/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'Choosing a database by access pattern',
    mermaid: `
flowchart TD
  q{"What does the data and access look like?"} -->|"relations, joins, transactions"| sql["Relational: PostgreSQL, MySQL"]
  q -->|"lookups by key, huge scale"| kv["Key-value: Redis, DynamoDB"]
  q -->|"flexible JSON documents"| doc["Document: MongoDB"]
  q -->|"massive writes, time-ordered rows"| col["Wide-column: Cassandra, HBase"]
  q -->|"relationships are the query"| g["Graph: Neo4j"]
  q -->|"metrics over time"| ts["Time-series: InfluxDB, TimescaleDB"]
  sql --> acid["Strong consistency, ACID"]
  col --> ev["Tunable / eventual consistency, linear scale-out"]`,
    explain: `Start from the access pattern, not the brand. Money, orders and anything needing joins and transactions fits a **relational** database. Simple key lookups at huge scale fit **key-value** stores; evolving JSON fits **document** stores; write-heavy time-ordered data fits **wide-column** stores; friend-of-friend queries fit **graph** databases. Many real systems use several — that is *polyglot persistence*.`,
  },
  {
    id: 'sd-btree-index',
    where: { module: '03', topic: /Database Indexing/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'Why an index turns a full scan into a few page reads',
    mermaid: `
flowchart TD
  q["SELECT * FROM users WHERE email = 'a@x.com'"] --> c{"Index on email?"}
  c -->|no| scan["Full table scan: read all 10M rows"]
  c -->|yes| root["B-tree root page"]
  root --> inner["Internal page: a–m"]
  inner --> leaf["Leaf page: 'a@x.com' → row id 8812"]
  leaf --> row["Fetch 1 row from the heap"]
  scan --> slow["O(n): seconds"]
  row --> fast["O(log n): ~3–4 page reads, milliseconds"]`,
    explain: `Without an index the database must read every row to find a match. A **B-tree index** keeps the column sorted in a shallow tree, so a lookup touches only a handful of pages even for millions of rows. The price: every insert and update must also update each index, and indexes take space — so index the columns you filter, join and sort on, not everything.`,
  },
  {
    id: 'sd-sharding',
    where: { module: '03', topic: /Database Sharding/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'Sharding: routing each row to one database',
    mermaid: `
flowchart LR
  app["App"] --> router{"Shard router: hash(user_id) mod 4"}
  router -->|"0"| s0[("Shard 0")]
  router -->|"1"| s1[("Shard 1")]
  router -->|"2"| s2[("Shard 2")]
  router -->|"3"| s3[("Shard 3")]
  s0 -.-> hot["Celebrity user → hot shard"]
  router -.-> re["Adding shard 5 with mod N remaps most keys → use consistent hashing"]`,
    explain: `When one database can no longer hold the data or the writes, split rows across several databases by a **shard key**. A good key spreads load evenly and keeps a request's data on one shard (for example \`user_id\`). The risks: **hot shards** when one key is very popular, cross-shard queries and transactions, and painful resharding — which is why systems use consistent hashing or a lookup directory instead of plain \`mod N\`.`,
  },
  {
    id: 'sd-replication',
    where: { module: '03', topic: /Database Replication Strategies/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'Leader–follower replication and replication lag',
    mermaid: `
sequenceDiagram
  participant C as Client
  participant P as Primary
  participant R as Replica
  C->>P: UPDATE profile SET name = 'Ana'
  P-->>C: OK (committed)
  P--)R: ship WAL / binlog (async)
  C->>R: SELECT name (read from replica)
  R-->>C: old name — replica is 200 ms behind
  Note over C,R: read-your-writes: send this user's reads to the primary for a few seconds`,
    explain: `All writes go to the **primary**, which streams its change log to **replicas** that serve reads. With **asynchronous** replication the primary does not wait, so writes are fast but a replica can lag — a user may not see their own update. Fixes include reading your own writes from the primary, synchronous replication for one replica, or session-sticky reads. If the primary dies, a replica is promoted (failover).`,
  },
  {
    id: 'sd-db-scale-path',
    where: { module: '03', topic: /Database Design at Scale/i, section: /billions|sql vs nosql|^1\./i, fallbackFirst: true },
    title: 'The usual path for scaling a database',
    mermaid: `
flowchart LR
  a["1 · Indexes + query fixes"] --> b["2 · Connection pooling"]
  b --> c["3 · Cache hot reads"]
  c --> d["4 · Read replicas"]
  d --> e["5 · Vertical scale the primary"]
  e --> f["6 · Partition big tables"]
  f --> g["7 · Shard writes across databases"]`,
    explain: `Scale the cheapest way first. Most "the database is slow" problems are missing indexes or bad queries; then connection storms (fix with a pooler such as PgBouncer); then repeated reads (cache them). Read replicas and a bigger primary carry you surprisingly far. Partitioning and finally sharding come last because they make every query, migration and transaction harder.`,
  },

  /* ------------------------------------------------------------ 04 caching */
  {
    id: 'sd-cache-strategies',
    where: { module: '04', topic: /Caching Strategies/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'Where the cache sits in each strategy',
    mermaid: `
flowchart TB
  subgraph CA["Cache-aside (lazy loading)"]
    a1["App"] -->|"1 get"| c1[("Cache")]
    a1 -->|"2 miss → read"| d1[("DB")]
    a1 -->|"3 set"| c1
  end
  subgraph WT["Write-through"]
    a2["App"] -->|"write"| c2[("Cache")]
    c2 -->|"sync write"| d2[("DB")]
  end
  subgraph WB["Write-back"]
    a3["App"] -->|"write"| c3[("Cache")]
    c3 -.->|"async flush later"| d3[("DB")]
  end`,
    explain: `**Cache-aside**: the app checks the cache, reads the database on a miss and fills the cache — simple and the most common. **Write-through**: every write goes through the cache to the database, so the cache is always fresh but writes are slower. **Write-back**: writes land in the cache and are flushed later — very fast, but data is lost if the cache dies before flushing.`,
  },
  {
    id: 'sd-lru',
    where: { module: '04', topic: /LRU, LFU, TTL & write-through caches in Python/i, section: /LRUCache/i, fallbackFirst: true },
    title: 'LRU cache: hash map + doubly linked list',
    mermaid: `
flowchart LR
  subgraph MAP["Hash map: key → node (O(1) lookup)"]
    k1["A"] ~~~ k2["B"] ~~~ k3["C"]
  end
  subgraph LIST["Doubly linked list: most → least recently used"]
    h["head"] --> n1["C"] --> n2["A"] --> n3["B"] --> t["tail"]
  end
  g["get(A): move A to the front"] --> n2
  p["put(D) when full: evict the tail (B), insert D at the front"] --> n3`,
    explain: `An LRU cache needs two O(1) operations: find a key and know which key was used least recently. The **hash map** answers "where is key A?"; the **doubly linked list** keeps keys in recency order. On every get the node moves to the front; when the cache is full, the node at the tail is evicted. Python's \`OrderedDict\` with \`move_to_end\` implements exactly this.`,
  },

  /* ------------------------------------------------------------ 05 load balancing */
  {
    id: 'sd-scale-up-out',
    where: { module: '05', topic: /Horizontal vs Vertical Scaling/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'Scale up vs scale out',
    mermaid: `
flowchart LR
  subgraph V["Vertical: bigger machine"]
    s1["4 CPU / 16 GB"] -->|"upgrade"| s2["64 CPU / 512 GB"]
    s2 --> lim["Hard ceiling, single point of failure, downtime to resize"]
  end
  subgraph H["Horizontal: more machines"]
    lb["Load balancer"] --> m1["Server"]
    lb --> m2["Server"]
    lb --> m3["Server …"]
    m3 --> need["Needs stateless servers, shared session store, distributed data"]
  end`,
    explain: `**Vertical scaling** is the quickest fix — no code changes — but there is a largest machine, and it is still one point of failure. **Horizontal scaling** adds machines behind a load balancer and has no fixed ceiling, but servers must be **stateless** (sessions in Redis, files in object storage) and data must be shared or partitioned. Databases usually scale up first; app servers scale out.`,
  },
  {
    id: 'sd-lb-algorithms',
    where: { module: '05', topic: /^05\.[^:]+: Load Balancing — chapter overview$/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'Load-balancing algorithms side by side',
    mermaid: `
flowchart TD
  r["Incoming request"] --> alg{"Algorithm"}
  alg -->|"round robin"| rr["Next server in turn — equal servers, short requests"]
  alg -->|"weighted"| w["More traffic to bigger servers"]
  alg -->|"least connections"| lc["Server with fewest active requests — uneven request times"]
  alg -->|"IP / consistent hash"| ch["Same client or key → same server — caches, sessions"]
  alg -->|"least response time"| lt["Fastest healthy server"]
  rr --> hc["Only servers passing health checks are eligible"]
  lc --> hc
  ch --> hc`,
    explain: `**Round robin** is fine when servers and requests are alike. **Weighted** variants account for bigger machines. **Least connections** wins when some requests are slow (uploads, LLM calls) because it avoids piling work on a busy server. **Hashing** keeps a client or key on the same server, which helps local caches and sticky sessions. Whatever the algorithm, health checks remove failed servers from rotation.`,
  },
  {
    id: 'sd-lb-python',
    where: { module: '05', topic: /A load balancer in Python/i, section: /LoadBalancer/i, fallbackFirst: true },
    title: 'What the Python load balancer does per request',
    mermaid: `
flowchart LR
  req["request"] --> pick{"strategy"}
  pick -->|"round_robin"| i["index = (index + 1) mod healthy"]
  pick -->|"least_connections"| m["min(active_connections)"]
  pick -->|"weighted"| w["pick by weight"]
  i --> s["server.handle()"]
  m --> s
  w --> s
  s --> done["active_connections − 1 when finished"]
  hc["health_check()"] -.->|"mark unhealthy → skipped"| pick`,
    explain: `The \`LoadBalancer\` class keeps a list of \`Server\` objects with an active-connection counter and a healthy flag. Each request asks the chosen strategy for a server among the healthy ones, increments its counter while the request runs and decrements it afterwards. The health check flips servers out of (and back into) rotation.`,
  },

  /* ------------------------------------------------------------ 06 distributed */
  {
    id: 'sd-cap',
    where: { module: '06', topic: /CAP Theorem & Distributed Consistency/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'CAP: what happens during a network partition',
    mermaid: `
flowchart TD
  p["Network partition: node A cannot reach node B"] --> ch{"A write arrives at A. What now?"}
  ch -->|"choose Consistency (CP)"| cp["Reject or block the write until B is reachable"]
  ch -->|"choose Availability (AP)"| ap["Accept the write; reconcile with B later"]
  cp --> cpx["Banking, inventory, leader election — ZooKeeper, etcd, Spanner"]
  ap --> apx["Feeds, carts, likes — Cassandra, DynamoDB"]
  ap --> rec["Conflict resolution: last-write-wins, vector clocks, CRDTs"]`,
    explain: `Partitions are not optional in a distributed system, so the real choice is what to do *while* one is happening. A **CP** system refuses requests it cannot make consistent — correct but sometimes unavailable. An **AP** system keeps answering and repairs divergence afterwards — always up but sometimes stale. PACELC adds the everyday case: even without a partition you trade latency for consistency.`,
  },

  /* ------------------------------------------------------------ 07 messaging */
  {
    id: 'sd-queue-vs-stream',
    where: { module: '07', topic: /Message Queues & Event Streaming/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'Queue vs log: RabbitMQ-style vs Kafka-style',
    mermaid: `
flowchart LR
  subgraph Q["Queue (RabbitMQ, SQS)"]
    p1["Producer"] --> q1[["orders queue"]]
    q1 --> w1["Worker 1"]
    q1 --> w2["Worker 2"]
    w2 --> ack["ack → message deleted"]
  end
  subgraph L["Log (Kafka)"]
    p2["Producer"] --> t["topic: partitions 0,1,2 — retained for days"]
    t --> g1["Consumer group: billing (own offsets)"]
    t --> g2["Consumer group: analytics (own offsets)"]
  end`,
    explain: `A **queue** hands each message to one worker and deletes it once acknowledged — ideal for distributing jobs. A **log** such as Kafka appends events to partitions and keeps them; every consumer group reads at its own offset, so many independent systems can process the same events and replay history. Ordering is guaranteed only within a partition.`,
  },
  {
    id: 'sd-event-driven',
    where: { module: '07', topic: /^07\.[^:]+: Event-Driven Architecture/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'One event, many independent reactions',
    mermaid: `
flowchart LR
  o["Order service"] -->|"OrderPlaced"| bus[["Event bus / Kafka topic"]]
  bus --> pay["Payment service"]
  bus --> inv["Inventory service"]
  bus --> mail["Email service"]
  bus --> an["Analytics"]
  pay -->|"PaymentCaptured"| bus
  inv -->|"StockReserved"| bus`,
    explain: `In event-driven architecture services announce facts ("OrderPlaced") instead of calling each other. Any number of services can react without the producer knowing about them, so adding analytics or a new email does not touch the order service. The costs are eventual consistency, harder debugging (trace IDs help) and the need for idempotent consumers, because events can be delivered more than once.`,
  },

  /* ------------------------------------------------------------ 08 microservices */
  {
    id: 'sd-microservices',
    where: { module: '08', topic: /^08\.[^:]+: Microservices Architecture/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'A typical microservices layout',
    mermaid: `
flowchart LR
  c["Clients"] --> gw["API gateway: auth, rate limit, routing"]
  gw --> us["User service"]
  gw --> os["Order service"]
  gw --> ps["Product service"]
  us --> udb[("users DB")]
  os --> odb[("orders DB")]
  ps --> pdb[("products DB")]
  os -->|"events"| k[["Kafka"]]
  k --> ns["Notification service"]
  reg["Service discovery"] -.-> us
  reg -.-> os
  reg -.-> ps`,
    explain: `Each service owns one business capability **and its own database**, so teams deploy and scale independently. An **API gateway** is the single front door; **service discovery** lets services find each other; asynchronous events decouple workflows. The trade: network calls fail, data is spread out, and you need tracing, circuit breakers and good automation — a monolith is often the right start.`,
  },
  {
    id: 'sd-circuit-breaker',
    where: { module: '08', topic: /Architecture patterns: microservices, API gateway/i, section: /circuit breaker/i, fallbackFirst: true },
    title: 'Circuit breaker states',
    mermaid: `
stateDiagram-v2
  [*] --> Closed
  Closed --> Open: failures exceed threshold (e.g. 50% of last 20 calls)
  Open --> HalfOpen: after cool-down (e.g. 30 s)
  HalfOpen --> Closed: trial calls succeed
  HalfOpen --> Open: a trial call fails
  note right of Open
    calls fail fast with a fallback —
    the struggling service gets time to recover
  end note`,
    explain: `A circuit breaker wraps calls to a dependency. While **closed**, calls pass through and failures are counted. Past a threshold it **opens**: calls fail immediately (often with a cached or default answer) instead of piling up threads waiting on timeouts. After a cool-down it goes **half-open** and lets a few trial calls through to decide whether to close again.`,
  },

  /* ------------------------------------------------------------ 09 storage & data */
  {
    id: 'sd-cdn',
    where: { module: '09', topic: /CDN & Content Delivery/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'A CDN request: edge hit vs miss',
    mermaid: `
sequenceDiagram
  participant U as User in Mumbai
  participant E as Edge PoP (Mumbai)
  participant O as Origin (us-east-1)
  U->>E: GET /video/intro.mp4
  alt cache hit
    E-->>U: 200 from edge (~20 ms)
  else cache miss
    E->>O: fetch object
    O-->>E: 200 + Cache-Control max-age=86400
    E-->>U: 200 (~250 ms, cached for next users)
  end`,
    explain: `A CDN keeps copies of content in points of presence near users. A **hit** is served from the nearby edge in milliseconds; a **miss** goes to the origin once and is cached for everyone after. \`Cache-Control\` headers decide how long; versioned file names (\`app.3f9c.js\`) make invalidation trivial. CDNs also absorb traffic spikes and DDoS before they reach your servers.`,
  },
  {
    id: 'sd-data-pipeline',
    where: { module: '09', topic: /Data Pipelines, ETL\/ELT/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'Batch and streaming paths in a data platform',
    mermaid: `
flowchart LR
  src["Apps, DB change logs (CDC), clickstream"] --> k[["Kafka"]]
  k --> stream["Stream processing: Flink / Spark Streaming"]
  stream --> rt[("Real-time store: dashboards, alerts")]
  k --> lake[("Data lake: raw files on S3")]
  lake --> batch["Batch ETL / ELT: Spark, dbt"]
  batch --> wh[("Warehouse: Snowflake, BigQuery")]
  wh --> bi["BI, reports, ML features"]`,
    explain: `Events flow into Kafka once and feed two paths. The **streaming** path computes results within seconds for dashboards and alerts. The **batch** path lands raw data in a cheap lake and transforms it on a schedule into clean warehouse tables for reporting and ML. ELT — load first, transform inside the warehouse — is now the common default.`,
  },
  {
    id: 'sd-star-schema',
    where: { module: '09', topic: /Data Warehousing & Star Schema/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'Star schema: one fact table, many dimensions',
    mermaid: `
erDiagram
  FACT_SALES }o--|| DIM_DATE : "date_key"
  FACT_SALES }o--|| DIM_PRODUCT : "product_key"
  FACT_SALES }o--|| DIM_CUSTOMER : "customer_key"
  FACT_SALES }o--|| DIM_STORE : "store_key"
  FACT_SALES {
    int date_key
    int product_key
    int customer_key
    int store_key
    decimal amount
    int quantity
  }
  DIM_PRODUCT {
    int product_key
    string name
    string category
  }`,
    explain: `Analytics queries ask "how much, by what". The **fact table** stores the measurable events (each sale: amount, quantity) with foreign keys; **dimension tables** describe the "by what" (date, product, customer, store). Queries join the fact table to a few small dimensions and aggregate — a shape columnar warehouses execute very fast.`,
  },

  /* ------------------------------------------------------------ 10 security */
  {
    id: 'sd-token-bucket',
    where: { module: '10', topic: /Rate Limiting, Authentication & Security/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'Token bucket rate limiting',
    mermaid: `
flowchart LR
  refill["Refill: 10 tokens per second"] --> b[("Bucket: capacity 20")]
  r["Request"] --> chk{"Token available?"}
  b --> chk
  chk -->|"yes: take 1"| ok["Serve request"]
  chk -->|"no"| rej["429 Too Many Requests + Retry-After"]`,
    explain: `Each client has a bucket that refills at a steady rate up to a capacity. A request spends one token; an empty bucket means **429**. The capacity allows short bursts while the refill rate caps the long-run average. In a cluster the bucket lives in Redis (an atomic Lua script) so every server sees the same count.`,
  },
  {
    id: 'sd-auth-flows',
    where: { module: '10', topic: /^10\.[^:]+: Authentication & Authorization/i, section: /token-based|session-based|authentication vs/i, fallbackFirst: true },
    title: 'Session cookies vs JWT access tokens',
    mermaid: `
sequenceDiagram
  participant B as Browser
  participant A as API
  participant S as Session store
  B->>A: POST /login (password)
  alt session-based
    A->>S: save session id → user
    A-->>B: Set-Cookie: sid (HttpOnly)
    B->>A: request + cookie
    A->>S: look up sid
  else JWT
    A-->>B: signed access token (15 min) + refresh token
    B->>A: Authorization: Bearer token
    A->>A: verify signature locally — no lookup
  end`,
    explain: `**Sessions** keep state on the server: easy to revoke, but every request needs a session-store lookup. **JWTs** carry signed claims, so any server can verify them without a database call — good for scaling and microservices — but they cannot be revoked before expiry, which is why access tokens are short-lived and paired with refresh tokens. Authorization (what you may do) is checked after either.`,
  },

  /* ------------------------------------------------------------ 12 cloud */
  {
    id: 'sd-cicd',
    where: { module: '12', topic: /Deployment, DevOps & Production/i, section: /ci\/cd|docker/i, fallbackFirst: true },
    title: 'From git push to production',
    mermaid: `
flowchart LR
  push["git push"] --> ci["CI: lint, tests, security scan"]
  ci --> img["Build Docker image, tag with commit SHA"]
  img --> reg[("Container registry")]
  reg --> stg["Deploy to staging + smoke tests"]
  stg --> prod["Production rollout: rolling / blue-green / canary"]
  prod --> mon["Monitor errors and latency"]
  mon -->|"regression"| rb["Automatic rollback to previous image"]`,
    explain: `A pipeline turns every commit into the same immutable artifact — a container image tagged with the commit — and promotes it through environments. Tests gate each step; production rollouts are gradual so a bad build reaches few users, and monitoring triggers rollback to the previous image. Because the image never changes between stages, "works on staging" means something.`,
  },

  /* ------------------------------------------------------------ 13 scaling */
  {
    id: 'sd-evolution',
    where: { module: '13', topic: /Scalable Architecture Patterns/i, section: /evolution/i, fallbackFirst: true },
    title: 'How an architecture grows with its users',
    mermaid: `
flowchart TD
  s1["1K users: one server with app + DB"] --> s2["10K: separate DB server"]
  s2 --> s3["100K: load balancer + several stateless app servers"]
  s3 --> s4["1M: cache, read replicas, CDN, background workers"]
  s4 --> s5["10M: sharding, message queues, split into services"]
  s5 --> s6["100M+: multi-region, edge computing, dedicated platform teams"]`,
    explain: `Nobody starts with the 100M-user architecture. Each step fixes the bottleneck the previous step hit: separate the database, make app servers stateless so you can add more, cache and replicate reads, push static content to a CDN and slow work to queues, then shard and split services, and finally go multi-region. Over-engineering early costs as much as scaling late.`,
  },
  {
    id: 'sd-realtime',
    where: { module: '13', topic: /Caching, Message Queues & Real-Time/i, section: /websockets|sse|putting it all together/i, fallbackFirst: true },
    title: 'Polling vs SSE vs WebSockets',
    mermaid: `
sequenceDiagram
  participant C as Client
  participant S as Server
  Note over C,S: Polling — ask repeatedly
  C->>S: anything new?
  S-->>C: no
  Note over C,S: Server-Sent Events — one long HTTP response
  C->>S: GET /stream
  S-->>C: data chunk 1
  S-->>C: data chunk 2 (LLM tokens, notifications)
  Note over C,S: WebSocket — full duplex
  C->>S: upgrade
  S-->>C: message
  C->>S: message (chat, games, collaboration)`,
    explain: `**Polling** is simple but wastes requests and adds delay. **SSE** keeps one HTTP response open and streams server-to-client events — the standard way to stream LLM tokens and notifications, with automatic reconnect. **WebSockets** give a two-way channel for chat, multiplayer games and collaborative editing, at the cost of stateful connections the load balancer must handle.`,
  },
  {
    id: 'sd-graceful-degradation',
    where: { module: '13', topic: /Scaling to Millions of Users — The Complete Playbook/i, section: /graceful degradation/i, fallbackFirst: true },
    title: 'Graceful degradation under load',
    mermaid: `
flowchart TD
  load{"Load level"} -->|"normal"| full["Full experience"]
  load -->|"high"| d1["Turn off recommendations, serve cached feed"]
  load -->|"very high"| d2["Shed non-critical endpoints, queue writes"]
  load -->|"overload"| d3["Static fallback page, protect checkout and login only"]
  full --> m["Signals: p99 latency, error rate, queue depth"]
  m --> load`,
    explain: `When demand exceeds capacity, a well-built system gets *worse*, not *down*. Features are ranked by importance; as latency and error rates climb, the least important are switched off (feature flags), caches serve slightly stale data, writes are queued and non-critical traffic is shed — so the core path (login, checkout, playback) keeps working.`,
  },
  {
    id: 'sd-concurrency',
    where: { module: '13', topic: /Handling Millions of Concurrent Requests/i, section: /core problem|golden rules/i, fallbackFirst: true },
    title: 'Keep the request path fast — push heavy work to workers',
    mermaid: `
flowchart LR
  u["Upload / heavy request"] --> api["API: validate, store, enqueue"]
  api -->|"202 Accepted + job id"| u
  api --> q[["Queue"]]
  q --> w1["Worker pool: parse, embed, transcode"]
  w1 --> st[("Results store")]
  u -.->|"poll / SSE for status"| api
  w1 -.->|"autoscale on queue depth"| q`,
    explain: `The rule behind handling millions of requests: never do slow work inside the request. The API validates, stores the input, enqueues a job and returns **202** with a job id in milliseconds. A worker pool, scaled on queue depth, does the heavy lifting (parsing, embedding, transcoding), and the client follows progress by polling or SSE.`,
  },
  {
    id: 'sd-million-arch',
    where: { module: '13', topic: /Million-User Systems — Implementation/i, section: /complete architecture/i, fallbackFirst: true },
    title: 'A million-user architecture on one page',
    mermaid: `
flowchart LR
  u["Users"] --> cdn["CDN + WAF"]
  cdn --> lb["Load balancer"]
  lb --> api["API pods (autoscaled)"]
  api --> redis[("Redis: cache, sessions, rate limits")]
  api --> pg[("PostgreSQL primary + replicas")]
  api --> es[("Search index")]
  api --> k[["Kafka"]]
  k --> work["Workers: notifications, analytics, recommendations"]
  work --> s3[("Object storage")]
  api -.-> obs["Metrics, logs, traces"]`,
    explain: `Most million-user products share this shape: edge protection and caching, autoscaled stateless API pods, Redis for everything hot, a relational primary with replicas, a search index, and Kafka feeding background workers. Observability spans all of it so problems are found before users report them.`,
  },

  /* ------------------------------------------------------------ 14 low-level design */
  {
    id: 'sd-solid',
    where: { module: '14', topic: /SOLID principles & design patterns — visual guide/i, section: /solid/i, fallbackFirst: true },
    title: 'SOLID in one picture',
    mermaid: `
flowchart TD
  s["S · Single responsibility: one reason to change"] --> o["O · Open/closed: extend with new classes, don’t edit old ones"]
  o --> l["L · Liskov substitution: subclasses must honour the base contract"]
  l --> i["I · Interface segregation: small, focused interfaces"]
  i --> d["D · Dependency inversion: depend on abstractions, inject concrete classes"]
  d --> goal["Code that is easy to test, change and extend"]`,
    explain: `SOLID is five checks for class design. Split classes that change for different reasons; add behaviour by adding classes rather than editing \`if/elif\` chains; make sure subclasses can stand in for their parent; keep interfaces small so classes do not implement methods they cannot support; and depend on abstractions so implementations (a MySQL or a Postgres repository) can be swapped and mocked.`,
  },
  {
    id: 'sd-pattern-map',
    where: { module: '14', topic: /SOLID principles & design patterns — visual guide/i, section: /creational|pattern comparison/i },
    title: 'Which design pattern solves which problem',
    mermaid: `
flowchart LR
  c["Creational — how objects are made"] --> c1["Singleton · Factory · Abstract Factory · Builder · Prototype"]
  s["Structural — how objects are composed"] --> s1["Adapter · Decorator · Facade · Proxy"]
  b["Behavioral — how objects communicate"] --> b1["Observer · Strategy · Command · Chain of Responsibility · State · Template · Iterator"]`,
    explain: `Patterns fall into three families. **Creational** patterns control object creation (one shared instance, step-by-step construction, families of related objects). **Structural** patterns wrap or combine objects (adapt an old interface, add behaviour, simplify a subsystem, control access). **Behavioral** patterns organise communication (notify subscribers, swap algorithms, queue actions, pass requests along a chain).`,
  },

  /* ------------------------------------------------------------ 15 case studies */
  {
    id: 'sd-twitter-fanout',
    where: { module: '15', topic: /Twitter\/X — Social Media Feed System \(deep dive\)/i, section: /visual architecture|requirements/i, fallbackFirst: true },
    title: 'Timeline fan-out: on write for most users, on read for celebrities',
    mermaid: `
flowchart TD
  t["New tweet"] --> who{"Author has > 1M followers?"}
  who -->|"no"| fw["Fan-out on write: push tweet id into each follower's Redis timeline"]
  who -->|"yes"| fr["Store once; merge into timelines at read time"]
  rd["User opens home timeline"] --> pre["Read precomputed timeline from Redis"]
  pre --> merge["Merge in recent tweets from followed celebrities"]
  fw --> pre
  fr --> merge
  merge --> rank["Rank and return"]`,
    explain: `Reads outnumber writes enormously, so timelines are precomputed: when you tweet, your tweet id is pushed into every follower's cached timeline (**fan-out on write**). That breaks for accounts with millions of followers, so their tweets are fetched and merged at read time (**fan-out on read**). The hybrid keeps reads fast without million-write storms.`,
  },
  {
    id: 'sd-netflix',
    where: { module: '15', topic: /Netflix — Video Streaming Platform \(deep dive\)/i, section: /visual architecture|requirements/i, fallbackFirst: true },
    title: 'Netflix: control plane in the cloud, video from the edge',
    mermaid: `
flowchart LR
  dev["TV / phone app"] -->|"browse, login, play request"| aws["Control plane on AWS: API gateway, microservices, recommendations"]
  aws -->|"pick best edge + manifest"| dev
  dev -->|"video segments"| oca["Open Connect appliance inside the ISP"]
  ing["New title"] --> enc["Transcode to many bitrates and codecs"]
  enc --> oca`,
    explain: `Netflix splits the problem in two. Everything except video bytes — sign-in, browsing, recommendations, playback authorisation — runs as microservices in the cloud. The video itself is pre-encoded into many bitrates and pre-positioned on Netflix's own cache servers inside ISPs, so the player streams from a box a few hops away and switches bitrate as bandwidth changes.`,
  },
  {
    id: 'sd-uber',
    where: { module: '15', topic: /Uber — Ride-Sharing Platform \(deep dive\)/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'Uber: matching a rider with nearby drivers',
    mermaid: `
sequenceDiagram
  participant D as Driver app
  participant L as Location service
  participant R as Rider app
  participant M as Matching service
  loop every 4 s
    D->>L: lat/lng → geohash / H3 cell (in-memory index)
  end
  R->>M: request ride at pickup point
  M->>L: drivers in this cell + neighbours
  L-->>M: 12 candidates
  M->>M: rank by ETA
  M->>D: offer ride (15 s to accept)
  D-->>M: accept
  M-->>R: driver assigned, live ETA`,
    explain: `Drivers stream their location every few seconds into an in-memory geospatial index keyed by cells (geohash or H3). A ride request looks up the rider's cell and its neighbours, ranks candidates by ETA rather than straight-line distance, and offers the trip to one driver at a time. Location writes are huge but disposable, so they skip the main database.`,
  },
  {
    id: 'sd-youtube',
    where: { module: '15', topic: /YouTube — Video Streaming Platform \(deep dive\)/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'YouTube: the upload and processing pipeline',
    mermaid: `
flowchart LR
  up["Creator uploads (resumable, chunked)"] --> raw[("Raw object storage")]
  raw --> q[["Processing queue"]]
  q --> tr["Transcode: 144p … 4K, H.264 / VP9 / AV1"]
  q --> th["Thumbnails, captions, content checks"]
  tr --> seg[("Segmented files: HLS / DASH")]
  seg --> cdn["CDN"]
  cdn --> viewer["Viewer: adaptive bitrate player"]
  th --> meta[("Metadata DB + search index")]`,
    explain: `Uploads land in object storage, then a queue fans the work out: transcoding into many resolutions and codecs, thumbnails, captions and policy checks run in parallel on worker fleets. Output is cut into short segments for adaptive streaming and pushed to the CDN; the player picks the bitrate that the viewer's connection can sustain.`,
  },
  {
    id: 'sd-whatsapp',
    where: { module: '15', topic: /WhatsApp — Real-Time Messaging Platform \(deep dive\)/i, section: /visual|detailed/i, fallbackFirst: true },
    title: 'WhatsApp: delivering a message and its ticks',
    mermaid: `
sequenceDiagram
  participant A as Alice
  participant G as Gateway (persistent connection)
  participant S as Message store
  participant B as Bob
  A->>G: encrypted message
  G->>S: store until delivered
  G-->>A: ✓ sent
  alt Bob online
    G->>B: push over Bob's connection
    B-->>G: delivered
    G-->>A: ✓✓ delivered
  else Bob offline
    G->>B: push notification, deliver on reconnect
  end
  B-->>A: ✓✓ read (blue)`,
    explain: `Each phone keeps a long-lived connection to a gateway. A message is end-to-end encrypted on the device, stored server-side only until delivered, and pushed over the recipient's connection — or queued with a push notification if they are offline. Each hop sends an acknowledgement back, which is what the single, double and blue ticks show.`,
  },
  {
    id: 'sd-url-shortener-worked',
    where: { module: '15', topic: /Worked designs: URL shortener & Twitter/i, section: /url shortener/i, fallbackFirst: true },
    title: 'URL shortener: write and redirect paths',
    mermaid: `
flowchart LR
  c1["POST /shorten (long URL)"] --> api["API"]
  api --> id["ID generator: counter / Snowflake → base62 'aZ3k9Q'"]
  id --> db[("Key-value store: code → long URL")]
  c2["GET /aZ3k9Q"] --> cache[("Redis cache")]
  cache -->|"miss"| db
  cache --> r["301/302 redirect to long URL"]
  r -.-> an[["Click events → analytics"]]`,
    explain: `Writes generate a unique short code — a counter or Snowflake id encoded in base62 avoids collisions — and store code → URL in a key-value store. Redirects are read-heavy (often 100:1), so they are served from a cache. A 301 lets browsers cache the redirect; a 302 keeps every click visible for analytics, which is streamed asynchronously.`,
  },
  {
    id: 'sd-real-apps',
    where: { module: '15', topic: /How real apps scale/i, section: /key patterns summary|amazon/i, fallbackFirst: true },
    title: 'Patterns the big apps share',
    mermaid: `
flowchart TD
  a["Start as a monolith, split along team and domain lines"] --> b["Cache aggressively: CDN, Redis, in-process"]
  b --> c["Asynchronous by default: queues and events"]
  c --> d["Partition data by user / tenant / region"]
  d --> e["Design for failure: retries, circuit breakers, chaos testing"]
  e --> f["Measure everything: SLOs drive priorities"]`,
    explain: `Amazon, Instagram, Netflix, Slack, Stripe and Uber arrived at the same habits independently: grow out of a monolith rather than starting with dozens of services, cache at every layer, move work off the request path, partition data so no single machine holds everything, assume components fail, and let measured service levels — not guesses — decide what to fix next.`,
  },
]
