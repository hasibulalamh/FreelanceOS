import "server-only";

import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { freelancerAdapter } from "@/services/platforms/freelancer/adapter";
import { refreshTokens } from "@/services/platforms/freelancer/oauth";

/**
 * Connection lifecycle for the Freelancer.com adapter:
 * store (callback), read-with-auto-refresh (API calls), disconnect.
 * Tokens are always encrypted at rest and never leave the server except as
 * Authorization headers towards Freelancer's official API.
 */

/** @param {object} account PlatformAccount row with encrypted tokens */
export async function getValidAccessToken(account) {
  if (!account?.oauthAccessToken) return null;

  // Proactive refresh: refresh 60s before expiry (or on already-expired).
  const expired =
    account.oauthExpiresAt && account.oauthExpiresAt.getTime() < Date.now() + 60_000;

  if (!expired) {
    return decryptSecret(account.oauthAccessToken);
  }
  if (!account.oauthRefreshToken) {
    // No refresh path — treat as disconnected so the user re-connects.
    await markDisconnected(account.id);
    return null;
  }

  try {
    const refreshed = await refreshTokens(decryptSecret(account.oauthRefreshToken));
    await prisma.platformAccount.update({
      where: { id: account.id },
      data: {
        oauthAccessToken: encryptSecret(refreshed.accessToken),
        oauthRefreshToken: refreshed.refreshToken
          ? encryptSecret(refreshed.refreshToken)
          : account.oauthRefreshToken,
        oauthExpiresAt: refreshed.expiresAt,
        oauthScope: refreshed.scope,
        status: "CONNECTED",
      },
    });
    return refreshed.accessToken;
  } catch {
    // Refresh failed (revoked/expired): force a clean re-connect.
    await markDisconnected(account.id);
    return null;
  }
}

/** Persists tokens from a successful OAuth code exchange. */
export async function storeConnection({ userId, platformId, tokens, selfProfile }) {
  return prisma.platformAccount.upsert({
    where: { userId_platformId: { userId, platformId } },
    create: {
      userId,
      platformId,
      status: "CONNECTED",
      externalUsername: selfProfile.username,
      oauthAccessToken: encryptSecret(tokens.accessToken),
      oauthRefreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
      oauthExpiresAt: tokens.expiresAt,
      oauthScope: tokens.scope,
    },
    update: {
      status: "CONNECTED",
      externalUsername: selfProfile.username,
      oauthAccessToken: encryptSecret(tokens.accessToken),
      oauthRefreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null,
      oauthExpiresAt: tokens.expiresAt,
      oauthScope: tokens.scope,
      lastSyncedAt: new Date(),
    },
  });
}

export async function markDisconnected(accountId) {
  // Token columns are overwritten, never left behind: revoking a connection
  // must not leave decryptable credentials in the database.
  await prisma.platformAccount.update({
    where: { id: accountId },
    data: {
      status: "NOT_CONNECTED",
      oauthAccessToken: null,
      oauthRefreshToken: null,
      oauthExpiresAt: null,
      oauthScope: null,
    },
  });
}

export { freelancerAdapter };
