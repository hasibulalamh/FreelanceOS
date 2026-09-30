import { ok, fail } from "@/lib/api";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/platforms
 *
 * Returns the platform catalog with its capability matrix and the signed-in
 * user's account status per platform. All claims come from the database
 * (seeded from services/platforms/catalog.js) — nothing is hardcoded here.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("Unauthorized", 401);

  const platforms = await prisma.platform.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      capabilities: { orderBy: { capability: "asc" } },
      platformAccounts: { where: { userId } },
    },
  });

  return ok(
    platforms.map((platform) => ({
      id: platform.id,
      slug: platform.slug,
      name: platform.name,
      websiteUrl: platform.websiteUrl,
      // A user has at most one account per platform (schema unique).
      account: platform.platformAccounts[0]
        ? {
            status: platform.platformAccounts[0].status,
            externalUsername: platform.platformAccounts[0].externalUsername,
            lastSyncedAt: platform.platformAccounts[0].lastSyncedAt,
          }
        : null,
      capabilities: platform.capabilities.map((capability) => ({
        capability: capability.capability,
        status: capability.status,
        notes: capability.notes,
      })),
    }))
  );
}
