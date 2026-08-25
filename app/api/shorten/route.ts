import { generateUniqueShortCode, validateUrl } from "@/lib/shortener";
import { createLink } from "@/lib/store";

export const runtime = "nodejs";

const INVALID_URL_ERROR = "Invalid URL: must start with http:// or https://";

export async function POST(request: Request): Promise<Response> {
  let body: { url?: unknown; expiresAt?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: INVALID_URL_ERROR }, { status: 400 });
  }

  const url = body.url;
  if (typeof url !== "string" || !validateUrl(url)) {
    return Response.json({ error: INVALID_URL_ERROR }, { status: 400 });
  }

  const expiresAt = typeof body.expiresAt === "string" ? body.expiresAt : null;
  const shortCode = generateUniqueShortCode();
  const createdAt = new Date().toISOString();

  createLink({ shortCode, originalUrl: url, createdAt, expiresAt });

  const origin = new URL(request.url).origin;
  return Response.json(
    {
      shortCode,
      shortUrl: `${origin}/${shortCode}`,
      originalUrl: url,
      createdAt,
      expiresAt,
    },
    { status: 201 },
  );
}
