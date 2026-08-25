# Tasks: URL Shortener

**Input**: Design documents from `/specs/001-url-shortener/` (plan.md, spec.md, data-model.md, contracts/api.md, research.md, quickstart.md)

**Tests**: Vitest unit + integration tests are part of every user story slice per FR-014/SC-006 — not a separate opt-in phase.

**UI/UX policy**: Any browser-rendered page in this project (currently `/analytics/:code`; applies to any future page added to `app/`) MUST be designed by invoking the `frontend-design` skill before implementation, not styled ad hoc.

**Organization**: Tasks are grouped by user story (P1–P4 from spec.md) so each story is independently completable and testable. Complete phases in order; within a phase, `[P]`-marked tasks touch different files and have no dependency on each other, so they can run in parallel (e.g., dispatched to parallel subagents or done back-to-back without re-reading unrelated files).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other `[P]` tasks in the same phase
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4) or omitted for Setup/Foundational/Polish
- File paths are exact — see plan.md's Project Structure

---

## Phase 1: Setup (project scaffold)

- [x] T001 Verify/complete `package.json` scripts (`dev`, `build`, `start`, `test`) and dependencies (`next`, `react`, `react-dom`, `nanoid`, `vitest`, `@types/*`, `typescript`) already scaffolded; run `npm install` to confirm a clean install
- [x] T002 [P] Confirm `tsconfig.json`, `next.config.ts`, `vitest.config.ts` are consistent (strict TS, Node 20 target, Vitest picking up `tests/**/*.test.ts`)
- [x] T003 [P] Add `data/` and any temp test-data paths to `.gitignore` (data file is runtime state, not source)
- [x] T004 [P] Create root `README.md` with setup (`npm install`), run (`npm run dev`), test (`npm test`) instructions and a short stack justification (Next.js App Router + file-backed store — see research.md) — required deliverable per CANDIDATE-INSTRUCTIONS.md, not just the internal quickstart.md

**Checkpoint**: `npm install` succeeds, `npm run dev` boots an empty Next.js app, `npm test` runs (even with zero tests) — all with single commands per plan.md Constraints.

---

## Phase 2: Foundational (blocking prerequisites — no user story is testable without this)

**⚠️ CRITICAL**: No user story phase can start until this phase is complete.

- [x] T005 Define domain types in `lib/types.ts` (already present — verify/extend): `ShortLink`, `Click`, `Stats`, `ClicksByDayEntry`, `TopReferrerEntry` matching data-model.md
- [x] T006 Implement `lib/store.ts`: file-backed singleton store — `Map<shortCode, ShortLink>` + `Map<shortCode, Click[]>`, attached to `globalThis` (survives Next dev-server hot reload), reads `process.env.DB_FILE_PATH` (default `data/db.json`) per research.md's test-isolation decision, loads file on first access if present, writes synchronously after every mutation
- [x] T007 [P] Unit tests for the store in `tests/unit/store.test.ts`: load-from-empty, write-then-reload round trip via `DB_FILE_PATH` pointed at a temp file, no cross-test pollution
- [x] T008 [P] Implement `lib/shortener.ts`: URL scheme validation (`http`/`https` only, FR-002), short-code generation via `nanoid` (custom URL-safe alphanumeric alphabet, length 7, FR-004), with collision retry against the store's known codes before accepting a code (Edge Cases in spec.md)
- [x] T009 [P] Unit tests for `lib/shortener.ts` in `tests/unit/shortener.test.ts`: valid `http`/`https` URLs accepted, non-`http(s)` schemes and malformed URLs rejected, generated codes are ~7 alphanumeric chars, forced collision triggers regeneration (not overwrite)
- [x] T010 [P] Implement `lib/clicks.ts`: `recordClick(shortCode, {referrer, userAgent, ip, timestamp})`, `getStats(shortCode)` computing `totalClicks`, `clicksByDay` (30 UTC-day buckets ending today, zero-filled), `topReferrers` (empty/null → `"Direct / Unknown"`, sorted by count desc, alphabetical tie-break, top 5) per data-model.md
- [x] T011 [P] Unit tests for `lib/clicks.ts` in `tests/unit/clicks.test.ts`: totals, 30-day zero-fill, referrer bucketing/tie-break/top-5 truncation, `"Direct / Unknown"` grouping

