/**
 * Persistence dispatcher.
 *
 * Service modules (riskRecords.ts, agents.ts, decisions.ts,
 * auditLogs.ts, evidencePackets.ts, leads.ts, spendCap.ts) import the
 * store through this dispatcher so flipping
 * `TRUSTACCEPT_PERSISTENCE=prisma` is the only change required to put
 * every read and write through Postgres.
 *
 * Defaults to the in-memory store. That keeps the existing 173 tests
 * — and `npm run build` and `npm run dev` without env flags — running
 * exactly as before. The Prisma module is only loaded when the env
 * var is set, so the default path never touches PrismaClient and
 * never requires DATABASE_URL.
 *
 * `auth.ts` continues to import `./store` directly. It only reads the
 * demo user, which is the same in both modes; routing that read
 * through a Prisma-backed adapter would force `auth.ts` modification,
 * which is out of scope for this task.
 */

import {
  getStore as memoryGetStore,
  __resetStoreForTests as memoryReset,
} from "./store";
import type { EvidencePacketRecord, Store } from "./store";

const usePrisma = process.env.TRUSTACCEPT_PERSISTENCE === "prisma";

type GetStoreFn = () => Store;
type ResetFn = () => Store | Promise<Store>;

let prismaGetStore: GetStoreFn | undefined;
let prismaReset: ResetFn | undefined;

if (usePrisma) {
  const mod = await import("./store.prisma");
  prismaGetStore = mod.getStore;
  prismaReset = mod.__resetStoreForTests;
}

export function getStore(): Store {
  return usePrisma ? prismaGetStore!() : memoryGetStore();
}

export function __resetStoreForTests(): Store | Promise<Store> {
  return usePrisma ? prismaReset!() : memoryReset();
}

export function isPrismaPersistence(): boolean {
  return usePrisma;
}

export type { EvidencePacketRecord, Store };
