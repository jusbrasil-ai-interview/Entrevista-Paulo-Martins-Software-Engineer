<!--
Sync Impact Report
- Version change: 1.0.0 → 2.0.0
- Modified principles:
  - I. Test-First Delivery (NON-NEGOTIABLE) → I. Test-First Delivery, API-Focused
    (narrowed scope: automated tests are required for behavior that directly impacts the
    HTTP API contract; incidental/internal implementation details are not required to have
    dedicated tests)
  - II. Simplicity Over Premature Engineering → unchanged in substance, renumbered
- Added principles:
  - VI. SOLID Design (NEW) — implementation code must follow SOLID
- Added sections: none structurally new; Technology & Scope Constraints rewritten to mandate
  TypeScript (strict mode) and React 19, and to codify testing-practice expectations
  (Arrange-Act-Assert, behavior over implementation, no over-mocking of the system under test)
- Removed sections: none
- Templates requiring updates: plan-template.md / tasks-template.md are not present in this repo
  (Spec Kit scaffold was intentionally removed) — no automated template sync performed.
- Follow-up TODOs: none — all placeholders resolved.
-->

# URL Shortener Constitution

## Core Principles

### I. Test-First Delivery, API-Focused

Every functional requirement in `spec.md` that is reachable through the HTTP API (a Route Handler,
its request/response shape, its status codes, its error cases) MUST have a corresponding automated
test before it is considered done. All tests MUST run via a single command (`npm test`) and MUST
pass.

Tests MUST target observable API behavior (request in → response/status/side-effect out), not
internal implementation details. A helper function, a private module, or a component with no
direct bearing on an API contract does not require its own dedicated test merely because it
exists — it is covered indirectly through the API-level test that exercises it. Do not write tests
whose only purpose is to increase coverage of code that has no independent behavioral contract.

Test practice MUST follow standard best practices:
- Arrange-Act-Assert (or Given/When/Then) structure, one behavior asserted per test.
- Test names describe the behavior and expected outcome, not the implementation ("returns 404 when
  the short code does not exist", not "test4").
- Prefer real collaborators over mocks/stubs; mock only true external boundaries (e.g., system
  clock, randomness/ID generation) — never mock the module under test or the in-process store just
  to avoid exercising it.
- No test may depend on the execution order or leftover state of another test.

**Rationale**: This project is built under a hard time-box and judged on both "does it work" and
"is it tested." Testing at the API boundary gives the highest confidence per test written and
avoids burning the time-box on tests for code that has no contract of its own to break.

### II. Simplicity Over Premature Engineering

The implementation MUST NOT introduce abstractions, dependencies, or infrastructure beyond what
the current spec requires. Concretely: no authentication/authorization layer, no multi-instance or
horizontal-scaling support, no external database or cache, and no abstraction layer (e.g., a
generic repository interface) introduced "for future flexibility" without a current, spec-backed
need. YAGNI applies by default.

**Rationale**: The spec (`specs/001-url-shortener/spec.md`) explicitly scopes out auth, scaling,
and rate limiting. Extra structure added ahead of need burns the time-box and adds surface area to
review without adding demonstrable value.

### III. Single-Command Startup

`npm install` followed by `npm run dev` MUST be sufficient to run the full application locally —
API endpoints, redirect route, and the analytics page — with no additional manual setup steps
(no separate database to provision, no environment file required to boot in a working default
state).

**Rationale**: The deliverable is judged partly on "roda com um comando." Any hidden setup step is
a demo risk and a violation of the take-home's non-functional requirements.

### IV. Explicit API Contracts

Every HTTP endpoint's request/response shape, status codes, and error cases MUST be documented in
`specs/001-url-shortener/contracts/api.md` before (or in the same change as) its implementation.
A behavior change to an endpoint (new field, changed status code, changed error shape) MUST update
that file in the same change.

**Rationale**: `contracts/api.md` is the single source of truth other artifacts (tests, the
analytics UI, the demo script in `quickstart.md`) are built against. Letting code and contract
drift apart defeats the purpose of writing the contract down at all.

### V. Spec-Driven Change

`spec.md` and `plan.md` govern implementation, not the reverse. When a technical decision changes
(e.g., the choice of framework or persistence mechanism), `plan.md` (and `research.md` where a
rationale was recorded) MUST be updated to reflect the new decision *before or alongside* the code
change that implements it. Implementation MUST NOT silently diverge from what the spec/plan
describe.

**Rationale**: This project's stack was revised more than once during planning (framework,
persistence). Keeping the documented plan authoritative — updated at the moment a decision changes
— is what makes the artifacts trustworthy instead of stale decoration.

