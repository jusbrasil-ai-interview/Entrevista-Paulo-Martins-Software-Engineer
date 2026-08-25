import { getStats } from "@/lib/clicks";
import { getLink } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await params;

  if (!getLink(code)) {
    return Response.json({ error: "Short link not found" }, { status: 404 });
  }

  return Response.json(getStats(code), { status: 200 });
}
