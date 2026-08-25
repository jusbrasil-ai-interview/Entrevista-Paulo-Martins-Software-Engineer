# Quickstart: URL Shortener

Validates the feature end-to-end, matching the demo flow in CANDIDATE-INSTRUCTIONS.md: create a short link, click it a few times, view analytics.

## Prerequisites

- Node.js 20 LTS installed.
- Repository cloned/checked out at the `001-url-shortener` feature.

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Starts the service on `http://localhost:3000` (or `$PORT` if set). A `data/db.json` file is created on first write if it doesn't already exist.

## Run tests

```bash
npm test
```

Runs the full unit + integration suite (Vitest, calling Route Handlers directly) once and exits non-zero on any failure. Tests use an isolated/temporary data file and never touch the developer's real `data/db.json`.

## Manual validation scenarios

1. **Create a short link**
   ```bash
   curl -s -X POST http://localhost:3000/api/shorten \
     -H 'Content-Type: application/json' \
     -d '{"url":"https://example.com/some/very/long/path"}'
   ```
   Expected: `201` with `shortCode`, `shortUrl`, `originalUrl`, `createdAt`, `expiresAt: null`. See [contracts/api.md](./contracts/api.md).

2. **Reject an invalid URL**
   ```bash
   curl -s -X POST http://localhost:3000/api/shorten \
     -H 'Content-Type: application/json' \
     -d '{"url":"ftp://example.com/file"}'
   ```
   Expected: `400` with an error message.

3. **Click the short link a few times**
   ```bash
   curl -sI http://localhost:3000/<shortCode>
   curl -sI -e "https://twitter.com/" http://localhost:3000/<shortCode>
   curl -sI http://localhost:3000/<shortCode>
   ```
   Expected: each call returns `301` with a `Location` header pointing at the original URL.

4. **List all links**
   ```bash
   curl -s http://localhost:3000/api/urls
   ```
   Expected: the created link appears first (most recent), with `clickCount: 3`.

5. **View JSON stats**
   ```bash
   curl -s http://localhost:3000/api/stats/<shortCode>
   ```
   Expected: `totalClicks: 3`, `clicksByDay` covering the last 30 days, `topReferrers` reflecting the referrers used above (including a "Direct / Unknown" entry for the requests with no referrer).

6. **View the analytics page**
   Open `http://localhost:3000/analytics/<shortCode>` in a browser. Expected: total clicks, a per-day table/chart, and a top-referrers table matching step 5 — and this same URL works for anyone it's shared with, with no login.

7. **Confirm expiration handling**
   ```bash
   curl -s -X POST http://localhost:3000/api/shorten \
     -H 'Content-Type: application/json' \
     -d '{"url":"https://example.com/expired","expiresAt":"2000-01-01T00:00:00.000Z"}'
   curl -sI http://localhost:3000/<newShortCode>
   ```
   Expected: creation succeeds (`201`), but visiting it returns `410 Gone` and does not redirect.

8. **Confirm not-found handling**
   ```bash
   curl -sI http://localhost:3000/doesNotExist
   ```
   Expected: `404 Not Found`.

9. **Restart durability check**
   Stop the server (Ctrl+C), run `npm run dev` again, then repeat step 4. Expected: previously created links and click counts are still present, proving the file-backed store survives a restart.
