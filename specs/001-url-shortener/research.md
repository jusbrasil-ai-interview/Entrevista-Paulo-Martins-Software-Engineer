# Phase 0 Research: URL Shortener

All technical unknowns from the Technical Context were resolved directly by explicit user direction rather than open-ended research; this document records the decisions and their rationale for future reference.

## Decision: Runtime & language — Node.js 20 LTS + TypeScript 5.x

**Rationale**: Fast to scaffold, ubiquitous HTTP tooling, single-language stack for API + server-rendered HTML, and a natural fit for a time-boxed exercise. TypeScript gives compile-time safety on the request/response contracts (`ShortLink`, `Click`, `Stats`) with negligible setup cost via `tsx`.

**Alternatives considered**: Python (FastAPI) — equally valid, rejected only to keep tooling (dev server, test runner, HTML templating) in one ecosystem. Go — faster/stricter, but slower to iterate on a server-rendered HTML view within the time-box.

## Decision: Web framework — Next.js 15 (App Router)

**Rationale**: Explicit project direction. Route Handlers give the 5 HTTP endpoints with file-based
routing and zero framework boilerplate; the App Router additionally provides React Server
Components for the analytics page in the same project, so API and UI ship as one app with one dev
server and one build.

**Alternatives considered**: Express (the original plan) — dropped once the project direction
called for Next.js/React specifically for the analytics presentation; keeping a separate Express
API alongside a Next.js frontend would mean two dev servers and two deploy targets for no benefit
at this scope. Fastify/framework-less `http` — same rejection reasoning as Express, superseded by
the Next.js decision.

## Decision: Persistence — file-backed in-memory store (no external DB)

**Rationale**: Per explicit direction, persistence must survive process restarts without depending on an external database engine. The chosen design loads a single JSON file (`data/db.json`) into in-memory structures (`Map`/arrays) at startup, serves all reads from memory, and writes the full store back to that file synchronously after every mutation (link creation, click recorded). This gives durability across restarts with effectively zero infrastructure and trivial testability (tests point at a temp file path), while keeping read/write code paths simple enough to write and review within a 1-hour time-box.

**Alternatives considered**:
- **Pure in-memory (no file)** — simplest possible, but loses all data on every restart, including mid-demo restarts; rejected once durability was explicitly requested.
- **SQLite** — durable and queryable, but adds a native dependency/build step and a query layer that outweighs the benefit for ~2 entities and no complex queries.
- **Redis** — requires a separate running service; unnecessary operational overhead for a local, single-instance exercise.

**Consequences accepted**: No support for multiple concurrent processes writing the file; no partial-write/crash-atomicity guarantees beyond "last full write wins" (acceptable given local, single-instance, demo-scale usage — documented in plan.md Constraints).

## Decision: Short code generation — `nanoid` (custom alphabet, length 7)

**Rationale**: `nanoid` with a URL-safe alphanumeric alphabet produces exactly the "~7 alphanumeric characters" required, is collision-resistant, and is a single small dependency with no native bindings. Uniqueness is still enforced explicitly against the in-memory index before accepting a code (regenerate on collision) rather than trusted to probability alone.

**Alternatives considered**: Hashing the URL (e.g., md5/sha slice) — deterministic but means the same URL always maps to the same code, which conflicts with allowing multiple independent links (e.g., different expirations) to the same destination; rejected.

## Decision: Testing — Vitest only, invoking Route Handlers directly, single `npm test`

**Rationale**: Next.js Route Handlers export plain functions `(request: Request, { params }) => Response` built on Web-standard `Request`/`Response`. Vitest tests can import a Route Handler module directly, construct a `Request` (and a `params` object) in-process, call the exported function, and assert on the returned `Response` — no server process, no port binding, and no Supertest needed. Unit tests cover pure logic (`lib/shortener.ts`, `lib/clicks.ts`, `lib/store.ts`); integration tests exercise the Route Handlers this way.

**Alternatives considered**: Supertest against a running `next start` server — works, but requires spinning up and tearing down a real server process per test run, which is slower and unnecessary since Route Handlers are directly callable. Jest — viable, but Vitest's zero-config TS/ESM support is faster to wire up in a time-boxed setting.

## Decision: Analytics page rendering — React Server Component, no chart library

**Rationale**: Explicit project direction to use React for the analytics presentation. `/analytics/:code` is implemented as `app/analytics/[code]/page.tsx`, an async Server Component that reads directly from `lib/store.ts`/`lib/clicks.ts` on the server (no client-side fetch needed) and renders a total, a per-day table with a simple CSS-bar visualization, and a top-referrers table. No charting dependency (e.g., recharts) is added — the spec explicitly accepts "gráfico ou tabela," and a dependency-free CSS bar row satisfies "visual" without the added weight/setup of a charting library in a time-boxed exercise.

**Alternatives considered**: A charting library (recharts/chart.js) for nicer visuals — rejected for now as unnecessary dependency weight against the time-box; could be a follow-up enhancement. A client-side SPA fetching JSON — rejected in favor of a Server Component, which avoids an extra client/server round trip and loading state for data that's already available at request time.

## Decision: Client IP capture — `x-forwarded-for` / `x-real-ip` headers, fallback empty string

**Rationale**: `NextRequest`/`Request` in Next.js 15 no longer exposes an `.ip` property (removed from the framework in v13.4+). The Node.js runtime Route Handler for `GET /:code` reads `request.headers.get('x-forwarded-for')` (taking the first entry when the header holds a comma-separated proxy chain) and falls back to `x-real-ip`. On `localhost` neither header is set by the browser directly, so in that case `ip` is recorded as an empty string rather than throwing — acceptable for this scope since real client-IP capture depends on a reverse proxy that isn't part of this exercise.

**Alternatives considered**: Reading from the raw Node socket (`req.socket.remoteAddress`) — not reachable from a Route Handler's Web-standard `Request`; would require dropping to a custom server, rejected as unnecessary complexity for this scope.

## Decision: Test data isolation — `DB_FILE_PATH` environment variable read by `lib/store.ts`

**Rationale**: `lib/store.ts` reads its JSON file path from `process.env.DB_FILE_PATH`, defaulting to `data/db.json` when unset. Tests set `DB_FILE_PATH` to a per-test-run temp file (e.g., under `os.tmpdir()`) before importing the store module, and clean it up after. This keeps the store's public API free of a path parameter (callers throughout `lib/` and `app/` never pass a path) while still giving tests full isolation from the developer's real data file, satisfying quickstart.md's "tests never touch the developer's real `data/db.json`" claim with a concrete mechanism.

**Alternatives considered**: Passing a path into a store constructor/factory — more testable in the abstract, but adds indirection through every call site for a single-process, singleton-store app at this scope; rejected as unnecessary ceremony for the time-box.

## Open questions

None remaining — all Technical Context fields are resolved.
