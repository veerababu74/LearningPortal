/**
 * VeeraSystem simulations — system-design mechanisms animated step by step.
 * Numbers in each step come from the small scenario the simulation states.
 */
import type { AgentSim } from '@/content/agents/visualizer'

const home = (m: string) => `/system-design/learn/${m}`

/* ===================================================== 1. a request's journey */

const JOURNEY: AgentSim = {
  id: 'sd-request-journey',
  title: 'The journey of one request: DNS → CDN → load balancer → app → cache → DB',
  framework: 'Web architecture',
  group: 'Foundations',
  module: '01',
  home: home('01'),
  level: 'Beginner',
  summary: 'Follow a user opening a product page through every building block, with the latency each hop adds.',
  scenario: 'A user in Delhi opens shop.example.com/product/42. The site runs in one region with a CDN, a load balancer, three app servers, Redis and PostgreSQL.',
  nodes: [
    { id: 'user', label: 'Browser', sub: 'Delhi', x: 70, y: 200, kind: 'user' },
    { id: 'dns', label: 'DNS', sub: 'resolver', x: 220, y: 70, kind: 'router' },
    { id: 'cdn', label: 'CDN edge', sub: 'static assets', x: 220, y: 330, kind: 'memory' },
    { id: 'lb', label: 'Load balancer', sub: 'least connections', x: 380, y: 200, kind: 'router' },
    { id: 'app', label: 'App server 2', sub: 'stateless', x: 540, y: 200, kind: 'service' },
    { id: 'cache', label: 'Redis', sub: 'product cache', x: 690, y: 90, kind: 'memory' },
    { id: 'db', label: 'PostgreSQL', sub: 'primary', x: 690, y: 320, kind: 'tool' },
  ],
  edges: [
    { id: 'u-dns', from: 'user', to: 'dns' },
    { id: 'u-cdn', from: 'user', to: 'cdn' },
    { id: 'u-lb', from: 'user', to: 'lb' },
    { id: 'lb-app', from: 'lb', to: 'app' },
    { id: 'app-c', from: 'app', to: 'cache' },
    { id: 'app-db', from: 'app', to: 'db' },
    { id: 'db-app', from: 'db', to: 'app', bend: 30 },
    { id: 'app-u', from: 'app', to: 'user', bend: 60 },
  ],
  code: `@app.get("/product/{pid}")
def product(pid: int):
    key = f"product:{pid}"
    cached = redis.get(key)                       # ~1 ms
    if cached:
        return json.loads(cached)
    row = db.fetch_one("SELECT * FROM products WHERE id = %s", pid)   # ~15 ms
    redis.set(key, json.dumps(row), ex=300)       # cache for 5 minutes
    return row`,
  steps: [
    { title: 'Resolve the name', edge: 'u-dns', packet: 'shop.example.com?', narration: 'The browser asks DNS for the IP of shop.example.com. A cached answer costs ~0 ms; a cold lookup ~20–50 ms.', state: { total_ms: '30', hop: 'DNS', cache: '—', db_queries: '0' }, changed: ['total_ms', 'hop'], log: 'DNS → 203.0.113.10 (30 ms)' },
    { title: 'Static files from the edge', edge: 'u-cdn', packet: 'app.js, logo.png', narration: 'JavaScript, CSS and images come from a CDN edge in Delhi — 15 ms instead of ~200 ms from the origin in Virginia.', state: { total_ms: '45', hop: 'CDN hit', cache: '—', db_queries: '0' }, changed: ['total_ms', 'hop'], log: 'CDN edge hit: static assets (15 ms)', tone: 'ok' },
    {
      title: 'API call hits the load balancer',
      edge: 'u-lb',
      packet: 'GET /product/42',
      narration: 'The dynamic API request travels to the region (~90 ms round trip). The load balancer terminates TLS and picks app server 2, which has the fewest active connections.',
      state: { total_ms: '135', hop: 'Load balancer', cache: '—', db_queries: '0' },
      changed: ['total_ms', 'hop'],
      log: 'LB → app-2 (fewest connections)',
      predict: { question: 'Why can the load balancer send this user to any app server, even one they never used before?', options: ['Sticky sessions are always on', 'The app servers are stateless — sessions and data live in Redis and the database', 'All servers share one CPU', 'DNS pins the user to a server'], answer: 1, explain: 'Stateless servers keep no per-user memory, so any server can handle any request. That is what makes horizontal scaling and failover easy.' },
    },
    { title: 'App server runs the handler', edge: 'lb-app', packet: 'pid=42', narration: 'App server 2 builds the cache key product:42 and checks Redis first.', hl: ['key = f"product:{pid}"'], log: 'handler product(42)' },
    { title: 'Cache miss', edge: 'app-c', packet: 'GET product:42', node: 'cache', tone: 'warn', narration: 'Redis has no entry (first visit after a deploy). A miss costs ~1 ms.', state: { total_ms: '137', hop: 'Redis', cache: 'miss', db_queries: '0' }, changed: ['total_ms', 'cache'], hl: ['cached = redis.get(key)'], log: 'Redis miss product:42' },
    { title: 'Query the database', edge: 'app-db', packet: 'SELECT … id = 42', node: 'db', narration: 'PostgreSQL finds the row through the primary-key index in ~15 ms.', state: { total_ms: '152', hop: 'PostgreSQL', cache: 'miss', db_queries: '1' }, changed: ['total_ms', 'db_queries'], hl: ['row = db.fetch_one'], log: 'DB query 15 ms' },
    { title: 'Fill the cache', edge: 'db-app', packet: 'row', node: 'app', narration: 'The app stores the row in Redis for 5 minutes, so the next thousands of visitors skip the database.', state: { total_ms: '153', hop: 'App', cache: 'filled (TTL 300 s)', db_queries: '1' }, changed: ['cache'], hl: ['redis.set(key, json.dumps(row), ex=300)'], log: 'SET product:42 EX 300' },
    { title: 'Respond', edge: 'app-u', packet: '200 OK JSON', node: 'user', tone: 'ok', narration: 'About 200 ms end to end. The next visitor gets a cache hit: no database query and ~45 ms less.', state: { total_ms: '~200', hop: 'Browser', cache: 'filled (TTL 300 s)', db_queries: '1' }, changed: ['total_ms', 'hop'], log: 'response ~200 ms; next request will hit Redis' },
  ],
  match: /what is system design|introduction to system design|building blocks|fundamentals: principles|latency|architecture patterns at a glance/i,
  takeaways: ['Static content belongs on a CDN close to the user.', 'Stateless app servers let the load balancer pick any server.', 'A cache in front of the database removes repeated reads.'],
}

/* ===================================================== 2. cache-aside */

