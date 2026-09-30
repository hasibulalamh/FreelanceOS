import { ok, fail, readJson } from "@/lib/api";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { identityUpdateSchema } from "@/validators/profile";
import { getOwnedProfile } from "@/services/profile/access";
import { SYNC_MANAGED_IDENTITY_FIELDS } from "@/services/portfolio/normalize";
import { logActivity } from "@/lib/activity";

/**
 * PATCH /api/profile
 *
 * Manual edits to identity fields. Fields the portfolio sync manages are
 * recorded in Profile.manualOverrides when edited, so subsequent syncs skip
 * them until released (DELETE /api/profile/overrides/[field]).
 */
export async function PATCH(request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("Unauthorized", 401);

  const body = await readJson(request);
  if (body === null) return fail("Invalid JSON body");

  const parsed = identityUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid profile data", 400, parsed.error.flatten().fieldErrors);
  }

  // Prisma ignores undefined values: absent/empty keys leave columns as-is,
  // null values clear nullable columns (validator semantics).
  const { languages, ...scalarFields } = parsed.data;
  const data = { ...scalarFields };
  if (languages !== undefined) {
    data.languages = languages.filter((language) => language.length > 0);
  }

  const profile = await getOwnedProfile(userId);

  // Explicitly provided fields (including deliberate clears) become manual
  // overrides: portfolio sync skips them until released.
  const touchedSyncFields = Object.entries(parsed.data)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key)
    .filter((key) => SYNC_MANAGED_IDENTITY_FIELDS.includes(key));

  const manualOverrides = touchedSyncFields.length
    ? [...new Set([...(profile.manualOverrides ?? []), ...touchedSyncFields])]
    : undefined; // undefined = leave the stored list untouched

  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data: { ...data, ...(manualOverrides ? { manualOverrides } : {}) },
    select: {
      id: true,
      fullName: true,
      professionalTitle: true,
      summary: true,
      bio: true,
      location: true,
      websiteUrl: true,
      avatarUrl: true,
      hourlyRate: true,
      currency: true,
      languages: true,
      manualOverrides: true,
    },
  });

  await logActivity(userId, "profile.identity_edited", "profile", {
    fields: Object.keys(parsed.data),
    overrides: touchedSyncFields.length ? touchedSyncFields : undefined,
  });

  return ok({ profile: updated });
}
