import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { fail } from "@/lib/api";
import { authorizePlatformOperation } from "@/services/platforms/registry";
import { freelancerAdapter } from "@/services/platforms/freelancer/adapter";
import { freelancerConfig, isConfigured } from "@/services/platforms/freelancer/config";
import { createState } from "@/services/platforms/freelancer/oauth";

/**
 * GET /api/platforms/freelancer/connect
 *
 * Starts the official Freelancer OAuth authorization-code flow. CSRF state
 * is stored in a short-lived httpOnly cookie and verified by the callback.
 * The redirect_uri below must be registered on the Freelancer developer
 * application (base URL = NEXTAUTH_URL).
 */
export async function GET(request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("Unauthorized", 401);

  if (!isConfigured()) {
    return fail(
      "Freelancer integration is not configured. Set FREELANCER_CLIENT_ID and FREELANCER_CLIENT_SECRET (create an application at developers.freelancer.com).",
      503
    );
  }

  const check = await authorizePlatformOperation("freelancer", "OAUTH", userId);
  if (!check.ok) return fail(check.message, check.status);

  const state = createState();
  const cookieStore = await cookies();
  cookieStore.set(freelancerConfig.oauthStateCookie, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutes to complete the consent screen
    path: "/",
  });

  // NEXTAUTH_URL when set (production); otherwise the request origin (dev).
  const base = process.env.NEXTAUTH_URL || new URL(request.url).origin;
  const redirectUri = `${base}/api/platforms/freelancer/callback`;
  return NextResponse.redirect(
    freelancerAdapter.buildConnectUrl({ state, redirectUri })
  );
}
