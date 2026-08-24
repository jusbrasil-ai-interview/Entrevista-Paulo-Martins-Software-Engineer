<!--
Sync Impact Report
- Version change: (unratified template) → 1.0.0
- Modified principles: n/a (initial ratification — all 5 principle slots filled for the first time)
- Added sections: Core Principles (I–V), Technology & Scope Constraints, Development Workflow, Governance
- Removed sections: none
- Templates requiring updates: none checked automatically by this command (plan/spec/tasks templates
  are read at runtime and were not modified here); a manual skim of plan-template.md and
  tasks-template.md against the new principles is recommended next time either is regenerated.
- Follow-up TODOs: none — all placeholders resolved from user-supplied project definition.
-->

# URL Shortener Constitution

## Core Principles

### I. Test-First Delivery (NON-NEGOTIABLE)

Every functional requirement in `spec.md` MUST have a corresponding automated test before it is
considered done. All tests MUST run via a single command (`npm test`) and MUST pass — a feature
without a passing, single-command test suite is not complete, regardless of manual verification.

**Rationale**: This project is built under a hard time-box and judged on both "does it work" and
"is it tested." A single, reliable test command is the only way to prove correctness quickly to
an outside observer (interviewer, teammate, or future self) without re-running a manual demo.

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

## Technology & Scope Constraints

- **Stack**: Next.js (App Router) + React + TypeScript. API endpoints are implemented as Next.js
  Route Handlers; the analytics view (`/analytics/:code`) is a React Server Component.
- **Persistence**: A single local JSON file (`data/db.json`) is the system of record. Data is kept
  in an in-process in-memory structure for fast reads and writes are flushed to that file so state
  survives a process restart. No external database, cache, or managed storage service is used.
  This file is runtime state, not source, and MUST be git-ignored.
- **Runtime constraint**: any Route Handler that touches the store MUST run on the Node.js runtime
  (not Edge), since the store requires filesystem access.
- **Out of scope for this project** (per `spec.md` Assumptions): authentication/authorization,
  editing or deleting existing short links, rate limiting/abuse prevention, and multi-instance or
  concurrent-writer support for the data file.

## Development Workflow

- Spec Kit artifacts flow in one direction: `spec.md` → `plan.md`/`research.md` →
  `contracts/api.md` + `data-model.md` → `tasks.md` → implementation. A change that starts at the
  implementation layer (e.g., "the code now does X") MUST be reflected back upstream in the same
  change, per Principle V.
- Before implementation work on a task is considered finished, its automated test(s) MUST exist
  and pass under the single `npm test` command (Principle I).
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
Principles I–V above; if a violation is genuinely necessary, record the trade-off in `plan.md`'s
Complexity Tracking table rather than silently proceeding.

**Version**: 1.0.0 | **Ratified**: 2026-08-24 | **Last Amended**: 2026-08-24
