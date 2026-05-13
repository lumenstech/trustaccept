import { DEMO_ORGANIZATION_ID, DEMO_USER_ID, SEED_RECORDS } from "@/lib/seed-data";
import type { Agent } from "@/lib/agents";
import type { DecisionEvent } from "@/lib/decisions";
import type {
  AuditLog,
  Lead,
  Organization,
  RiskRecord,
  SessionUser,
} from "@/lib/types";
import {
  agentCreateInput,
  agentDecisionCreateInput,
  agentFromRow,
  agentDecisionFromRow,
  agentUpdateInput,
  auditLogCreateInput,
  auditLogFromRow,
  evidencePacketCreateInput,
  evidencePacketFromRow,
  leadCreateInput,
  leadFromRow,
  organizationFromRow,
  riskRecordCreateInput,
  riskRecordFromRow,
  riskRecordUpdateInput,
  userFromRow,
} from "./prismaMappers";
import { disconnectPrismaClient, getPrismaClient } from "./prismaClient";
import type { EvidencePacketRecord, Store } from "./store";
import { enqueuePrismaWrite } from "./writeQueue";

/**
 * Prisma-backed implementation of the in-memory `Store` shape.
 *
 * Why a write-through cache instead of pure Prisma calls? The store's
 * public contract is synchronous (`getStore().riskRecords.get(id)`).
 * Service code and route handlers depend on that. Making them async
 * would force route-handler changes that are outside this task's
 * scope. Instead the Prisma store presents the exact same Map/array
 * surface, hydrates it once from Postgres at module load (top-level
 * await), and intercepts every mutation to mirror it to Postgres via
 * the write queue (writeQueue.ts).
 *
 * Trade-offs documented in README:
 *   - Single-process only. A second Node instance would not see writes
 *     from the first until restart-and-rehydrate.
 *   - Writes are queued; tests must await `flushPrismaWrites()` before
 *     reading from Postgres directly.
 *   - Auth tables (Organization, User) are read-only in this build;
 *     we seed the demo org/user if missing so the dashboard renders.
 */

class WriteThroughMap<K, V> extends Map<K, V> {
  constructor(private readonly onSet: (key: K, value: V) => Promise<void>) {
    super();
  }
  set(key: K, value: V): this {
    super.set(key, value);
    enqueuePrismaWrite(() => this.onSet(key, value));
    return this;
  }
}

class ReadOnlyMap<K, V> extends Map<K, V> {
  set(): this {
    throw new Error("Read-only Map: this collection is hydrated, not mutated");
  }
  delete(): boolean {
    throw new Error("Read-only Map: this collection is hydrated, not mutated");
  }
  clear(): void {
    throw new Error("Read-only Map: this collection is hydrated, not mutated");
  }
  internalSet(key: K, value: V): this {
    return super.set(key, value);
  }
}

class WriteThroughArray<T> extends Array<T> {
  constructor(
    private readonly onPush: (value: T) => Promise<void>,
    initial: T[] = [],
  ) {
    super();
    if (initial.length > 0) {
      super.push(...initial);
    }
  }
  push(...items: T[]): number {
    const result = super.push(...items);
    for (const item of items) {
      enqueuePrismaWrite(() => this.onPush(item));
    }
    return result;
  }
}

/** Construct an empty Store skeleton with write-through wrappers wired up. */
function emptyStore(): Store {
  const prisma = getPrismaClient();

  const organizations = new ReadOnlyMap<string, Organization>();
  const users = new ReadOnlyMap<string, SessionUser>();

  const riskRecords = new WriteThroughMap<string, RiskRecord>(async (_, value) => {
    await prisma.riskRecord.upsert({
      where: { id: value.id },
      create: riskRecordCreateInput(value),
      update: riskRecordUpdateInput(value),
    });
  });

  const auditLogs = new WriteThroughArray<AuditLog>(async (entry) => {
    // AuditLog is insert-only by application convention; we only ever
    // call create() here. Updates and deletes are absent on purpose.
    await prisma.auditLog.create({ data: auditLogCreateInput(entry) });
  });

  const leads = new WriteThroughMap<string, Lead>(async (_, value) => {
    await prisma.lead.upsert({
      where: { id: value.id },
      create: leadCreateInput(value),
      update: {
        name: value.name,
        company: value.company,
        email: value.email,
        phone: value.phone ?? null,
        riskArea: value.riskArea,
        urgency: value.urgency,
        description: value.description,
        status: leadCreateInput(value).status,
      },
    });
  });

  const evidencePackets = new WriteThroughMap<string, EvidencePacketRecord>(
    async (_, value) => {
      await prisma.evidencePacket.upsert({
        where: { id: value.id },
        create: evidencePacketCreateInput(value),
        update: {
          summary: evidencePacketCreateInput(value).summary,
          generatedAt: new Date(value.generatedAt),
        },
      });
    },
  );

  const agents = new WriteThroughMap<string, Agent>(async (_, value) => {
    await prisma.agent.upsert({
      where: { id: value.id },
      create: agentCreateInput(value),
      update: agentUpdateInput(value),
    });
  });

  const agentDecisions = new WriteThroughArray<DecisionEvent>(async (entry) => {
    await prisma.agentDecision.create({
      data: agentDecisionCreateInput(entry),
    });
  });

  return {
    organizations,
    users,
    riskRecords,
    auditLogs,
    leads,
    evidencePackets,
    agents,
    agentDecisions,
  };
}

