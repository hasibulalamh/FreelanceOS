import { prisma } from "@/lib/prisma";

/**
 * Loads the signed-in user's profile row, creating it if missing.
 * Every profile API route must scope data access through the returned
 * profile.id — that is the authorization boundary (a user can only ever
 * touch rows hanging off their own profile).
 */
export async function getOwnedProfile(userId) {
  return prisma.profile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

/**
 * Loads a child row of the owned profile and returns it, or null when the
 * row does not exist OR does not belong to this user's profile. Callers
 * treat null as 404 — never revealing whether the id exists for someone else.
 */
export async function findOwnedRow(model, profileId, rowId) {
  if (!/^[a-z0-9]+$/i.test(String(rowId))) return null; // cheap id-shape guard
  return prisma[model].findFirst({
    where: { id: rowId, profileId },
  });
}
