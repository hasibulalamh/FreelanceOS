import { NextResponse } from "next/server";

// Consistent JSON envelope for all API routes:
//   success: { ok: true, data }
//   failure: { ok: false, error: { message, details? } }
// Client code can rely on this shape instead of parsing ad-hoc responses.

export function ok(data, init) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message, status = 400, details) {
  return NextResponse.json(
    { ok: false, error: { message, ...(details ? { details } : {}) } },
    { status }
  );
}

/**
 * Parses a JSON request body, returning null instead of throwing so callers
 * can respond with a clean 400. Empty bodies parse to null.
 */
export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
