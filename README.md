# URL Shortener

A small URL shortener: create short links, redirect through them while tracking clicks, and view analytics (total clicks, clicks per day, top referrers) on a shareable page.

## Stack

- **Next.js 15 (App Router) + TypeScript + React 19** — one project serves both the HTTP API (Route Handlers) and the analytics UI (a Server Component), so there's a single dev server, a single build, and no separate backend/frontend split.
- **File-backed in-memory store** (`data/db.json`, via Node's `fs`) instead of a database — all reads are served from an in-process `Map`, every write (new link, new click) is persisted synchronously to disk, and the store is loaded back into memory on process start. This survives restarts without any external DB engine to install/run. It's a deliberate, documented trade-off for this scope (single process, no concurrent-writer safety) — see `specs/001-url-shortener/research.md` for the full rationale and alternatives considered (SQLite, Redis, pure in-memory).
- **nanoid** for short-code generation (7-char, URL-safe alphanumeric, collision-checked against the store before accepting a code).
- **Vitest** for unit tests (`lib/`) and integration tests (Route Handlers, called directly with Web-standard `Request` objects — no server process needed to test them).

Full design docs live in `specs/001-url-shortener/` (spec, plan, research, data model, API contracts, task breakdown).

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Starts the app on `http://localhost:3000` (or `$PORT` if set). `data/db.json` is created on first write.

## Test

```bash
npm test
```

Runs the full unit + integration suite once via Vitest and exits non-zero on failure. Tests point at an isolated temp data file (`DB_FILE_PATH`), so they never touch your local `data/db.json`.

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/shorten` | Create a short link from `{ url, expiresAt? }` |
| `GET` | `/:code` | Redirect to the original URL (301); records a click. 404 if unknown, 410 if expired |
| `GET` | `/api/urls` | List all links, newest first, with click counts |
| `GET` | `/api/stats/:code` | JSON stats: total clicks, clicks per day (30 days), top 5 referrers |
| `GET` | `/analytics/:code` | Human-viewable analytics page — the same data as `/api/stats/:code` |

Full request/response shapes: `specs/001-url-shortener/contracts/api.md`.

## Demo flow

```bash
curl -s -X POST http://localhost:3000/api/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/some/long/path"}'
# → { "shortCode": "...", "shortUrl": "http://localhost:3000/...", ... }

curl -sI http://localhost:3000/<shortCode>          # 301 redirect, click recorded
curl -sI -e "https://twitter.com/" http://localhost:3000/<shortCode>

open http://localhost:3000/analytics/<shortCode>    # totals, per-day breakdown, top referrers
```
