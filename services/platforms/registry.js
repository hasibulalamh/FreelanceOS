import "server-only";

import { freelancerAdapter } from "@/services/platforms/freelancer/adapter";
import { prisma } from "@/lib/prisma";

/**
 * Platform adapter registry.
 *
 * Maps platform slugs to adapters. A platform WITHOUT an adapter (fiverr,
 * peopleperhour, guru, contra) simply resolves to null — the UI shows the
 * capability truth from the DB and no connect/search actions. Adding a new
 * official integration = adding an adapter module + one line here.
 */
const ADAPTERS = {
  freelancer: freelancerAdapter,
};

export function getPlatformAdapter(slug) {
  return ADAPTERS[slug] ?? null;
}

/**
 * Enforces the capability matrix stored in the DB (seeded from
 * services/platforms/catalog.js). Capabilities are enforced, not decorative:
 *
 *   SUPPORTED                  -> operation allowed
 *   USER_AUTH_REQUIRED         -> allowed only with a connected account
 *   PLATFORM_APPROVAL_REQUIRED -> allowed only when an adapter is configured
 *                                 AND the user connected an account; without
 *                                 approval the API itself will refuse
 *   MANUAL_ONLY / NOT_SUPPORTED-> refused with an honest explanation
 *
 * @returns {{ ok: true, account?: object } | { ok: false, status: number, message: string }}
 */
export async function authorizePlatformOperation(slug, capability, userId) {
  const platform = await prisma.platform.findUnique({
    where: { slug },
    include: { capabilities: { where: { capability } } },
  });
  if (!platform) {
    return { ok: false, status: 404, message: `Unknown platform "${slug}"` };
  }

  const capabilityRow = platform.capabilities[0];
  if (!capabilityRow) {
    return { ok: false, status: 500, message: `Capability ${capability} is not defined for ${slug}` };
  }

  const adapter = getPlatformAdapter(slug);
  const account = userId
    ? await prisma.platformAccount.findUnique({
        where: { userId_platformId: { userId, platformId: platform.id } },
      })
    : null;
  const connected = account?.status === "CONNECTED" && Boolean(account?.oauthAccessToken);

  switch (capabilityRow.status) {
    case "SUPPORTED":
      return { ok: true, account, platform, adapter };
    case "USER_AUTH_REQUIRED":
    case "PLATFORM_APPROVAL_REQUIRED":
      if (!adapter) {
        return {
          ok: false,
          status: 501,
          message: `${platform.name} has no adapter implemented yet — this capability is documented as ${capabilityRow.status.toLowerCase().replace(/_/g, " ")}.`,
        };
      }
      if (!connected) {
        return {
          ok: false,
          status: 403,
          message: `Connect your ${platform.name} account first (this capability requires user authorization).`,
        };
      }
      return { ok: true, account, platform, adapter };
    case "MANUAL_ONLY":
      return {
        ok: false,
        status: 403,
        message: `${platform.name} does not offer an official API for this — FreelanceOS prepares content and you perform the action manually.`,
      };
    case "NOT_SUPPORTED":
    default:
      return {
        ok: false,
        status: 403,
        message: `${platform.name} does not support ${capability.toLowerCase().replace(/_/g, " ")} through official means.`,
      };
  }
}
