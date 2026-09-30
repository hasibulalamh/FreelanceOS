import { hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { ok, fail, readJson } from "@/lib/api";
import { registerSchema } from "@/validators/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";

/**
 * POST /api/auth/register
 *
 * Single-user platform: the first account becomes the OWNER; further
 * registrations are rejected. This keeps an open internet endpoint from
 * filling the database with junk accounts.
 */
export async function POST(request) {
  const ip = clientIp(request);
  // 5 attempts / 15 min / IP — registration is a one-time action, so even a
  // tight limit costs legitimate users nothing.
  if (!rateLimit(`register:${ip}`, 5, 15 * 60 * 1000)) {
    return fail("Too many attempts. Try again later.", 429);
  }

  const body = await readJson(request);
  if (body === null) return fail("Invalid JSON body");

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid registration data", 400, parsed.error.flatten().fieldErrors);
  }

  const { name, email, password } = parsed.data;

  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    // Same message as validation failures: gives an attacker nothing.
    return fail("Registration unavailable", 403);
  }

  const passwordHash = await hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "OWNER",
    },
    select: { id: true, email: true, name: true },
  });

  await logActivity(user.id, "account.registered", "auth", { email: user.email });

  return ok({ user }, { status: 201 });
}
