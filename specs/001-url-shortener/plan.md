# Implementation Plan: URL Shortener

**Branch**: `001-url-shortener` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-url-shortener/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Build a Next.js (App Router) application that creates short, ~7-character alphanumeric links for `http(s)` URLs (with optional expiration), redirects visitors while recording each click's referrer/user-agent/IP/timestamp, lists created links with click counts, and serves both a JSON stats endpoint and a React-rendered analytics page per link. Technical approach: a single Next.js/TypeScript app whose Route Handlers and Server Components share one file-backed in-memory store (JSON file on disk, loaded at startup, written after each mutation) for durability across restarts — no external DB — tested with Vitest by invoking Route Handlers directly with Web-standard `Request` objects, runnable and testable each via one npm script.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 15 (App Router), React 19, on Node.js 20 LTS

**Primary Dependencies**: Next.js + React/React DOM, nanoid (short-code generation), Vitest (test runner). No database driver/ORM, no charting library, no separate HTTP framework — API endpoints are Next.js Route Handlers, the analytics UI is a React Server Component, and persistence uses Node's built-in `fs` module only.

**Storage**: File-backed, in-process store, shared by all Route Handlers/Server Components via a singleton module. All short links and clicks live in memory (a `Map<shortCode, ShortLink>` plus a per-link array of `Click` records) for fast reads, and every mutation (new link, new click) is persisted to a single JSON file on disk (`data/db.json`). On startup, the file is read back into memory if present; if absent, the store starts empty and the file is created on first write. The singleton is attached to `globalThis` so Next.js dev-server hot-reload doesn't reset in-memory state between edits. This survives process restarts without requiring an external database engine — a deliberate, documented trade-off (see research.md) appropriate for the scope and time-box of this exercise, not a production posture (no concurrent-process safety, no transactions).

**Testing**: Vitest for unit tests (short-code generation, URL validation, stats aggregation, file store read/write round-trip) and integration tests that import each Route Handler module directly and invoke its exported `GET`/`POST` function with a constructed Web `Request` (and Next's route `params`), asserting on the returned `Response` — no server process or supertest needed, since Route Handlers are plain Web-standard functions. Tests use a temporary/isolated data file so they never touch the developer's real `data/db.json`. Both run via a single `npm test` command.

**Target Platform**: Node.js server process (Next.js dev/start), reachable over plain HTTP on localhost; deployable as a standard Next.js app if ever needed.

**Project Type**: Single Next.js App Router application — API routes, redirect route, and the React analytics page all in one project (no separate backend/frontend split).

**Performance Goals**: No formal load target; interactive/demo-scale (single developer machine, sequential manual clicks plus a handful of scripted ones). Reads are served from the in-memory copy (sub-100ms); writes incur one small synchronous JSON file write per mutation, negligible at this scale.

**Constraints**: Single-process, single-instance only (concurrent processes writing the same file are not supported — acceptable per Assumptions in spec.md). Must start with one install command + one run command, and tests must run and pass with one command. The data file must be git-ignored (it's runtime state, not source). Route Handlers touching the store must run on the Node.js runtime (not Edge), since Edge has no `fs` access.

**Scale/Scope**: Interview/demo scale — dozens of links, hundreds of clicks. Not designed for production traffic volumes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No constitution file is tracked in this repository (the Spec Kit scaffold that would have held one was removed). No project-specific gates apply; this plan instead follows the generic engineering defaults implied by the feature spec itself (testable requirements, single-command run/test, documented assumptions, a short root README covering setup/run/stack rationale, and a readable commit history). No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (Phase 1 planning output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (task breakdown, generated separately from this plan)
```

### Source Code (repository root)

```text
app/
├── api/
│   ├── shorten/route.ts         # POST /api/shorten
│   ├── urls/route.ts             # GET /api/urls
│   └── stats/[code]/route.ts     # GET /api/stats/:code
├── analytics/[code]/page.tsx      # GET /analytics/:code (React Server Component)
├── [code]/route.ts                 # GET /:code (redirect + click tracking)
└── layout.tsx                       # root layout

lib/
├── types.ts                # ShortLink, Click, Stats domain types
├── shortener.ts             # code generation, URL validation, create/get link
├── clicks.ts                 # record click, aggregate stats (totals, by-day, top referrers)
└── store.ts                    # file-backed in-memory repository (load/save data/db.json), globalThis singleton

tests/
├── unit/
│   ├── shortener.test.ts
│   ├── clicks.test.ts
│   └── store.test.ts
└── integration/
    ├── shorten.test.ts
    ├── redirect.test.ts
    ├── urls.test.ts
    └── stats.test.ts

data/                            # git-ignored; created at runtime by store.ts
└── db.json
```

**Structure Decision**: Single Next.js App Router project (Option 1). Route Handlers under `app/api` and `app/[code]` plus the `app/analytics/[code]` Server Component all share the same `lib/store.ts` singleton in one process — no separate backend/frontend split, since Next.js already serves both API and UI from one app.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
