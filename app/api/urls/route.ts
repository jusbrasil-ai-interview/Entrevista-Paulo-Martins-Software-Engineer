import { getClicks, listLinks } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;

  const links = listLinks()
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .map((link) => ({
      ...link,
      shortUrl: `${origin}/${link.shortCode}`,
      clickCount: getClicks(link.shortCode).length,
    }));

  return Response.json(links, { status: 200 });
}
