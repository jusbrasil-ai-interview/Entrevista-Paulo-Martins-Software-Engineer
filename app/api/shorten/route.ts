import { generateUniqueShortCode, validateUrl } from "@/lib/shortener";
import { createLink } from "@/lib/store";
import { errorResponse } from "@/lib/errors";

export const runtime = "nodejs";

const INVALID_URL_ERROR = "Invalid URL: must start with http:// or https://";
const INVALID_BODY_ERROR = "Request body must be valid JSON";
const INVALID_EXPIRES_AT_ERROR = "expiresAt must be a valid ISO 8601 date-time string";

export async function POST(request: Request): Promise<Response> {
  let body: { url?: unknown; expiresAt?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_BODY", INVALID_BODY_ERROR);
  }

  const url = body.url;
  if (typeof url !== "string" || !validateUrl(url)) {
    return errorResponse(400, "INVALID_URL", INVALID_URL_ERROR);
  }

  if (body.expiresAt !== undefined && body.expiresAt !== null) {
    if (typeof body.expiresAt !== "string" || Number.isNaN(Date.parse(body.expiresAt))) {
      return errorResponse(400, "INVALID_EXPIRES_AT", INVALID_EXPIRES_AT_ERROR);
    }
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
