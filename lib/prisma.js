import { PrismaClient } from "@prisma/client";

// Prisma 6: @prisma/client exports the classic (Rust-free preview) client.
// A module-level singleton avoids exhausting Postgres connections during
// Next.js dev-mode hot reloads, which re-evaluate modules repeatedly.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__freelanceosPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__freelanceosPrisma = prisma;
}
