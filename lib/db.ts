/**
 * Prisma Client Singleton
 * ------------------------------------------------------------------
 * Next.js hot-reloads server code in development, which would create a
 * brand new PrismaClient (and a brand new DB connection pool) on every
 * file save if we're not careful. We stash the client on `globalThis`
 * so the same instance survives hot reloads. In production, exactly one
 * instance is created per server process, which is what you want.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
