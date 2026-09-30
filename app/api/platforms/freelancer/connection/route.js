import { ok, fail } from "@/lib/api";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authorizePlatformOperation } from "@/services/platforms/registry";
import { markDisconnected } from "@/services/platforms/freelancer/connection-service";
import { logActivity } from "@/lib/activity";

/**
 * DELETE /api/platforms/freelancer/connection
 *
 * Disconnects the Freelancer account: status back to NOT_CONNECTED and the
 * encrypted OAuth tokens are destroyed (not merely hidden). The user should
 * also revoke the app on Freelancer's side; we surface that in the UI.
 */
export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("Unauthorized", 401);

  const check = await authorizePlatformOperation("freelancer", "OAUTH", userId);
  if (!check.ok) return fail(check.message, check.status);

  const account = await prisma.platformAccount.findUnique({
    where: { userId_platformId: { userId, platformId: check.platform.id } },
  });
  if (!account) return fail("No Freelancer connection to remove", 404);

  await markDisconnected(account.id);
  await logActivity(userId, "platform.disconnected", "platforms", { platform: "freelancer" });

  return ok({ disconnected: true });
}