/**
 * One-shot hydration. Loads every row in every tenant the demo user
 * can see into the in-memory shape, populating Maps via the internal
 * (write-bypass) setter so hydration does not echo back into Postgres.
 */
async function hydrate(store: Store): Promise<void> {
  const prisma = getPrismaClient();

  // Seed Organization + User rows if the table is empty so the demo
  // user has somewhere to live.
  const orgCount = await prisma.organization.count();
  if (orgCount === 0) {
    await prisma.organization.create({
      data: {
        id: DEMO_ORGANIZATION_ID,
        name: "Lumens Internal",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    });
  }
  const demoUser = await prisma.user.findUnique({ where: { id: DEMO_USER_ID } });
  if (!demoUser) {
    await prisma.user.create({
      data: {
        id: DEMO_USER_ID,
        name: "Alex Greene",
        email: "alex@trustaccept.dev",
        role: "OWNER",
        organizationId: DEMO_ORGANIZATION_ID,
      },
    });
  }

  const [
    orgRows,
    userRows,
    riskRows,
    auditRows,
    leadRows,
    packetRows,
    agentRows,
    decisionRows,
  ] = await Promise.all([
    prisma.organization.findMany(),
    prisma.user.findMany(),
    prisma.riskRecord.findMany(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.lead.findMany(),
    prisma.evidencePacket.findMany(),
    prisma.agent.findMany(),
    prisma.agentDecision.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  for (const row of orgRows) {
    (store.organizations as ReadOnlyMap<string, Organization>).internalSet(
      row.id,
      organizationFromRow(row),
    );
  }
  for (const row of userRows) {
    (store.users as ReadOnlyMap<string, SessionUser>).internalSet(
      row.id,
      userFromRow(row),
    );
  }
  for (const row of riskRows) {
    // Bypass write-through with super.set via direct cast.
    Map.prototype.set.call(store.riskRecords, row.id, riskRecordFromRow(row));
  }
  for (const row of auditRows) {
    Array.prototype.push.call(store.auditLogs, auditLogFromRow(row));
  }
  for (const row of leadRows) {
    Map.prototype.set.call(store.leads, row.id, leadFromRow(row));
  }
  for (const row of packetRows) {
    Map.prototype.set.call(
      store.evidencePackets,
      row.id,
      evidencePacketFromRow(row),
    );
  }
  for (const row of agentRows) {
    Map.prototype.set.call(store.agents, row.id, agentFromRow(row));
  }
  for (const row of decisionRows) {
    Array.prototype.push.call(store.agentDecisions, agentDecisionFromRow(row));
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __TRUSTACCEPT_PRISMA_STORE__: Store | undefined;
}

async function buildStore(): Promise<Store> {
  const store = emptyStore();
  await hydrate(store);
  return store;
}

// One-time hydration. Subsequent imports of this module reuse the
// cached store on globalThis.
if (!globalThis.__TRUSTACCEPT_PRISMA_STORE__) {
  globalThis.__TRUSTACCEPT_PRISMA_STORE__ = await buildStore();
}

export function getStore(): Store {
  if (!globalThis.__TRUSTACCEPT_PRISMA_STORE__) {
    throw new Error(
      "Prisma store accessed before hydration. This indicates the module was bypassed.",
    );
  }
  return globalThis.__TRUSTACCEPT_PRISMA_STORE__;
}

/**
 * Integration-test helper. Truncates tenant-scoped tables and
 * re-seeds the 21 demo RiskRecords (matching what the in-memory
 * `seedStore()` produces) so existing test assertions that rely on
 * pre-seeded data continue to hold. Auth tables (Organization, User)
 * are kept so the demo user survives.
 */
export async function __resetStoreForTests(): Promise<Store> {
  const prisma = getPrismaClient();
  await prisma.$transaction([
    prisma.agentDecision.deleteMany({}),
    prisma.agent.deleteMany({}),
    prisma.auditLog.deleteMany({}),
    prisma.evidencePacket.deleteMany({}),
    prisma.riskRecord.deleteMany({}),
    prisma.lead.deleteMany({}),
  ]);
  // Re-insert the 21 seed records + their inline audit timelines so
  // tests that import from `./store` and assume seed presence behave
  // identically in both persistence modes.
  for (const record of SEED_RECORDS) {
    await prisma.riskRecord.create({ data: riskRecordCreateInput(record) });
    let idx = 0;
    for (const entry of record.auditTimeline) {
      await prisma.auditLog.create({
        data: auditLogCreateInput({
          id: `${record.id}-seed-${idx}`,
          organizationId: record.organizationId ?? DEMO_ORGANIZATION_ID,
          riskRecordId: record.id,
          eventType: "risk_record.created",
          actorName: entry.actor,
          metadata: { action: entry.action, detail: entry.detail },
          createdAt: entry.occurredAt,
        }),
      });
      idx++;
    }
  }
  globalThis.__TRUSTACCEPT_PRISMA_STORE__ = await buildStore();
  return globalThis.__TRUSTACCEPT_PRISMA_STORE__;
}

export type { EvidencePacketRecord, Store } from "./store";
export { disconnectPrismaClient };
