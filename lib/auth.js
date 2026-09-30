import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth-options";

/**
 * Server components / route handlers: returns the session or null.
 * Passing only authOptions is the supported v4 App Router form.
 */
export async function auth() {
  return getServerSession(authOptions);
}

/**
 * Route handler helper: returns the authenticated user's id or null.
 * Every API route must authorize through this before touching data.
 */
export async function requireUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}
