# API Contracts: URL Shortener

Base URL: `http://localhost:<port>` (single service, no versioning prefix needed at this scope).

## POST /api/shorten

Create a new short link.

**Request body** (`application/json`):
```json
{
  "url": "https://example.com/some/long/path",
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```
- `url` (string, required): must start with `http://` or `https://`.
- `expiresAt` (string, optional): ISO 8601 timestamp. Omit or `null` for no expiration.

**Success response** — `201 Created`:
```json
{
  "shortCode": "aZ3kQ9x",
  "shortUrl": "http://localhost:3000/aZ3kQ9x",
  "originalUrl": "https://example.com/some/long/path",
  "createdAt": "2026-08-24T18:00:00.000Z",
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```

**Error response** — `400 Bad Request` (missing/invalid `url`):
```json
{ "error": "Invalid URL: must start with http:// or https://" }
```

---

## GET /:code

Redirect to the original URL and record a click.

**Path params**: `code` — the short code.

**Success response** — `301 Moved Permanently`, `Location: <originalUrl>`, no body required.

**Error responses**:
- `404 Not Found` — `code` does not correspond to any created link:
  ```json
  { "error": "Short link not found" }
  ```
- `410 Gone` — `code` exists but its `expiresAt` has passed:
  ```json
  { "error": "Short link has expired" }
  ```

**Side effect**: On `301` only, a Click is recorded with `referrer` (from the `Referer` request header), `userAgent` (from the `User-Agent` header), `ip` (from the request's remote address), and `timestamp` (server time at request). No Click is recorded on `404`/`410`.

---

## GET /api/urls

List all created short links, most recent first.

**Success response** — `200 OK`:
```json
[
  {
    "shortCode": "aZ3kQ9x",
    "shortUrl": "http://localhost:3000/aZ3kQ9x",
    "originalUrl": "https://example.com/some/long/path",
    "createdAt": "2026-08-24T18:00:00.000Z",
    "expiresAt": null,
    "clickCount": 12
  }
]
```
Empty array (`[]`) when no links exist.

---

## GET /api/stats/:code

Retrieve click statistics for one short link.

**Path params**: `code` — the short code.

**Success response** — `200 OK`:
```json
{
  "shortCode": "aZ3kQ9x",
  "totalClicks": 12,
  "clicksByDay": [
    { "date": "2026-07-26", "count": 0 },
    { "date": "2026-08-24", "count": 5 }
  ],
  "topReferrers": [
    { "referrer": "https://twitter.com/", "count": 6 },
    { "referrer": "Direct / Unknown", "count": 3 }
  ]
}
```
- `clicksByDay` always contains exactly 30 entries (one per UTC calendar day, oldest first, ending today), including zero-count days.
- `topReferrers` contains at most 5 entries, sorted by `count` descending, alphabetical tie-break.

**Error response** — `404 Not Found` (unknown `code`):
```json
{ "error": "Short link not found" }
```

---

## GET /analytics/:code

Server-rendered HTML page, viewable directly in a browser, showing the same data as `GET /api/stats/:code` (total clicks, a table/chart of clicks per day for the last 30 days, and the top 5 referrers) plus the link's original URL and short URL for context.

**Success response** — `200 OK`, `Content-Type: text/html`.

**Error response** — `404 Not Found`, `Content-Type: text/html`, a simple human-readable "link not found" page (not a JSON error, since this is a browser-facing route).
