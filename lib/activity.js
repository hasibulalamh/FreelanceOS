import { prisma } from "@/lib/prisma";

/**
 * Records an auditable event. Never throws into the caller's flow: a failed
 * audit write must not break the user-facing operation that produced it.
 */
export async function logActivity(userId, action, context, metadata) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        context: context ?? null,
        metadata: metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("activity log write failed", error);
  }
}
