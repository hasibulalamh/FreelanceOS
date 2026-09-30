import { ok, fail } from "@/lib/api";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedProfile } from "@/services/profile/access";
import { SYNC_MANAGED_IDENTITY_FIELDS } from "@/services/portfolio/normalize";
import { syncPortfolio } from "@/services/portfolio/sync-service";
import { logActivity } from "@/lib/activity";

/**
 * DELETE /api/profile/overrides/[field]
 *
 * Releases a manual override so portfolio sync manages the field again, then
 * runs a forced sync so the field is restored from the portfolio immediately
 * (a normal sync would short-circuit on the unchanged-payload hash).
 *
 * When PORTFOLIO_API_URL is not configured the override is still released;
 * the value simply stays as-is until the next successful sync.
 */
export async function DELETE(request, context) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("Unauthorized", 401);

  const { field } = await context.params;
  if (!SYNC_MANAGED_IDENTITY_FIELDS.includes(field)) {
    return fail("Unknown override field", 404);
  }

  const profile = await getOwnedProfile(userId);
  if (!profile.manualOverrides?.includes(field)) {
    return fail("Field is not overridden", 404);
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      manualOverrides: profile.manualOverrides.filter((name) => name !== field),
    },
  });

  await logActivity(userId, "profile.override_released", "profile", { field });

  // Restore the portfolio value right away (respects remaining overrides).
  const syncResult = await syncPortfolio(userId, { forceWrite: true });

  const updated = await prisma.profile.findUnique({
    where: { id: profile.id },
    select: { manualOverrides: true, [field]: true },
  });

  return ok({
    released: field,
    sync: syncResult,
    overrides: updated.manualOverrides,
    value: updated[field],
  });
}
