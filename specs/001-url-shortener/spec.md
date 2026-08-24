# Feature Specification: URL Shortener

**Feature Branch**: `001-url-shortener`

**Created**: 2026-08-24

**Status**: Draft

**Input**: User description: "Construir um serviço de URL shortener conforme descrito em CANDIDATE-INSTRUCTIONS.md: API HTTP para criar, redirecionar e consultar links curtos (POST /api/shorten, GET /:code, GET /api/urls, GET /api/stats/:code); tracking de cliques (referrer, user-agent, ip, timestamp) a cada redirecionamento; página visual de analytics em /analytics/:code mostrando total de cliques, cliques por dia (últimos 30 dias) e top referrers, fácil de compartilhar com quem criou o link; testes unitários e/ou integração rodando com um único comando. Regras de negócio: short code alfanumérico de ~7 caracteres; expiresAt opcional respeitado no redirect (410 se expirado, 404 se não existe); validação de URL somente http/https (400 se inválida); GET /:code redireciona com 301 e registra o clique; GET /api/urls lista mais recentes primeiro com contagem de cliques."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a short link (Priority: P1)

A user with a long URL wants to turn it into a short, shareable link, optionally with an expiration date, so they can distribute it more easily.

**Why this priority**: This is the entry point of the whole product — without the ability to create a short link, nothing else in the system has a reason to exist. It is also the smallest deliverable slice that produces a visible artifact (a short link).

**Independent Test**: Can be fully tested by submitting a valid `http`/`https` URL and verifying a short link is returned with a unique code, and by submitting an invalid URL (e.g., missing scheme, or a non-http(s) scheme) and verifying it is rejected.

**Acceptance Scenarios**:

1. **Given** a valid `http://` or `https://` URL, **When** the user submits it for shortening, **Then** the system returns a short code (~7 alphanumeric characters), the full short link, the original URL, and a creation timestamp.
2. **Given** a URL with an optional expiration date/time, **When** the user submits it for shortening, **Then** the created short link stores that expiration and returns it in the response.
3. **Given** a URL that does not use `http://` or `https://` (or is otherwise malformed), **When** the user submits it for shortening, **Then** the system rejects the request and explains the URL is invalid.

---

### User Story 2 - Follow a short link and have the visit tracked (Priority: P2)

Anyone who receives a short link wants to open it and land on the original destination, and the system needs to silently record that this visit happened, capturing enough detail to power analytics later.

**Why this priority**: This is the core value exchange of a URL shortener — turning a short code into a working redirect — and it is the mechanism that produces all the data the analytics feature depends on. Without it, created links are useless and there is no data to analyze.

**Independent Test**: Can be fully tested by visiting a previously created short link and confirming it forwards to the original destination, that a visit record is captured with the expected details, and that non-existent or expired links produce the correct distinct outcomes instead of a redirect.

**Acceptance Scenarios**:

1. **Given** an existing, non-expired short link, **When** someone visits it, **Then** they are redirected to the original URL and a click is recorded with the visit's referrer, user-agent, IP address, and timestamp.
2. **Given** a short code that was never created, **When** someone visits it, **Then** the system indicates the link does not exist and does not redirect.
3. **Given** a short link whose expiration date has passed, **When** someone visits it, **Then** the system indicates the link has expired and does not redirect (and no successful visit is recorded).
4. **Given** a short link with no expiration set, **When** someone visits it at any point in time, **Then** it always redirects successfully.

---

### User Story 3 - View analytics for a link (Priority: P3)

The person who created a short link (or anyone they share it with) wants to open a visual page showing how the link has performed: total clicks, a breakdown of clicks per day over the last month, and where the traffic is coming from.

**Why this priority**: Analytics is the payoff feature that makes tracked clicks meaningful and shareable, but it depends entirely on links existing (P1) and clicks being recorded (P2). It is independently testable and demonstrable once those are in place.

**Independent Test**: Can be fully tested by creating a link, generating a handful of clicks with different referrers, then opening the link's analytics view and verifying the total, the daily breakdown, and the top referrers match what was generated.

**Acceptance Scenarios**:

1. **Given** a short link with recorded clicks, **When** its analytics page/view is opened, **Then** it shows the total number of clicks, a per-day breakdown for the last 30 days, and the top 5 referrers ranked by click count.
2. **Given** a short link with zero clicks, **When** its analytics page/view is opened, **Then** it shows a total of zero and empty breakdowns without erroring.
3. **Given** an analytics view link, **When** it is shared with someone else (e.g., the link's creator sharing it with a teammate), **Then** that person can open it directly in a browser and see the same data without needing to create anything themselves.

---

### User Story 4 - Browse all created links (Priority: P4)

A user wants to see every short link that has been created, most recent first, along with how many clicks each one has, to get an overview without looking up codes individually.

**Why this priority**: This is a convenience/overview capability layered on top of the other three stories. It adds value once several links exist but is not required for the shortener or analytics to function.

**Independent Test**: Can be fully tested by creating multiple links at different times, generating clicks on some of them, and verifying the listing returns them newest-first with accurate click counts.

**Acceptance Scenarios**:

1. **Given** multiple short links created at different times, **When** the list is requested, **Then** links are returned ordered from most recently created to oldest, each showing its click count.
2. **Given** no short links have been created yet, **When** the list is requested, **Then** an empty list is returned without erroring.

---

### Edge Cases

- What happens when a URL is submitted that technically parses but points to a non-existent domain? (Out of scope to validate reachability — only scheme/format validation is required.)
- How does the system handle two links happening to generate the same short code? (Code generation must guarantee uniqueness before a link is considered created.)
- How does the system handle a click occurring at the exact moment a link expires? (Treated as expired if the expiration timestamp is at or before the time of the visit.)
- How does the system handle requests to the analytics or stats view for a short code that was never created? (Should indicate not found rather than showing an empty/misleading dashboard.)
- How does the system handle an extremely high volume of clicks on one link in a short period? (Every click should still be counted; exact real-time consistency under extreme load is not a hard requirement for v1.)
- How does the system handle a missing or unusual referrer/user-agent on a visit (e.g., direct navigation, privacy-focused browser)? (Recorded as empty/unknown rather than causing an error.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a user to submit a URL and receive back a newly created short link, including a unique short code, the full short link, the original URL, and its creation timestamp.
- **FR-002**: System MUST validate that a submitted URL uses only the `http` or `https` scheme, and MUST reject submissions that don't with a clear error indicating the URL is invalid.
- **FR-003**: System MUST accept an optional expiration date/time when creating a short link and MUST persist it alongside the link.
- **FR-004**: System MUST generate short codes that are alphanumeric and approximately 7 characters long, and MUST guarantee each generated code is unique among active/known links.
- **FR-005**: System MUST redirect visitors of an existing, non-expired short link to the original URL.
- **FR-006**: System MUST indicate a distinct "not found" outcome when a visited short code does not correspond to any created link.
- **FR-007**: System MUST indicate a distinct "expired" outcome when a visited short code corresponds to a link whose expiration has passed, and MUST NOT redirect in that case.
- **FR-008**: System MUST record a click every time a short link successfully redirects, capturing the referrer, user-agent, source IP address, and the timestamp of the visit.
- **FR-009**: System MUST NOT record a successful click for visits that result in "not found" or "expired" outcomes.
- **FR-010**: System MUST provide a way to list all created short links ordered from most recently created to oldest, with each entry showing its total click count.
- **FR-011**: System MUST provide a way to retrieve statistics for a given short link: total clicks, a breakdown of clicks per day for the last 30 days, and the top 5 referrers ranked by click count descending (ties broken alphabetically; missing/empty referrer grouped as "Direct / Unknown" and ranked alongside named referrers).
- **FR-012**: System MUST provide a human-viewable analytics page for a given short link, showing the same total clicks, per-day breakdown, and top referrers, viewable directly in a browser without additional setup.
- **FR-013**: The analytics page MUST be shareable — a person other than the link's creator must be able to open it (e.g., via a direct URL) and see the same data.
- **FR-014**: System MUST expose an automated way to run its test suite with a single command, and that suite must pass in order for the feature to be considered complete.

### Key Entities

- **Short Link**: Represents a shortened URL. Key attributes: unique short code, original destination URL, creation timestamp, optional expiration timestamp.
- **Click**: Represents a single recorded visit to a short link. Key attributes: which short link it belongs to, referrer, user-agent, source IP address, and the timestamp of the visit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from having a long URL to having a working short link in a single request/action.
- **SC-002**: 100% of visits to a valid, non-expired short link result in a correct redirect to the original URL.
- **SC-003**: 100% of successful redirects produce exactly one corresponding click record with referrer, user-agent, IP, and timestamp captured.
- **SC-004**: Anyone with a link's analytics page URL — not just its creator — can view that link's total clicks, daily breakdown, and top referrers without any additional setup or account.
- **SC-005**: The full demo flow (create a link, click it multiple times, view analytics) can be completed end-to-end by a new observer in under 5 minutes.
- **SC-006**: The entire automated test suite can be run with one command and completes in under 2 minutes.

## Assumptions

- No authentication/authorization is required in v1: any created link's data (list, stats, analytics) is accessible to anyone who has the code or is browsing the app — this matches the take-home's emphasis on shareability over access control.
- "Alphanumeric, ~7 characters" is treated as a target, not an exact contract; case-sensitivity and character set (e.g., mixed-case letters + digits) are an implementation choice as long as codes stay unique and URL-safe.
- `clicksByDay` covers the last 30 calendar days relative to when stats are requested, in a single consistent timezone (UTC) for the whole system.
- "Top referrers" means the **top 5** distinct referrer values, ranked by number of clicks in descending order; ties are broken alphabetically by referrer value. A missing/empty referrer (e.g., direct navigation, privacy-blocked header) is grouped into a single "Direct / Unknown" bucket that competes for ranking like any other referrer value. If fewer than 5 distinct referrers have been recorded, the list simply contains however many exist (no padding).
- Reachability of the destination URL (DNS, live server, etc.) is never validated at creation time — only scheme/format validity is checked.
- Deleting or editing an existing short link is out of scope for v1; only creation, redirect, listing, and stats/analytics are required.
- Rate limiting and abuse prevention (e.g., someone farming clicks) are out of scope for v1.