**Checkpoint**: `lib/` layer fully unit-tested and passing in isolation, with no Route Handler depending on it yet.

---

## Phase 3: User Story 1 — Create a short link (P1) 🎯 MVP

**Goal**: `POST /api/shorten` returns a working short link for a valid URL and rejects invalid ones.

**Independent Test**: `curl -X POST /api/shorten` with a valid `http(s)` URL returns 201 with `shortCode`/`shortUrl`/`originalUrl`/`createdAt`/`expiresAt`; an invalid-scheme URL returns 400.

- [x] T012 [US1] Implement `app/api/shorten/route.ts` `POST` handler: `export const runtime = 'nodejs'` (needs `fs` via the store), parse/validate body via `lib/shortener.ts`, create link via `lib/store.ts`, return 201 with the contract shape from contracts/api.md (including derived `shortUrl` built from request origin + `shortCode`)
- [x] T013 [US1] Return 400 with `{ "error": "Invalid URL: must start with http:// or https://" }` for missing/invalid `url` (contracts/api.md)
- [x] T014 [US1] Persist optional `expiresAt` as-is when provided (no future-date validation, per data-model.md)
- [x] T015 [US1] Integration tests in `tests/integration/shorten.test.ts`: valid URL → 201 with all fields; URL with `expiresAt` → stored and echoed back; non-`http(s)` URL → 400; missing `url` → 400

**Checkpoint**: US1 fully functional and testable on its own — `npm test` green, manual curl from quickstart.md step 1–2 works.

---

## Phase 4: User Story 2 — Follow a short link and have the visit tracked (P2)

**Goal**: `GET /:code` redirects and records a click; distinguishes not-found vs. expired; no click recorded on failure.

**Independent Test**: Visiting a created code redirects (301) and a click appears in stats; an unknown code returns 404; an expired code returns 410; neither failure case adds a click.

- [x] T016 [US2] Implement `app/[code]/route.ts` `GET` handler: `export const runtime = 'nodejs'`, look up `shortCode` in the store
- [x] T017 [US2] 404 with `{ "error": "Short link not found" }` when code doesn't exist (FR-006)
- [x] T018 [US2] 410 with `{ "error": "Short link has expired" }` when `expiresAt <= now`, no redirect, no click recorded (FR-007, FR-009)
- [x] T019 [US2] On success: 301 with `Location: <originalUrl>`, and record a click via `lib/clicks.ts` capturing `referrer` (from `Referer` header), `userAgent` (`User-Agent` header), `ip` (from `x-forwarded-for`/`x-real-ip` per research.md, empty string fallback), `timestamp` (server time) — FR-008
- [x] T020 [US2] Integration tests in `tests/integration/redirect.test.ts`: existing non-expired code → 301 + Location header + one click recorded with all four fields; unknown code → 404, no click added; expired code → 410, no click added; link with no `expiresAt` always redirects regardless of current time; click at exact expiry instant treated as expired (Edge Cases)

**Checkpoint**: US1 + US2 together support the full create → click demo flow end-to-end.

---

## Phase 5: User Story 3 — View analytics for a link (P3)

**Goal**: `GET /api/stats/:code` and `GET /analytics/:code` expose totals, 30-day breakdown, and top-5 referrers; analytics page is shareable (no auth).

**Independent Test**: Create a link, generate clicks with varied referrers, then confirm both the JSON stats and the rendered analytics page match.

