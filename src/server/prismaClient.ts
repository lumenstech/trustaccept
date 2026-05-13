import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __TRUSTACCEPT_PRISMA__: PrismaClient | undefined;
}

/**
 * Single shared PrismaClient per process. Reused across the write
 * queue, hydration, the seed script, and integration tests.
 *
 * The client is only constructed when the caller asks for it — modules
 * that never opt into Prisma mode (the default in-memory path, the
 * dashboard build step) never instantiate it and therefore never need
 * DATABASE_URL set.
 */
export function getPrismaClient(): PrismaClient {
  if (!globalThis.__TRUSTACCEPT_PRISMA__) {
    globalThis.__TRUSTACCEPT_PRISMA__ = new PrismaClient({
      log:
        process.env.TRUSTACCEPT_PRISMA_LOG === "1"
          ? ["error", "warn"]
          : ["error"],
    });
  }
  return globalThis.__TRUSTACCEPT_PRISMA__;
}

/** Test/CLI helper. Closes the client and clears the cached singleton. */
export async function disconnectPrismaClient(): Promise<void> {
  const client = globalThis.__TRUSTACCEPT_PRISMA__;
  if (client) {
    await client.$disconnect();
    globalThis.__TRUSTACCEPT_PRISMA__ = undefined;
  }
}
