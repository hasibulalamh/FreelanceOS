import { ok, fail } from "@/lib/api";
import { auth } from "@/lib/auth";
import { authorizePlatformOperation } from "@/services/platforms/registry";
import { getValidAccessToken } from "@/services/platforms/freelancer/connection-service";
import { freelancerAdapter } from "@/services/platforms/freelancer/adapter";
import { FreelancerApiError } from "@/services/platforms/freelancer/client";
import { z } from "zod";

const searchParamsSchema = z.object({
  query: z.string().trim().min(2).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).max(5000).default(0),
});

/**
 * GET /api/platforms/freelancer/jobs?query=laravel&limit=10
 *
 * Live, read-only job search against the official projects API. Results are
 * NOT persisted — the Job model and analyzer arrive in Phase 11; this route
 * exists so the UI can preview what the adapter returns.
 */
export async function GET(request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("Unauthorized", 401);

  const url = new URL(request.url);
  const parsed = searchParamsSchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
  });
  if (!parsed.success) {
    return fail("Invalid search parameters", 400, parsed.error.flatten().fieldErrors);
  }

  const check = await authorizePlatformOperation("freelancer", "JOB_IMPORT", userId);
  if (!check.ok) return fail(check.message, check.status);

  const accessToken = await getValidAccessToken(check.account);
  if (!accessToken) {
    return fail("Freelancer authorization expired — reconnect the account.", 403);
  }

  try {
    const results = await freelancerAdapter.searchProjects(accessToken, parsed.data);
    return ok(results);
  } catch (error) {
    if (error instanceof FreelancerApiError) {
      return fail(error.message, error.status ?? 502);
    }
    console.error("freelancer job search failed", error);
    return fail("Failed to search Freelancer projects.", 500);
  }
}