- [x] T021 [US3] Implement `app/api/stats/[code]/route.ts` `GET`: 200 with `{ shortCode, totalClicks, clicksByDay, topReferrers }` via `lib/clicks.ts`; 404 with `{ "error": "Short link not found" }` for unknown code
- [x] T022 [P] [US3] Integration tests in `tests/integration/stats.test.ts`: totals/clicksByDay/topReferrers correctness against seeded clicks (including zero-click link → zeros, no error); unknown code → 404
- [x] T023 [US3] Invoke the `frontend-design` skill before implementing `app/analytics/[code]/page.tsx` to get aesthetic direction (typography, layout, visual hierarchy for the totals/day-breakdown/top-referrers views) — apply its guidance rather than default/templated styling
- [x] T023a [US3] Implement `app/analytics/[code]/page.tsx` as an async Server Component per the frontend-design direction from T023: reads directly from `lib/store.ts`/`lib/clicks.ts`, renders total clicks, a per-day table with a CSS-bar visualization (no charting library, per research.md), and a top-referrers table, plus the link's original/short URL for context
- [x] T024 [US3] Render a simple, well-designed HTML "link not found" state (also per frontend-design guidance, `Content-Type: text/html`, 404 status) when the analytics page is requested for an unknown code — distinct from an empty-but-existing link (FR-012, contracts/api.md)
- [x] T025 [US3] Manual/browser verification: open `/analytics/<code>` for a link with clicks and confirm it's viewable with no login by a second "observer" (simulates FR-013 shareability) — not automatable via Vitest alone, verify by hand per quickstart.md step 6

**Checkpoint**: US1 + US2 + US3 deliver the full create → click → analyze demo flow required by CANDIDATE-INSTRUCTIONS.md.

---

## Phase 6: User Story 4 — Browse all created links (P4)

**Goal**: `GET /api/urls` lists all links, newest first, with click counts.

**Independent Test**: Create several links at different times, click some, confirm listing order and counts.

- [x] T026 [US4] Implement `app/api/urls/route.ts` `GET`: 200 with an array sorted by `createdAt` descending, each entry including computed `clickCount` and `shortUrl`; empty array when no links exist (FR-010)
- [x] T027 [P] [US4] Integration tests in `tests/integration/urls.test.ts`: multiple links → newest-first order with correct `clickCount` per link; no links → `[]`, no error

**Checkpoint**: All four user stories independently functional; full spec.md acceptance scenarios covered.

---

## Phase 7: Polish & cross-cutting

- [x] T028 [P] Run full `npm test` suite end-to-end, confirm it passes and completes well under SC-006's 2-minute budget
- [x] T029 [P] Walk through quickstart.md's manual validation scenarios (steps 1–9, including the restart-durability check) against `npm run dev` to confirm real behavior matches the automated tests
- [x] T030 [P] Review commit history for readability (CANDIDATE-INSTRUCTIONS.md "histórico de commits legível") — squash/reorder only if genuinely messy; prefer one commit per phase/user story going forward rather than rewriting history after the fact
- [x] T031 [P] Final pass on `README.md`: confirm setup/run/test commands are copy-pasteable and the stack justification (Next.js App Router, file-backed store, no external DB) is stated plainly for a reviewer skimming it

---

## Dependencies & execution order

- **Phase 1 (Setup)** → **Phase 2 (Foundational)** → user story phases (3–6) → **Phase 7 (Polish)**
- Phase 2 blocks every user story phase (all Route Handlers depend on `lib/store.ts`, `lib/shortener.ts`, `lib/clicks.ts`)
- **User story order matches priority and also matches a real dependency chain here** (unlike fully independent-slice projects): US2 needs a way to create links (US1) to have something to click, and US3's stats need US2's recorded clicks to show non-zero data. Implement in P1 → P2 → P3 → P4 order; do not reorder.
- Within Phase 2, T007/T008/T009/T010/T011 are `[P]` once T005/T006 exist (T007 needs T006 specifically)
- Within each user story phase, integration tests (`[P]`-marked where noted) can be written alongside their route handler rather than strictly after, but must pass before moving to the next phase

## Parallel example (Phase 2)

```
# After T005 (types) and T006 (store) are done, these are independent files:
T007 [P] tests/unit/store.test.ts
T008 [P] lib/shortener.ts
T009 [P] tests/unit/shortener.test.ts   # depends on T008 within the pair, but independent of T010/T011
T010 [P] lib/clicks.ts
T011 [P] tests/unit/clicks.test.ts      # depends on T010 within the pair, but independent of T008/T009
```

## MVP scope (if time runs short)

Phase 1 + Phase 2 + Phase 3 (US1 only) is a deployable, demoable slice: users can create short links via the API, even without redirect/analytics/listing. Add Phase 4 (US2) next to get the core redirect+tracking value — Phases 5–6 are the payoff/convenience layers per spec.md's own priority rationale.
