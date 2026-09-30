import { ok, fail } from "@/lib/api";
import { auth } from "@/lib/auth";
import { syncPortfolio } from "@/services/portfolio/sync-service";
import { rateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";

/**
 * POST /api/portfolio/sync
 *
 * Triggers a portfolio synchronization for the signed-in user. Rate limited
 * per user: each call fans out to 7 portfolio endpoints, so aggressive
 * retries would turn into unintended load on hasibulalam.com.
 */
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("Unauthorized", 401);

  // 4 syncs / 5 minutes per user is generous for manual use while blocking
  // accidental request loops.
  if (!rateLimit(`portfolio-sync:${userId}`, 4, 5 * 60 * 1000)) {
    return fail("Too many sync attempts. Try again in a few minutes.", 429);
  }

  const result = await syncPortfolio(userId);

  await logActivity(userId, "portfolio.sync", "portfolio", {
    status: result.status,
    counts: result.counts ?? null,
  });

  // A failed sync is still a valid outcome (data), not a transport error.
  return ok(result);
}