const CACHE_ASIDE: AgentSim = {
  id: 'sd-cache-aside',
  title: 'Cache-aside: read miss, hit, write-invalidate and the stale race',
  framework: 'Redis',
  group: 'Caching',
  module: '04',
  home: home('04'),
  level: 'Intermediate',
  summary: 'Watch the cache fill on a miss, serve hits, get invalidated on a write — and see the race that serves stale data.',
  scenario: 'A user profile service: profiles live in PostgreSQL, Redis caches them for 10 minutes. 95% of traffic is reads.',
  nodes: [
    { id: 'client', label: 'Clients', sub: 'reads + writes', x: 90, y: 200, kind: 'user' },
    { id: 'app', label: 'Profile service', sub: 'cache-aside logic', x: 330, y: 200, kind: 'service' },
    { id: 'cache', label: 'Redis', sub: 'TTL 600 s', x: 600, y: 80, kind: 'memory' },
    { id: 'db', label: 'PostgreSQL', sub: 'source of truth', x: 600, y: 320, kind: 'tool' },
  ],
  edges: [
    { id: 'c-a', from: 'client', to: 'app' },
    { id: 'a-c', from: 'app', to: 'cache', bend: -20 },
    { id: 'c-a2', from: 'cache', to: 'app', bend: -20 },
    { id: 'a-db', from: 'app', to: 'db', bend: -20 },
    { id: 'db-a', from: 'db', to: 'app', bend: -20 },
    { id: 'a-cl', from: 'app', to: 'client', bend: 40 },
  ],
  code: `def get_profile(uid):
    data = redis.get(f"user:{uid}")
    if data:                                   # hit
        return json.loads(data)
    row = db.query("SELECT * FROM users WHERE id=%s", uid)   # miss
    redis.set(f"user:{uid}", json.dumps(row), ex=600)
    return row

def update_profile(uid, fields):
    db.execute("UPDATE users SET ... WHERE id=%s", uid)      # 1. write DB
    redis.delete(f"user:{uid}")                               # 2. invalidate`,
  steps: [
    { title: 'Read: cache miss', edge: 'a-c', packet: 'GET user:7', node: 'cache', tone: 'warn', narration: 'The first read for user 7 misses Redis.', state: { redis_user7: '(empty)', db_user7: 'name=Ana', hits: '0', misses: '1' }, changed: ['misses'], hl: ['data = redis.get(f"user:{uid}")'], log: 'miss user:7' },
    { title: 'Load from the database', edge: 'a-db', packet: 'SELECT', node: 'db', narration: 'The service reads the row from PostgreSQL.', hl: ['row = db.query'], log: 'DB read user 7' },
    { title: 'Back-fill the cache', edge: 'db-a', packet: 'name=Ana', node: 'app', narration: 'The row is written to Redis with a 600-second TTL and returned.', state: { redis_user7: 'name=Ana (TTL 600)', db_user7: 'name=Ana', hits: '0', misses: '1' }, changed: ['redis_user7'], hl: ['redis.set(f"user:{uid}", json.dumps(row), ex=600)'], log: 'SET user:7 EX 600' },
    { title: 'Next reads hit', edge: 'c-a2', packet: 'name=Ana', node: 'app', tone: 'ok', narration: 'The next 99 reads are served from Redis in ~1 ms each — the database is not touched.', state: { redis_user7: 'name=Ana (TTL 600)', db_user7: 'name=Ana', hits: '99', misses: '1' }, changed: ['hits'], hl: ['if data:'], log: '99 hits — hit rate 99%' },
    {
      title: 'Write: update the database',
      edge: 'a-db',
      packet: 'UPDATE name=Ana Rao',
      node: 'db',
      narration: 'Ana changes her name. The service writes the database first.',
      state: { redis_user7: 'name=Ana (TTL 600)', db_user7: 'name=Ana Rao', hits: '99', misses: '1' },
      changed: ['db_user7'],
      hl: ['db.execute("UPDATE users'],
      log: 'DB write user 7',
      predict: { question: 'Redis still holds name=Ana. What should the service do with the cache entry?', options: ['Nothing — the TTL will fix it in 10 minutes', 'Delete it, so the next read reloads the fresh row', 'Write the new value into Redis before the database', 'Flush the whole cache'], answer: 1, explain: 'Deleting (invalidating) is the safe default: the next read misses and loads the fresh row. Waiting for the TTL serves stale data; writing the cache first risks caching a value the database rejected.' },
    },
    { title: 'Invalidate', edge: 'a-c', packet: 'DEL user:7', node: 'cache', tone: 'ok', narration: 'The entry is deleted. The next read misses and loads "Ana Rao".', state: { redis_user7: '(empty)', db_user7: 'name=Ana Rao', hits: '99', misses: '1' }, changed: ['redis_user7'], hl: ['redis.delete(f"user:{uid}")'], log: 'DEL user:7' },
    { title: 'The stale race', edge: 'db-a', packet: 'old row', node: 'app', tone: 'bad', narration: 'Rare but real: a slow reader loaded the OLD row just before the update, then sets it into Redis right after the DEL. Redis now holds stale data until the TTL expires.', state: { redis_user7: 'name=Ana  ← stale!', db_user7: 'name=Ana Rao', hits: '99', misses: '2' }, changed: ['redis_user7', 'misses'], log: 'slow reader re-cached the old row' },
    { title: 'Mitigations', edge: 'a-c', packet: 'DEL again after 500 ms', node: 'cache', tone: 'ok', narration: 'Fixes: a short TTL as the safety net, a delayed second delete, or version numbers so an older value never overwrites a newer one.', state: { redis_user7: '(empty)', db_user7: 'name=Ana Rao', hits: '99', misses: '2' }, changed: ['redis_user7'], log: 'delayed double delete' },
  ],
  match: /cache[- ]aside|why cache|caching strategies|cache invalidation|read through|write through|caching$|redis \(caching|caching, message queues/i,
  takeaways: ['On a read miss, load from the database and fill the cache.', 'On a write, update the database, then delete the cache entry.', 'Keep a TTL as a safety net against races.'],
}

/* ===================================================== 3. consistent hashing */

const RING: AgentSim = {
  id: 'sd-consistent-hashing',
  title: 'Consistent hashing: adding a server moves only a slice of keys',
  framework: 'Distributed caching',
  group: 'Scaling',
  module: '05',
  home: home('05'),
  level: 'Intermediate',
  summary: 'Compare mod-N hashing with a hash ring when a fourth cache server joins, and see virtual nodes even out the load.',
  scenario: 'Three cache servers hold 1,200,000 keys. Traffic grows and a fourth server, D, is added.',
  nodes: [
    { id: 'client', label: 'Client', sub: 'hash(key)', x: 90, y: 200, kind: 'user' },
    { id: 'ring', label: 'Hash ring', sub: '0 … 2³²', x: 330, y: 200, kind: 'router' },
    { id: 'a', label: 'Server A', sub: 'arc 0°–120°', x: 600, y: 60, kind: 'memory' },
    { id: 'b', label: 'Server B', sub: 'arc 120°–240°', x: 640, y: 200, kind: 'memory' },
    { id: 'c', label: 'Server C', sub: 'arc 240°–360°', x: 600, y: 340, kind: 'memory' },
    { id: 'd', label: 'Server D', sub: 'new', x: 380, y: 360, kind: 'service' },
  ],
  edges: [
    { id: 'cl-r', from: 'client', to: 'ring' },
    { id: 'r-a', from: 'ring', to: 'a' },
    { id: 'r-b', from: 'ring', to: 'b' },
    { id: 'r-c', from: 'ring', to: 'c' },
    { id: 'r-d', from: 'ring', to: 'd' },
    { id: 'b-d', from: 'b', to: 'd', bend: 40 },
  ],
  code: `import bisect, hashlib

def h(s): return int(hashlib.md5(s.encode()).hexdigest(), 16) % 2**32

class Ring:
    def __init__(self, nodes, vnodes=100):
        self.points = sorted((h(f"{n}#{i}"), n) for n in nodes for i in range(vnodes))
    def node_for(self, key):
        i = bisect.bisect(self.points, (h(key), ""))   # first point clockwise
        return self.points[i % len(self.points)][1]

# naive alternative: servers[h(key) % len(servers)]`,
  steps: [
    { title: 'Hash the key onto the ring', edge: 'cl-r', packet: 'user:42 → 205°', narration: 'The key is hashed to a position on a circle of 2³² points. Servers are hashed onto the same circle.', state: { servers: 'A, B, C', keys_per_server: '400K each', keys_moved: '0', method: 'hash ring' }, changed: ['servers'], hl: ['def h(s)'], log: 'h("user:42") = 205°' },
    { title: 'Walk clockwise to a server', edge: 'r-b', packet: 'user:42', narration: 'The key belongs to the first server clockwise from its position: 205° falls in B’s arc.', hl: ['i = bisect.bisect(self.points'], log: 'user:42 → B' },
    {
      title: 'Server D joins',
      edge: 'r-d',
      packet: 'D at 180°',
      node: 'd',
      narration: 'D is hashed to 180°, splitting B’s arc.',
      state: { servers: 'A, B, C, D', keys_per_server: 'A 400K · B 200K · C 400K · D 200K', keys_moved: '?', method: 'hash ring' },
      changed: ['servers', 'keys_per_server'],
      log: 'D added at 180°',
      predict: { question: 'With mod-N hashing (hash % servers), going from 3 to 4 servers remaps roughly what share of keys?', options: ['25%', 'About 75%', 'None', 'Exactly the keys of one server'], answer: 1, explain: 'With mod N, a key stays put only if hash % 3 equals hash % 4 — about 1 in 4 keys. Roughly 75% move, which empties caches and floods the database.' },
    },
    { title: 'Only one slice moves', edge: 'b-d', packet: '200K keys', node: 'd', tone: 'ok', narration: 'Only keys between 120° and 180° move from B to D — 200,000 of 1.2 million (~17%). A and C are untouched.', state: { servers: 'A, B, C, D', keys_per_server: 'A 400K · B 200K · C 400K · D 200K', keys_moved: '200K (17%)', method: 'hash ring' }, changed: ['keys_moved'], log: 'moved 200K keys B → D; mod-N would move ~900K' },
    { title: 'Uneven arcs → virtual nodes', edge: 'r-a', packet: '100 points per server', node: 'ring', narration: 'With one point per server the arcs are uneven (B and D got half of A). Placing ~100 virtual points per server spreads every server around the ring, so each holds ~25% and a joining server takes a little from everyone.', state: { servers: 'A, B, C, D', keys_per_server: '~300K each (±5%)', keys_moved: '~300K (25%) — the minimum', method: 'ring + 100 vnodes' }, changed: ['keys_per_server', 'keys_moved', 'method'], hl: ['for i in range(vnodes)'], log: 'vnodes even out load: ~300K per server', tone: 'ok' },
  ],
  match: /consistent hash|sharding|partitioning|distributed cache|load balanc|horizontal scal/i,
  takeaways: ['mod-N hashing remaps most keys when the server count changes.', 'A hash ring moves only the keys in the new server’s arc.', 'Virtual nodes even out the load and the movement.'],
}

/* ===================================================== 4. load balancing */

const LB: AgentSim = {
  id: 'sd-load-balancing',
  title: 'Round robin vs least connections, and a failed health check',
  framework: 'NGINX / HAProxy',
  group: 'Scaling',
  module: '05',
  home: home('05'),
  level: 'Beginner',
  summary: 'See why round robin piles slow requests on one server, how least connections avoids it, and how health checks remove a dead server.',
  scenario: 'Three identical servers. Most requests take 50 ms, but report exports take 8 seconds.',
  nodes: [
    { id: 'users', label: 'Requests', sub: '600 req/s', x: 90, y: 200, kind: 'user' },
    { id: 'lb', label: 'Load balancer', sub: 'algorithm', x: 320, y: 200, kind: 'router' },
    { id: 's1', label: 'Server 1', x: 590, y: 70, kind: 'service' },
    { id: 's2', label: 'Server 2', x: 620, y: 200, kind: 'service' },
    { id: 's3', label: 'Server 3', x: 590, y: 330, kind: 'service' },
  ],
  edges: [
    { id: 'u-lb', from: 'users', to: 'lb' },
    { id: 'lb-1', from: 'lb', to: 's1' },
    { id: 'lb-2', from: 'lb', to: 's2' },
    { id: 'lb-3', from: 'lb', to: 's3' },
  ],
  code: `upstream app {
    least_conn;                     # instead of the default round robin
    server 10.0.0.1:8000 max_fails=3 fail_timeout=10s;
    server 10.0.0.2:8000 max_fails=3 fail_timeout=10s;
    server 10.0.0.3:8000 max_fails=3 fail_timeout=10s;
}
server {
    location / { proxy_pass http://app; }
    location /healthz { return 200; }
}`,
  steps: [
    { title: 'Round robin', edge: 'lb-1', packet: 'export (8 s)', narration: 'Round robin sends requests in turn: 1, 2, 3, 1, 2, 3… By chance every third request is a slow export, and they all land on server 1.', state: { algorithm: 'round robin', s1_active: '24', s2_active: '3', s3_active: '3', healthy: '1, 2, 3' }, changed: ['algorithm', 's1_active'], log: 'round robin: server 1 has 24 active requests', tone: 'warn' },
    {
      title: 'Server 1 drowns',
      edge: 'lb-1',
      packet: 'GET /home',
      node: 's1',
      tone: 'bad',
      narration: 'Fast requests queued behind exports on server 1 now take 2 seconds, while servers 2 and 3 sit idle.',
      state: { algorithm: 'round robin', s1_active: '41', s2_active: '3', s3_active: '2', healthy: '1, 2, 3' },
      changed: ['s1_active'],
      log: 'p99 latency 2.1 s on server 1',
      predict: { question: 'Which algorithm would avoid this pile-up?', options: ['Random', 'Least connections — send each request to the server with the fewest active requests', 'Round robin with more servers', 'IP hash'], answer: 1, explain: 'Least connections looks at current load, so long-running requests stop attracting more work. Random and round robin ignore how busy each server is.' },
    },
    { title: 'Switch to least connections', edge: 'lb-2', packet: 'GET /home', node: 's2', tone: 'ok', narration: 'Each new request goes to the server with the fewest active connections. Exports spread out and fast requests flow around them.', state: { algorithm: 'least connections', s1_active: '6', s2_active: '6', s3_active: '7', healthy: '1, 2, 3' }, changed: ['algorithm', 's1_active', 's2_active', 's3_active'], hl: ['least_conn;'], log: 'least_conn: 6 / 6 / 7 active' },
    { title: 'Server 3 crashes', edge: 'lb-3', packet: 'health check', node: 's3', tone: 'bad', narration: 'Server 3 runs out of memory. Three health checks in a row fail.', state: { algorithm: 'least connections', s1_active: '6', s2_active: '6', s3_active: 'down', healthy: '1, 2, 3 (failing)' }, changed: ['s3_active', 'healthy'], hl: ['max_fails=3 fail_timeout=10s'], log: 'server 3 failed 3 checks' },
    { title: 'Traffic routes around it', edge: 'lb-1', packet: 'GET /home', node: 's1', tone: 'ok', narration: 'The load balancer removes server 3 from rotation; servers 1 and 2 absorb the traffic. When server 3 passes checks again it rejoins automatically.', state: { algorithm: 'least connections', s1_active: '10', s2_active: '9', s3_active: 'out of rotation', healthy: '1, 2' }, changed: ['s1_active', 's2_active', 's3_active', 'healthy'], log: 'server 3 out of rotation — no user errors' },
  ],
  match: /load balanc|round robin|least connections|weighted round|health checks|nginx|haproxy|layer [47]/i,
  takeaways: ['Round robin ignores how busy a server is.', 'Least connections handles uneven request times.', 'Health checks take failed servers out of rotation automatically.'],
}

/* ===================================================== 5. token bucket */

const TOKEN: AgentSim = {
  id: 'sd-token-bucket',
  title: 'Token bucket rate limiter in Redis',
  framework: 'Redis + Lua',
  group: 'Security & reliability',
  module: '10',
  home: home('10'),
  level: 'Intermediate',
  summary: 'Watch a burst drain the bucket, requests get 429, and tokens refill over time — shared by every API server through Redis.',
  scenario: 'Free-tier API keys: capacity 10 tokens, refilled at 1 token per second. A client sends a burst of 12 requests.',
  nodes: [
    { id: 'client', label: 'API client', sub: 'free tier', x: 90, y: 200, kind: 'user' },
    { id: 'gw', label: 'API gateway', sub: 'rate-limit middleware', x: 330, y: 200, kind: 'guard' },
    { id: 'redis', label: 'Redis', sub: 'bucket per key', x: 590, y: 80, kind: 'memory' },
    { id: 'api', label: 'API service', x: 590, y: 320, kind: 'service' },
  ],
  edges: [
    { id: 'c-g', from: 'client', to: 'gw' },
    { id: 'g-r', from: 'gw', to: 'redis' },
    { id: 'g-a', from: 'gw', to: 'api' },
    { id: 'g-c', from: 'gw', to: 'client', bend: 40 },
  ],
  code: `-- KEYS[1] = bucket key, ARGV = capacity, refill_per_sec, now
local b = redis.call("HMGET", KEYS[1], "tokens", "ts")
local tokens = tonumber(b[1]) or tonumber(ARGV[1])
local elapsed = tonumber(ARGV[3]) - (tonumber(b[2]) or tonumber(ARGV[3]))
tokens = math.min(tonumber(ARGV[1]), tokens + elapsed * tonumber(ARGV[2]))
local allowed = tokens >= 1
if allowed then tokens = tokens - 1 end
redis.call("HSET", KEYS[1], "tokens", tokens, "ts", ARGV[3])
redis.call("EXPIRE", KEYS[1], 60)
return allowed and 1 or 0`,
  steps: [
    { title: 'Full bucket', edge: 'c-g', packet: 'request 1', narration: 'The key starts with a full bucket of 10 tokens.', state: { tokens: '10', allowed: '0', rejected: '0', clock: '0.0 s' }, changed: ['tokens'], hl: ['local tokens = tonumber(b[1]) or tonumber(ARGV[1])'], log: 'bucket created: 10 tokens' },
    { title: 'Atomic check in Redis', edge: 'g-r', packet: 'EVALSHA', node: 'redis', narration: 'The gateway runs one Lua script: refill by elapsed time, take a token if available, save. Atomic, so ten gateway pods never double-spend a token.', hl: ['tokens = math.min(tonumber(ARGV[1]), tokens + elapsed', 'if allowed then tokens = tokens - 1 end'], log: 'Lua: refill + take atomically' },
    { title: 'Burst of 10 allowed', edge: 'g-a', packet: 'requests 1–10', node: 'api', tone: 'ok', narration: 'The first 10 requests of the burst each take a token and pass through.', state: { tokens: '0', allowed: '10', rejected: '0', clock: '0.2 s' }, changed: ['tokens', 'allowed', 'clock'], log: '10 allowed, bucket empty' },
    {
      title: 'Requests 11 and 12',
      edge: 'g-c',
      packet: '429 Retry-After: 1',
      node: 'client',
      tone: 'bad',
      narration: 'The bucket is empty, so requests 11 and 12 get 429 Too Many Requests with Retry-After: 1.',
      state: { tokens: '0', allowed: '10', rejected: '2', clock: '0.3 s' },
      changed: ['rejected', 'clock'],
      hl: ['return allowed and 1 or 0'],
      log: '2 rejected with 429',
      predict: { question: 'The client waits 3.5 seconds and sends 5 requests. How many pass?', options: ['0', '3', '5', '10'], answer: 1, explain: 'At 1 token per second, 3.5 s refills 3.5 tokens; three whole tokens means three requests pass and two get 429.' },
    },
    { title: 'Refill over time', edge: 'c-g', packet: '5 requests at t=3.8 s', node: 'gw', narration: '3.5 seconds later the bucket holds 3.5 tokens: 3 requests pass, 2 are rejected. The long-run rate is capped at 1 request per second, while short bursts up to 10 are allowed.', state: { tokens: '0.5', allowed: '13', rejected: '4', clock: '3.8 s' }, changed: ['tokens', 'allowed', 'rejected', 'clock'], log: '3 allowed, 2 rejected after refill' },
  ],
  match: /rate limit|token bucket|api keys|api gateway|ddos|throttl/i,
  takeaways: ['Capacity sets the burst; the refill rate sets the long-run limit.', 'Keep the bucket in Redis and update it atomically so all servers agree.', 'Return 429 with Retry-After so clients back off.'],
}

/* ===================================================== 6. circuit breaker */

const BREAKER: AgentSim = {
  id: 'sd-circuit-breaker',
  title: 'Circuit breaker: closed → open → half-open',
  framework: 'Resilience patterns',
  group: 'Microservices',
  module: '08',
  home: home('08'),
  level: 'Intermediate',
  summary: 'A payment provider slows down. Watch threads pile up without a breaker, then see the breaker fail fast, serve a fallback and recover.',
  scenario: 'The checkout service calls a payment provider with a 2-second timeout. The provider starts timing out on 60% of calls.',
  nodes: [
    { id: 'users', label: 'Shoppers', x: 90, y: 200, kind: 'user' },
    { id: 'checkout', label: 'Checkout service', sub: '200 worker threads', x: 320, y: 200, kind: 'service' },
    { id: 'cb', label: 'Circuit breaker', sub: 'state machine', x: 520, y: 200, kind: 'guard' },
    { id: 'pay', label: 'Payment provider', sub: 'degraded', x: 700, y: 90, kind: 'tool' },
    { id: 'fb', label: 'Fallback', sub: 'queue for retry', x: 700, y: 320, kind: 'memory' },
  ],
  edges: [
    { id: 'u-c', from: 'users', to: 'checkout' },
    { id: 'c-cb', from: 'checkout', to: 'cb' },
    { id: 'cb-p', from: 'cb', to: 'pay' },
    { id: 'cb-f', from: 'cb', to: 'fb' },
  ],
  code: `breaker = CircuitBreaker(failure_threshold=0.5, window=20,
                         open_seconds=30, half_open_calls=3)

def charge(order):
    if breaker.state == "open":
        return queue_for_retry(order)            # fail fast, no waiting
    try:
        result = payments.charge(order, timeout=2.0)
        breaker.record_success()
        return result
    except (Timeout, ProviderError):
        breaker.record_failure()                 # may trip to "open"
        return queue_for_retry(order)`,
  steps: [
    { title: 'Closed: calls pass through', edge: 'cb-p', packet: 'charge()', narration: 'Normally the breaker is closed and every call reaches the provider.', state: { state: 'closed', failure_rate: '2%', busy_threads: '12 / 200', p99: '300 ms' }, changed: ['state'], hl: ['result = payments.charge(order, timeout=2.0)'], log: 'closed, 2% failures' },
    { title: 'Provider degrades', edge: 'cb-p', packet: 'timeout 2 s', node: 'pay', tone: 'bad', narration: '60% of calls now time out after 2 seconds. Each one holds a worker thread for the full timeout.', state: { state: 'closed', failure_rate: '60%', busy_threads: '180 / 200', p99: '2.1 s' }, changed: ['failure_rate', 'busy_threads', 'p99'], hl: ['breaker.record_failure()'], log: 'timeouts pile up: 180 threads busy' },
    {
      title: 'Trip to open',
      edge: 'cb-f',
      packet: 'queued',
      node: 'fb',
      tone: 'warn',
      narration: 'The failure rate over the last 20 calls passes 50%, so the breaker opens. Calls now fail fast to the fallback: orders are accepted and queued for payment retry.',
      state: { state: 'open (30 s)', failure_rate: '60%', busy_threads: '15 / 200', p99: '40 ms' },
      changed: ['state', 'busy_threads', 'p99'],
      hl: ['if breaker.state == "open":', 'return queue_for_retry(order)'],
      log: 'breaker OPEN — fail fast, threads freed',
      predict: { question: 'Why is failing fast better than waiting for the timeout?', options: ['It is not; waiting is always safer', 'Threads are freed, so the rest of checkout keeps working and the provider gets breathing room', 'It makes the provider faster', 'It hides the error from monitoring'], answer: 1, explain: 'Waiting on a sick dependency exhausts threads and spreads the outage to everything else. Failing fast contains the damage and reduces load on the struggling provider.' },
    },
    { title: 'Half-open trial', edge: 'cb-p', packet: '3 trial calls', node: 'pay', narration: 'After 30 seconds the breaker lets 3 trial calls through to test the provider.', state: { state: 'half-open', failure_rate: '—', busy_threads: '14 / 200', p99: '45 ms' }, changed: ['state'], log: 'half-open: 3 trial calls' },
    { title: 'Recovered: close', edge: 'cb-p', packet: 'charge() OK', node: 'pay', tone: 'ok', narration: 'All 3 trial calls succeed, so the breaker closes. The queued orders are charged by a background worker.', state: { state: 'closed', failure_rate: '1%', busy_threads: '13 / 200', p99: '310 ms' }, changed: ['state', 'failure_rate', 'p99'], hl: ['breaker.record_success()'], log: 'breaker CLOSED — retry queue draining' },
  ],
  match: /circuit breaker|bulkhead|retry mechanisms|fault tolerance|microservices|graceful degradation|resilien/i,
  takeaways: ['Timeouts alone still hold threads for the full timeout.', 'An open breaker fails fast and serves a fallback.', 'Half-open trial calls decide when to recover.'],
}

/* ===================================================== 7. kafka consumer group */

const KAFKA: AgentSim = {
  id: 'sd-kafka-consumer-group',
  title: 'Kafka partitions, consumer groups and a rebalance',
  framework: 'Apache Kafka',
  group: 'Messaging',
  module: '07',
  home: home('07'),
  level: 'Intermediate',
  summary: 'See how keys pick partitions, how a consumer group splits partitions, what offsets mean, and what happens when a consumer dies.',
  scenario: 'An "orders" topic with 3 partitions, keyed by customer_id. The billing service runs 3 consumers in one group.',
  nodes: [
    { id: 'prod', label: 'Order service', sub: 'producer', x: 90, y: 200, kind: 'service' },
    { id: 'p0', label: 'Partition 0', sub: 'offset 1,204', x: 330, y: 70, kind: 'memory' },
    { id: 'p1', label: 'Partition 1', sub: 'offset 988', x: 330, y: 200, kind: 'memory' },
    { id: 'p2', label: 'Partition 2', sub: 'offset 1,117', x: 330, y: 330, kind: 'memory' },
    { id: 'c1', label: 'Consumer 1', sub: 'billing', x: 620, y: 70, kind: 'agent' },
    { id: 'c2', label: 'Consumer 2', sub: 'billing', x: 620, y: 200, kind: 'agent' },
    { id: 'c3', label: 'Consumer 3', sub: 'billing', x: 620, y: 330, kind: 'agent' },
  ],
  edges: [
    { id: 'pr-0', from: 'prod', to: 'p0' },
    { id: 'pr-1', from: 'prod', to: 'p1' },
    { id: 'pr-2', from: 'prod', to: 'p2' },
    { id: '0-c1', from: 'p0', to: 'c1' },
    { id: '1-c2', from: 'p1', to: 'c2' },
    { id: '2-c3', from: 'p2', to: 'c3' },
    { id: '2-c1', from: 'p2', to: 'c1', bend: -40 },
  ],
  code: `producer.send("orders", key=str(order.customer_id), value=order.json())
# partition = murmur2(key) % 3  → same customer, same partition, in order

consumer = KafkaConsumer("orders", group_id="billing",
                         enable_auto_commit=False)
for msg in consumer:
    bill(msg.value)              # make this idempotent: dedupe on order_id
    consumer.commit()            # commit the offset AFTER processing`,
  steps: [
    { title: 'Key picks the partition', edge: 'pr-1', packet: 'customer 77 → P1', narration: 'The producer hashes the key customer_id=77 to partition 1. Every order from customer 77 goes to P1, so they stay in order.', state: { assignment: 'C1←P0 · C2←P1 · C3←P2', committed_P2: '1,117', lag: '0', status: 'steady' }, changed: ['assignment'], hl: ['producer.send("orders", key=str(order.customer_id)'], log: 'order for customer 77 → partition 1' },
    { title: 'One consumer per partition', edge: '1-c2', packet: 'offset 989', node: 'c2', narration: 'Within the billing group each partition is read by exactly one consumer. C2 owns P1 and processes offset 989.', hl: ['bill(msg.value)'], log: 'C2 processes P1@989' },
    { title: 'Commit after processing', edge: '2-c3', packet: 'offset 1,118', node: 'c3', narration: 'C3 bills order at P2 offset 1,118 and then commits, recording "next offset to read" for the group.', state: { assignment: 'C1←P0 · C2←P1 · C3←P2', committed_P2: '1,118', lag: '0', status: 'steady' }, changed: ['committed_P2'], hl: ['consumer.commit()'], log: 'C3 committed P2@1,118' },
    {
      title: 'Consumer 3 crashes',
      edge: '2-c3',
      packet: 'offset 1,119 (processed, not committed)',
      node: 'c3',
      tone: 'bad',
      narration: 'C3 bills offset 1,119 and crashes before committing. Heartbeats stop.',
      state: { assignment: 'C1←P0 · C2←P1 · C3✗', committed_P2: '1,118', lag: '340', status: 'rebalancing' },
      changed: ['assignment', 'lag', 'status'],
      log: 'C3 heartbeat lost → rebalance',
      predict: { question: 'After the rebalance, which offset of P2 is read next?', options: ['1,120 — Kafka knows it was processed', '1,119 — the last committed offset was 1,118, so 1,119 is delivered again', '0 — partitions restart', 'It is skipped forever'], answer: 1, explain: 'Kafka only knows committed offsets. Offset 1,119 is redelivered, so it is billed twice unless the consumer is idempotent. This is at-least-once delivery.' },
    },
    { title: 'Rebalance and redelivery', edge: '2-c1', packet: 'offset 1,119 again', node: 'c1', tone: 'warn', narration: 'P2 is reassigned to C1, which resumes at the committed offset — 1,119 is delivered a second time. Deduplicating on order_id makes the second bill a no-op.', state: { assignment: 'C1←P0,P2 · C2←P1', committed_P2: '1,119', lag: '338', status: 'steady' }, changed: ['assignment', 'committed_P2', 'status'], log: 'C1 took over P2; duplicate ignored by order_id' },
    { title: 'Scaling limit', edge: '0-c1', packet: 'max 3 active consumers', node: 'c1', narration: 'Parallelism is capped by the partition count: a 4th consumer in this group would sit idle. Choose partitions for your peak throughput up front.', log: 'partitions = max parallel consumers per group' },
  ],
  match: /kafka|consumer|pub[/-]sub|message queue|producer[- ]consumer|event streaming|at[- ]least[- ]once|exactly[- ]once|pulsar|rabbitmq|event[- ]driven/i,
  takeaways: ['The key decides the partition; order is guaranteed only within a partition.', 'Each partition has one consumer per group; partitions cap parallelism.', 'Commit after processing and make consumers idempotent — delivery is at least once.'],
}

/* ===================================================== 8. raft */

const RAFT: AgentSim = {
  id: 'sd-raft-election',
  title: 'Raft: leader election and majority commit',
  framework: 'Consensus',
  group: 'Distributed systems',
  module: '06',
  home: home('06'),
  level: 'Advanced',
  summary: 'Five nodes elect a leader, replicate a write to a majority, survive the leader crashing, and refuse to split-brain.',
  scenario: 'A 5-node etcd-style cluster stores configuration. Quorum is 3 of 5.',
  nodes: [
    { id: 'client', label: 'Client', sub: 'SET flag=on', x: 80, y: 200, kind: 'user' },
    { id: 'n1', label: 'Node 1', sub: 'leader, term 4', x: 300, y: 200, kind: 'agent' },
    { id: 'n2', label: 'Node 2', x: 540, y: 50, kind: 'memory' },
    { id: 'n3', label: 'Node 3', x: 660, y: 160, kind: 'memory' },
    { id: 'n4', label: 'Node 4', x: 660, y: 280, kind: 'memory' },
    { id: 'n5', label: 'Node 5', x: 540, y: 370, kind: 'memory' },
  ],
  edges: [
    { id: 'c-1', from: 'client', to: 'n1' },
    { id: '1-2', from: 'n1', to: 'n2' },
    { id: '1-3', from: 'n1', to: 'n3' },
    { id: '1-4', from: 'n1', to: 'n4' },
    { id: '1-5', from: 'n1', to: 'n5' },
    { id: '3-2', from: 'n3', to: 'n2', bend: 20 },
    { id: '3-4', from: 'n3', to: 'n4', bend: 20 },
  ],
  code: `# leader
def handle_write(cmd):
    log.append(Entry(term=current_term, cmd=cmd))
    acks = 1 + sum(peer.append_entries(log) for peer in peers)
    if acks >= len(cluster) // 2 + 1:          # majority: 3 of 5
        commit_index = len(log) - 1
        return "OK"

# follower: no heartbeat within 150–300 ms (randomised)
def on_election_timeout():
    current_term += 1
    votes = 1 + sum(peer.request_vote(current_term, last_log) for peer in peers)
    if votes >= len(cluster) // 2 + 1:
        become_leader()`,
  steps: [
    { title: 'Client writes to the leader', edge: 'c-1', packet: 'SET flag=on', narration: 'All writes go to the leader (node 1, term 4), which appends the entry to its log.', state: { leader: 'node 1', term: '4', entry_on: 'node 1', committed: 'no' }, changed: ['entry_on'], hl: ['log.append(Entry(term=current_term, cmd=cmd))'], log: 'leader appended index 57' },
    { title: 'Replicate to followers', edge: '1-3', packet: 'AppendEntries #57', node: 'n3', narration: 'The leader sends the entry to every follower. Nodes 2 and 3 acknowledge quickly; 4 and 5 are slow.', state: { leader: 'node 1', term: '4', entry_on: 'nodes 1, 2, 3', committed: 'no' }, changed: ['entry_on'], hl: ['acks = 1 + sum(peer.append_entries(log)'], log: 'acks from 2 and 3' },
    { title: 'Majority → committed', edge: 'c-1', packet: 'OK', node: 'client', tone: 'ok', narration: '3 of 5 nodes hold the entry — a majority — so it is committed and the client gets OK. It will survive any 2 node failures.', state: { leader: 'node 1', term: '4', entry_on: 'nodes 1, 2, 3', committed: 'yes (3/5)' }, changed: ['committed'], hl: ['if acks >= len(cluster) // 2 + 1:'], log: 'index 57 committed with 3/5' },
    {
      title: 'Leader crashes',
      edge: '3-2',
      packet: 'RequestVote term 5',
      node: 'n3',
      tone: 'warn',
      narration: 'Node 1 dies. Node 3’s randomised election timeout fires first; it becomes a candidate for term 5 and asks for votes.',
      state: { leader: '— (election)', term: '5', entry_on: 'nodes 2, 3', committed: 'yes' },
      changed: ['leader', 'term'],
      hl: ['current_term += 1', 'votes = 1 + sum(peer.request_vote'],
      log: 'node 3 candidate, term 5',
      predict: { question: 'Could node 5, which never received entry 57, win this election?', options: ['Yes, any node can win', 'No — voters reject candidates whose log is behind theirs, so the committed entry cannot be lost', 'Only if it is the oldest node', 'Yes, then it deletes entry 57'], answer: 1, explain: 'A node only votes for a candidate whose log is at least as up to date as its own. Every majority includes a node with entry 57, so a candidate missing it cannot gather 3 votes.' },
    },
    { title: 'New leader elected', edge: '3-4', packet: 'votes 3/5', node: 'n3', tone: 'ok', narration: 'Nodes 2 and 4 vote for node 3: 3 of 5 votes. Node 3 leads term 5 and brings nodes 4 and 5 up to date — entry 57 is preserved.', state: { leader: 'node 3', term: '5', entry_on: 'nodes 2, 3, 4, 5', committed: 'yes' }, changed: ['leader', 'entry_on'], hl: ['become_leader()'], log: 'node 3 leader, term 5' },
    { title: 'No split brain', edge: '1-2', packet: 'stale term 4', node: 'n2', narration: 'If old node 1 comes back still thinking it leads term 4, followers reject its messages because term 5 is higher; it steps down. Two leaders can never both reach a majority.', log: 'node 1 rejoins as follower' },
  ],
  match: /consensus|raft|paxos|leader election|quorum|split[- ]brain|distributed locking|distributed systems basics/i,
  takeaways: ['A write is committed once a majority stores it.', 'Randomised timeouts make elections converge quickly.', 'Voting rules and terms prevent losing committed data or split brain.'],
}

/* ===================================================== 9. saga */

const SAGA: AgentSim = {
  id: 'sd-saga',
  title: 'Saga: a distributed order with compensation',
  framework: 'Microservices',
  group: 'Distributed systems',
  module: '06',
  home: home('06'),
  level: 'Advanced',
  summary: 'An order spans three services with their own databases. When shipping fails, watch the saga undo the earlier steps in reverse.',
  scenario: 'Placing an order must reserve stock, charge the card and book a courier. There is no shared database, so no single ACID transaction.',
  nodes: [
    { id: 'orch', label: 'Order orchestrator', sub: 'saga state', x: 110, y: 200, kind: 'router' },
    { id: 'inv', label: 'Inventory', sub: 'own DB', x: 420, y: 60, kind: 'service' },
    { id: 'pay', label: 'Payments', sub: 'own DB', x: 520, y: 200, kind: 'service' },
    { id: 'ship', label: 'Shipping', sub: 'own DB', x: 420, y: 340, kind: 'service' },
  ],
  edges: [
    { id: 'o-i', from: 'orch', to: 'inv' },
    { id: 'o-p', from: 'orch', to: 'pay' },
    { id: 'o-s', from: 'orch', to: 'ship' },
    { id: 'p-o', from: 'pay', to: 'orch', bend: 30 },
    { id: 'i-o', from: 'inv', to: 'orch', bend: 30 },
  ],
  code: `STEPS = [
    (inventory.reserve, inventory.release),
    (payments.charge,   payments.refund),
    (shipping.book,     shipping.cancel),
]

def place_order(order):
    done = []
    for action, compensate in STEPS:
        try:
            action(order)                       # local transaction in that service
            done.append(compensate)
        except StepFailed:
            for undo in reversed(done):         # compensate in reverse order
                undo(order)                     # must be idempotent and retryable
            return "CANCELLED"
    return "CONFIRMED"`,
  steps: [
    { title: 'Reserve stock', edge: 'o-i', packet: 'reserve 2 × SKU-9', narration: 'Step 1 runs a local transaction in the inventory service: 2 units reserved.', state: { order: 'PENDING', inventory: 'reserved 2', payment: '—', shipping: '—' }, changed: ['order', 'inventory'], hl: ['action(order)'], log: 'inventory reserved' },
    { title: 'Charge the card', edge: 'o-p', packet: 'charge ₹2,400', narration: 'Step 2: payments charges ₹2,400 in its own database.', state: { order: 'PENDING', inventory: 'reserved 2', payment: 'charged ₹2,400', shipping: '—' }, changed: ['payment'], log: 'payment charged' },
    {
      title: 'Shipping fails',
      edge: 'o-s',
      packet: 'book courier',
      node: 'ship',
      tone: 'bad',
      narration: 'No courier serves this PIN code: step 3 fails. Steps 1 and 2 are already committed in other databases — there is nothing to roll back automatically.',
      state: { order: 'COMPENSATING', inventory: 'reserved 2', payment: 'charged ₹2,400', shipping: 'failed' },
      changed: ['order', 'shipping'],
      hl: ['except StepFailed:'],
      log: 'shipping failed — start compensation',
      predict: { question: 'In what order should the saga undo the completed steps?', options: ['Release stock, then refund', 'Refund first, then release stock — reverse order of execution', 'Only refund; stock does not matter', 'Retry shipping forever'], answer: 1, explain: 'Compensations run in reverse, mirroring a stack: the last completed step is undone first. That keeps every intermediate state one a real business process could be in.' },
    },
    { title: 'Refund', edge: 'p-o', packet: 'refund ₹2,400', node: 'orch', tone: 'warn', narration: 'Compensation for step 2: the charge is refunded. Compensations must be idempotent because they may be retried.', state: { order: 'COMPENSATING', inventory: 'reserved 2', payment: 'refunded', shipping: 'failed' }, changed: ['payment'], hl: ['for undo in reversed(done):'], log: 'payment refunded' },
    { title: 'Release stock', edge: 'i-o', packet: 'release 2 × SKU-9', node: 'orch', tone: 'ok', narration: 'Compensation for step 1: the units return to stock. The order ends CANCELLED — consistent, but only eventually, and the customer may briefly have seen a charge.', state: { order: 'CANCELLED', inventory: 'released', payment: 'refunded', shipping: 'failed' }, changed: ['order', 'inventory'], hl: ['return "CANCELLED"'], log: 'saga finished: CANCELLED' },
  ],
  match: /saga|distributed transactions|two[- ]phase commit|three[- ]phase commit|database per service|compensat/i,
  takeaways: ['A saga is a chain of local transactions, each with a compensating action.', 'On failure, compensate completed steps in reverse order.', 'Compensations must be idempotent; consistency is eventual.'],
}

/* ===================================================== 10. url shortener */

const URL_SHORT: AgentSim = {
  id: 'sd-url-shortener',
  title: 'URL shortener end to end: create, redirect, count clicks',
  framework: 'Case study',
  group: 'Case studies',
  module: '15',
  home: home('15'),
  level: 'Beginner',
  summary: 'Create a short link with a base62 id, serve redirects from cache at 100:1 read/write, and stream clicks to analytics.',
  scenario: '100M new links per month, 10B redirects per month (~4,000 redirects/s on average, ~12,000 at peak).',
  nodes: [
    { id: 'user', label: 'User / browser', x: 80, y: 200, kind: 'user' },
    { id: 'api', label: 'Shortener API', sub: 'stateless', x: 290, y: 200, kind: 'service' },
    { id: 'idgen', label: 'ID generator', sub: 'counter ranges', x: 290, y: 60, kind: 'router' },
    { id: 'cache', label: 'Redis', sub: 'hot codes', x: 530, y: 80, kind: 'memory' },
    { id: 'db', label: 'Key-value DB', sub: 'code → URL', x: 530, y: 330, kind: 'tool' },
    { id: 'kafka', label: 'Kafka', sub: 'click events', x: 700, y: 200, kind: 'memory' },
  ],
  edges: [
    { id: 'u-a', from: 'user', to: 'api' },
    { id: 'a-id', from: 'api', to: 'idgen' },
    { id: 'a-db', from: 'api', to: 'db' },
    { id: 'a-c', from: 'api', to: 'cache' },
    { id: 'a-u', from: 'api', to: 'user', bend: 40 },
    { id: 'a-k', from: 'api', to: 'kafka' },
  ],
  code: `ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

def base62(n):
    s = ""
    while n:
        n, r = divmod(n, 62)
        s = ALPHABET[r] + s
    return s or "0"

def shorten(long_url):
    code = base62(id_range.next())          # e.g. 56,800,235,584 → "100000" (6 chars)
    kv.put(code, long_url)
    return f"https://sho.rt/{code}"

def redirect(code):
    url = redis.get(code) or kv.get(code)
    kafka.send("clicks", {"code": code, "ts": now()})   # async, off the hot path
    return Redirect(url, status=302)`,
  steps: [
    { title: 'Create: get a unique number', edge: 'a-id', packet: 'next id', narration: 'Each API server leases a range of 1,000 ids from the generator, so ids are unique without coordination on every request.', state: { last_code: '—', read_write_ratio: '100 : 1', cache_hit_rate: '—', clicks_today: '0' }, hl: ['code = base62(id_range.next())'], log: 'leased ids 56,800,235,000–999' },
    { title: 'Encode in base62', edge: 'a-db', packet: 'aZ3k9Q → long URL', node: 'db', narration: '62 characters per position: 6 characters give 62⁶ ≈ 56.8 billion codes — enough for 47 years at 100M links a month.', state: { last_code: 'aZ3k9Q', read_write_ratio: '100 : 1', cache_hit_rate: '—', clicks_today: '0' }, changed: ['last_code'], hl: ['def base62(n):', 'kv.put(code, long_url)'], log: 'stored aZ3k9Q' },
    {
      title: 'Redirect from cache',
      edge: 'a-c',
      packet: 'GET aZ3k9Q',
      node: 'cache',
      tone: 'ok',
      narration: 'Redirects outnumber creates 100 to 1, and popular links are very popular — Redis serves ~90% of redirects in about a millisecond.',
      state: { last_code: 'aZ3k9Q', read_write_ratio: '100 : 1', cache_hit_rate: '90%', clicks_today: '1' },
      changed: ['cache_hit_rate', 'clicks_today'],
      hl: ['url = redis.get(code) or kv.get(code)'],
      log: 'cache hit aZ3k9Q',
      predict: { question: 'The product team wants to count every click. 301 or 302?', options: ['301 Moved Permanently', '302 Found — browsers ask again each time, so every click reaches you', 'Either; they behave the same', '404'], answer: 1, explain: 'Browsers cache 301 redirects and stop asking, so later clicks never reach the server. 302 keeps every click visible, at the cost of more traffic.' },
    },
    { title: 'Respond with 302', edge: 'a-u', packet: '302 Location: …', node: 'user', narration: 'The browser follows the Location header to the long URL.', hl: ['return Redirect(url, status=302)'], log: '302 → long URL' },
    { title: 'Count clicks asynchronously', edge: 'a-k', packet: 'click event', node: 'kafka', narration: 'The click is sent to Kafka without waiting; analytics consumers aggregate counts per link, country and hour. The redirect never waits for analytics.', state: { last_code: 'aZ3k9Q', read_write_ratio: '100 : 1', cache_hit_rate: '90%', clicks_today: '1' }, hl: ['kafka.send("clicks"'], log: 'click → Kafka → analytics' },
  ],
  match: /url shortener|pastebin|worked designs/i,
  takeaways: ['Unique ids + base62 give short, collision-free codes.', 'Redirects are read-heavy: serve them from cache.', 'Keep analytics off the request path with a queue.'],
}

/* ===================================================== 11. replication lag */

const REPL: AgentSim = {
  id: 'sd-replication-lag',
  title: 'Read replicas and the read-your-writes problem',
  framework: 'PostgreSQL',
  group: 'Databases',
  module: '03',
  home: home('03'),
  level: 'Intermediate',
  summary: 'A user updates their profile and immediately sees the old one. Watch asynchronous replication lag cause it and two ways to fix it.',
  scenario: 'One primary takes writes; two async replicas serve reads. Normal lag is 50 ms, but a batch job pushes it to 3 seconds.',
  nodes: [
    { id: 'user', label: 'User', x: 80, y: 200, kind: 'user' },
    { id: 'app', label: 'App', sub: 'routes reads/writes', x: 280, y: 200, kind: 'service' },
    { id: 'primary', label: 'Primary', sub: 'writes', x: 520, y: 70, kind: 'tool' },
    { id: 'r1', label: 'Replica 1', sub: 'reads', x: 520, y: 220, kind: 'memory' },
    { id: 'r2', label: 'Replica 2', sub: 'reads', x: 520, y: 350, kind: 'memory' },
  ],
  edges: [
    { id: 'u-a', from: 'user', to: 'app' },
    { id: 'a-p', from: 'app', to: 'primary' },
    { id: 'p-r1', from: 'primary', to: 'r1' },
    { id: 'p-r2', from: 'primary', to: 'r2', bend: 40 },
    { id: 'a-r1', from: 'app', to: 'r1' },
    { id: 'a-u', from: 'app', to: 'user', bend: 40 },
  ],
  code: `def save_bio(user, bio):
    primary.execute("UPDATE users SET bio=%s WHERE id=%s", bio, user.id)
    session["wrote_at"] = time.time()

def read_profile(user):
    recently_wrote = time.time() - session.get("wrote_at", 0) < 5
    db = primary if recently_wrote else random.choice(replicas)   # read-your-writes
    return db.fetch_one("SELECT * FROM users WHERE id=%s", user.id)`,
  steps: [
    { title: 'Write goes to the primary', edge: 'a-p', packet: 'UPDATE bio', narration: 'The user saves a new bio. Writes always go to the primary.', state: { primary_bio: 'new', replica1_bio: 'old', lag: '3 s', user_sees: '—' }, changed: ['primary_bio', 'lag'], hl: ['primary.execute("UPDATE users SET bio'], log: 'primary updated' },
    { title: 'Replication is behind', edge: 'p-r1', packet: 'WAL (3 s behind)', node: 'r1', tone: 'warn', narration: 'Replicas apply the primary’s write-ahead log asynchronously. A heavy batch job has pushed lag to 3 seconds.', log: 'replica lag 3 s' },
    {
      title: 'Read hits a stale replica',
      edge: 'a-r1',
      packet: 'SELECT bio',
      node: 'r1',
      tone: 'bad',
      narration: 'The page reloads 200 ms later and the read goes to replica 1, which still has the old bio. The user thinks the save failed and tries again.',
      state: { primary_bio: 'new', replica1_bio: 'old', lag: '3 s', user_sees: 'OLD bio ✗' },
      changed: ['user_sees'],
      log: 'user saw stale data',
      predict: { question: 'What is the simplest targeted fix?', options: ['Make all replicas synchronous', 'Route this user’s reads to the primary for a few seconds after they write', 'Remove the replicas', 'Cache the old value longer'], answer: 1, explain: 'Read-your-writes only matters for the user who wrote. Sending their reads to the primary briefly fixes it without slowing every write with synchronous replication.' },
    },
    { title: 'Read-your-writes routing', edge: 'a-p', packet: 'SELECT bio (primary)', node: 'primary', tone: 'ok', narration: 'The app remembers when this user last wrote; for the next 5 seconds their reads go to the primary. Everyone else keeps reading from replicas.', state: { primary_bio: 'new', replica1_bio: 'old', lag: '3 s', user_sees: 'NEW bio ✓' }, changed: ['user_sees'], hl: ['recently_wrote = time.time() - session.get("wrote_at", 0) < 5', 'db = primary if recently_wrote else random.choice(replicas)'], log: 'recent writer → primary' },
    { title: 'Replicas catch up', edge: 'p-r2', packet: 'WAL applied', node: 'r2', narration: 'Three seconds later both replicas have the new bio and the user’s reads return to the replicas. Monitor replication lag and alert when it grows.', state: { primary_bio: 'new', replica1_bio: 'new', lag: '50 ms', user_sees: 'NEW bio ✓' }, changed: ['replica1_bio', 'lag'], log: 'lag back to 50 ms' },
  ],
  match: /replication|read replicas|eventual consistency|strong consistency|consistency models|database design at scale/i,
  takeaways: ['Async replicas can lag behind the primary.', 'Route a user’s reads to the primary shortly after they write.', 'Monitor replication lag.'],
}

export const SD_SIMS: AgentSim[] = [JOURNEY, REPL, CACHE_ASIDE, RING, LB, RAFT, SAGA, KAFKA, BREAKER, TOKEN, URL_SHORT]
