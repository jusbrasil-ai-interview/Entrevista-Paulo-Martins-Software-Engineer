import { getClicks, listLinks } from "@/lib/store";

export const runtime = "nodejs";

/** Parses a positive-integer query param; falls back to `undefined` for anything absent or invalid. */
function parsePositiveInt(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  const sorted = listLinks()
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

  const offset = parsePositiveInt(requestUrl.searchParams.get("offset")) ?? 0;
  const limit = parsePositiveInt(requestUrl.searchParams.get("limit"));
  const page = limit === undefined ? sorted.slice(offset) : sorted.slice(offset, offset + limit);

  const links = page.map((link) => ({
    ...link,
    shortUrl: `${origin}/${link.shortCode}`,
    clickCount: getClicks(link.shortCode).length,
  }));

  // Bare array kept for backward compatibility with the documented contract;
  // total count is exposed via header so clients can still paginate properly.
  return Response.json(links, { status: 200, headers: { "X-Total-Count": String(sorted.length) } });
}
