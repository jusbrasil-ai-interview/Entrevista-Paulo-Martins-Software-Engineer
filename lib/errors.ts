export type ErrorCode =
  | "INVALID_BODY"
  | "INVALID_URL"
  | "INVALID_EXPIRES_AT"
  | "NOT_FOUND"
  | "EXPIRED";

/**
 * Consistent error envelope across every route: `error` stays the existing
 * human-readable message (routes/tests already assert on it), `code` adds a
 * stable machine-readable discriminator so clients can branch on error type
 * without parsing prose.
 */
export function errorResponse(status: number, code: ErrorCode, message: string): Response {
  return Response.json({ error: message, code }, { status });
}
