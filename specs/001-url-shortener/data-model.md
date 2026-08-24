# Phase 1 Data Model: URL Shortener

Derived from the Key Entities and Functional Requirements in [spec.md](./spec.md).

## ShortLink

Represents one shortened URL.

| Field | Type | Required | Notes |
|---|---|---|---|
| `shortCode` | string | yes | ~7-character alphanumeric, unique across all links (FR-004). Primary key. |
| `originalUrl` | string | yes | Must be `http://` or `https://` (FR-002). Validated at creation, not re-validated on read. |
| `createdAt` | ISO 8601 timestamp (string) | yes | Set at creation, immutable. |
| `expiresAt` | ISO 8601 timestamp (string) \| null | no | Absent/`null` means "never expires" (FR-003). |

**Validation rules**:
- `originalUrl` scheme MUST be `http` or `https`; anything else is rejected at creation (400-equivalent per spec's User Story 1, Scenario 3).
- `shortCode` uniqueness MUST be checked before a link is considered created (Edge Cases: code collisions must regenerate, never overwrite).
- `expiresAt`, if present, MUST be a valid timestamp; no constraint that it be in the future at creation time (an already-past `expiresAt` simply means the link is expired immediately — acceptable per spec, no special-cased validation required).

**Derived/read-only values** (not stored, computed on read):
- `shortUrl` — `originalUrl`'s short-link equivalent, built from `shortCode` + the service's own base URL at response time (FR-001).
- `clickCount` — count of associated Click records (used by the listing in FR-010).
- `isExpired` — `expiresAt !== null && expiresAt <= now` (used by the redirect flow, FR-007).

**State transitions**: None beyond creation. No update/delete operations are in scope (spec.md Assumptions). A link's only observable state change over time is "not yet expired" → "expired," which is computed from `expiresAt` vs. current time rather than stored explicitly.

## Click

Represents one recorded visit that resulted in a successful redirect.

| Field | Type | Required | Notes |
|---|---|---|---|
| `shortCode` | string | yes | Foreign key to the `ShortLink` it belongs to. |
| `referrer` | string \| null | no | `null`/empty is normalized to a "Direct / Unknown" bucket at aggregation time (spec.md Edge Cases, Assumptions). |
| `userAgent` | string \| null | no | Captured as-is from the request; `null` if absent. |
| `ip` | string | yes | Source IP of the request. |
| `timestamp` | ISO 8601 timestamp (string) | yes | Time of the visit; used for both `clicksByDay` bucketing and overall ordering. |

**Validation rules**:
- A Click is only ever created alongside a successful redirect (FR-008); "not found" and "expired" outcomes MUST NOT produce a Click (FR-009).
- No uniqueness constraint — a link can accumulate unlimited Click records.

**Relationships**: Many `Click` records belong to exactly one `ShortLink` (via `shortCode`). Deleting a `ShortLink` is out of scope, so no cascade-delete behavior is required.

## Stats (derived / response-shape only — not a stored entity)

Computed on demand from a `ShortLink`'s associated `Click` records (FR-011, FR-012):

| Field | Type | Computation |
|---|---|---|
| `totalClicks` | number | `count(Click where shortCode = X)` |
| `clicksByDay` | array of `{ date: 'YYYY-MM-DD', count: number }` | Clicks bucketed by UTC calendar day, covering the last 30 days ending today; days with zero clicks are included with `count: 0` so charts/tables render a continuous range. |
| `topReferrers` | array of `{ referrer: string, count: number }`, max length 5 | Grouped by `referrer` (empty/`null` → `"Direct / Unknown"`), sorted by `count` descending, ties broken alphabetically by `referrer`, truncated to top 5. |

## Persistence shape (file store)

The on-disk JSON file (`data/db.json`) mirrors the in-memory store directly to keep load/save trivial:

```json
{
  "links": {
    "<shortCode>": { "shortCode": "...", "originalUrl": "...", "createdAt": "...", "expiresAt": null }
  },
  "clicks": {
    "<shortCode>": [ { "referrer": null, "userAgent": "...", "ip": "...", "timestamp": "..." } ]
  }
}
```

This shape is an implementation detail of `services/store.ts` (see plan.md) and is not part of any public contract.
