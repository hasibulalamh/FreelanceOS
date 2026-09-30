import { ok, fail, readJson } from "@/lib/api";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { identityUpdateSchema } from "@/validators/profile";
import { getOwnedProfile } from "@/services/profile/access";
import { logActivity } from "@/lib/activity";

/**
 * PATCH /api/profile
 *
 * Manual edits to identity fields. NOTE: these fields are portfolio-sourced —
 * a portfolio sync overwrites them (the portfolio is the source of truth).
 * The edit UI states this explicitly.
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
  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data,
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
    },
  });

  await logActivity(userId, "profile.identity_edited", "profile", {
    fields: Object.keys(parsed.data),
  });

  return ok({ profile: updated });
}
