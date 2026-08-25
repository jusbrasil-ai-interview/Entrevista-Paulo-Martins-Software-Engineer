import { getStats } from "@/lib/clicks";
import { getLink } from "@/lib/store";
import { errorResponse } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await params;

  if (!getLink(code)) {
    return errorResponse(404, "NOT_FOUND", "Short link not found");
  }

  return Response.json(getStats(code), { status: 200 });
}
