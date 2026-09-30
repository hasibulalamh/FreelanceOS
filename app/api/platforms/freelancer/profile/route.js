import { ok, fail } from "@/lib/api";
import { auth } from "@/lib/auth";
import { authorizePlatformOperation } from "@/services/platforms/registry";
import { getValidAccessToken } from "@/services/platforms/freelancer/connection-service";
import { freelancerAdapter } from "@/services/platforms/freelancer/adapter";
import { FreelancerApiError } from "@/services/platforms/freelancer/client";

/**
 * GET /api/platforms/freelancer/profile
 *
 * Live read of the connected user's Freelancer profile via the official API
 * (users/0.1/self). Display-safe projection only — tokens are never part of
 * the response. PROFILE_SYNC is USER_AUTH_REQUIRED: the registry enforces a
 * connected account before this route touches the API.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("Unauthorized", 401);

  const check = await authorizePlatformOperation("freelancer", "PROFILE_SYNC", userId);
  if (!check.ok) return fail(check.message, check.status);

  const accessToken = await getValidAccessToken(check.account);
  if (!accessToken) {
    return fail("Freelancer authorization expired — reconnect the account.", 403);
  }

  try {
    const profile = await freelancerAdapter.fetchSelf(accessToken);
    return ok({
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        country: profile.country,
        hourlyRate: profile.hourlyRate,
        currency: profile.currency,
      },
    });
  } catch (error) {
    if (error instanceof FreelancerApiError) {
      return fail(error.message, error.status ?? 502);
    }
    console.error("freelancer profile fetch failed", error);
    return fail("Failed to fetch Freelancer profile.", 500);
  }
}
