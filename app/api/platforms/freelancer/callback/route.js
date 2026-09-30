import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { authorizePlatformOperation } from "@/services/platforms/registry";
import { freelancerAdapter } from "@/services/platforms/freelancer/adapter";
import { freelancerConfig } from "@/services/platforms/freelancer/config";
import { storeConnection } from "@/services/platforms/freelancer/connection-service";
import { logActivity } from "@/lib/activity";

/**
 * GET /api/platforms/freelancer/callback
 *
 * OAuth redirect URI target. Verifies the state cookie, exchanges the code,
 * fetches the connected user's profile (username for display), and stores
 * the tokens ENCRYPTED on the PlatformAccount row. Failures redirect back to
 * /platforms with a short reason — no tokens or internals in the URL.
 */
export async function GET(request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return redirectToPlatforms("not-signed-in");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return redirectToPlatforms("consent-declined");
  }
  if (!code || !state) {
    return redirectToPlatforms("missing-parameters");
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(freelancerConfig.oauthStateCookie)?.value;
  cookieStore.delete(freelancerConfig.oauthStateCookie);
  // Constant-time-ish comparison is unnecessary for a random 256-bit value
  // matched against an attacker-chosen string; plain equality is fine here,
  // but the check itself is mandatory (CSRF protection for the flow).
  if (!expectedState || expectedState !== state) {
    return redirectToPlatforms("state-mismatch");
  }

  const check = await authorizePlatformOperation("freelancer", "OAUTH", userId);
  if (!check.ok) {
    return redirectToPlatforms("not-permitted");
  }

  try {
    const base = process.env.NEXTAUTH_URL || url.origin;
    const redirectUri = `${base}/api/platforms/freelancer/callback`;
    const tokens = await freelancerAdapter.exchangeCode({ code, redirectUri });

    // Fetch the profile now so the UI can show WHO connected without
    // keeping anything but the encrypted tokens.
    const selfProfile = await freelancerAdapter.fetchSelf(tokens.accessToken);

    await storeConnection({
      userId,
      platformId: check.platform.id,
      tokens,
      selfProfile,
    });

    await logActivity(userId, "platform.connected", "platforms", {
      platform: "freelancer",
      username: selfProfile.username,
    });

    return redirectToPlatforms(null, "connected=freelancer");
  } catch (error) {
    console.error("freelancer oauth callback failed", error);
    return redirectToPlatforms("exchange-failed");
  }
}

function redirectToPlatforms(error, query = null) {
  const target = new URL("/platforms", process.env.NEXTAUTH_URL || "http://localhost:3000");
  if (error) target.searchParams.set("connect_error", error);
  if (query) target.searchParams.set(query.split("=")[0], query.split("=")[1]);
  return NextResponse.redirect(target);
}
