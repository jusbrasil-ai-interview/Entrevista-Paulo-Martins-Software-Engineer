import { recordClick } from "@/lib/clicks";
import { getLink } from "@/lib/store";
import { errorResponse } from "@/lib/errors";

export const runtime = "nodejs";

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "";
}

function isExpired(expiresAt: string | null, at: string): boolean {
  return expiresAt !== null && expiresAt <= at;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await params;
  const link = getLink(code);

  if (!link) {
    return errorResponse(404, "NOT_FOUND", "Short link not found");
  }

  const now = new Date().toISOString();
  if (isExpired(link.expiresAt, now)) {
    return errorResponse(410, "EXPIRED", "Short link has expired");
  }

  recordClick(code, {
    referrer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
    ip: getClientIp(request),
    timestamp: now,
  });

  return new Response(null, {
    status: 301,
    headers: { Location: link.originalUrl },
  });
}