### VI. SOLID Design

Implementation code MUST follow SOLID:
- **Single Responsibility**: a module/class/function has one reason to change (e.g., URL
  generation, persistence, and HTTP request/response handling live in separate units, not one
  Route Handler doing all three inline).
- **Open/Closed**: extend behavior (e.g., a new redirect rule, a new analytics metric) by adding
  new code, not by editing unrelated branches of existing working code.
- **Liskov Substitution**: any implementation of an interface/type (e.g., a store implementation)
  MUST be substitutable for another without breaking callers' expectations.
- **Interface Segregation**: consumers depend only on the methods/fields they actually use — no
  fat, catch-all interfaces forced onto a caller that needs one operation.
- **Dependency Inversion**: Route Handlers and UI components depend on small, explicit
  abstractions (e.g., a `LinkStore` interface) rather than reaching directly into concrete
  persistence details; the concrete implementation is composed at the edge.

SOLID is applied pragmatically, bounded by Principle II (Simplicity): introduce an abstraction
(e.g., a store interface) only where it is already needed to satisfy SOLID for the current scope
(swap-in-memory-for-file-backed persistence is a real, present need in this project) — not
speculatively for hypothetical future consumers.

**Rationale**: The codebase is TypeScript/React and evaluated as production-representative code,
not throwaway script code. SOLID keeps Route Handlers, the store, and UI components independently
testable and changeable without the whole file needing a rewrite for each new requirement.

## Technology & Scope Constraints

- **Language**: TypeScript in `strict` mode across the entire codebase (app, lib, tests). `any` is
  disallowed except at an explicit, commented external-boundary cast (e.g., parsing untrusted JSON
  from the request body), and MUST be narrowed immediately after.
- **Stack**: Next.js (App Router) + React 19 + TypeScript. API endpoints are implemented as
  Next.js Route Handlers; the analytics view (`/analytics/:code`) is a React Server Component.
  Client Components are used only where interactivity strictly requires them (e.g., a copy-to-
  clipboard button), per React 19's server-first default.
- **Persistence**: A single local JSON file (`data/db.json`) is the system of record. Data is kept
  in an in-process in-memory structure for fast reads and writes are flushed to that file so state
  survives a process restart. No external database, cache, or managed storage service is used.
  This file is runtime state, not source, and MUST be git-ignored. Access to it MUST go through a
  small store abstraction (Principle VI, Dependency Inversion), not ad-hoc `fs` calls scattered
  across Route Handlers.
- **Runtime constraint**: any Route Handler that touches the store MUST run on the Node.js runtime
  (not Edge), since the store requires filesystem access.
- **Testing**: Vitest (+ Supertest-equivalent request helper for Route Handlers, if needed) is the
  single test runner, run via `npm test`. Tests live alongside or under a `tests/` directory
  mirroring the API surface, and follow the practices in Principle I.
- **Out of scope for this project** (per `spec.md` Assumptions): authentication/authorization,
  editing or deleting existing short links, rate limiting/abuse prevention, and multi-instance or
  concurrent-writer support for the data file.

## Development Workflow

- Spec Kit artifacts flow in one direction: `spec.md` → `plan.md`/`research.md` →
  `contracts/api.md` + `data-model.md` → `tasks.md` → implementation. A change that starts at the
  implementation layer (e.g., "the code now does X") MUST be reflected back upstream in the same
  change, per Principle V.
- Before implementation work on a task is considered finished, its automated API-level test(s)
  MUST exist and pass under the single `npm test` command (Principle I), and the changed code MUST
  respect SOLID (Principle VI).
- Manual verification (the `quickstart.md` demo flow) is a supplement to automated tests, not a
  replacement for them.

## Governance

This constitution supersedes ad-hoc practice for this project. Amendments are made by editing this
file directly (there is no separate approval body for a single-person take-home project) and MUST
include a Sync Impact Report comment at the top of the file describing what changed and why.

**Versioning policy**: semantic versioning for this document —
MAJOR for backward-incompatible principle removals/redefinitions, MINOR for a new principle or
materially expanded guidance, PATCH for wording/clarification fixes.

**Compliance review**: before marking any task in `tasks.md` complete, verify it does not violate
Principles I–VI above; if a violation is genuinely necessary, record the trade-off in `plan.md`'s
Complexity Tracking table rather than silently proceeding.

**Version**: 2.0.0 | **Ratified**: 2026-08-24 | **Last Amended**: 2026-08-25
