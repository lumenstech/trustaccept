import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __TRUSTACCEPT_PRISMA__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__TRUSTACCEPT_PRISMA__ ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__TRUSTACCEPT_PRISMA__ = prisma;
}
