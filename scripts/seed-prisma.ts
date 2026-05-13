/**
 * Seed the Postgres database with the same 21 RiskRecords that the
 * in-memory store ships with, plus the demo Organization and User the
 * mock auth layer expects. Idempotent — re-running it will not
 * duplicate rows.
 *
 * Usage:
 *   docker compose up -d postgres
 *   npx prisma migrate deploy
 *   npx tsx scripts/seed-prisma.ts
 *
 * The seed deliberately does NOT add any agent governance fixtures.
 * The agent / decision tables stay empty so the refund demo can be
 * walked through against a clean slate.
 */

import { PrismaClient } from "@prisma/client";
import { DEMO_ORGANIZATION_ID, DEMO_USER_ID, SEED_RECORDS } from "../lib/seed-data";
import {
  auditLogCreateInput,
  riskRecordCreateInput,
} from "../src/server/prismaMappers";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await prisma.organization.upsert({
      where: { id: DEMO_ORGANIZATION_ID },
      update: { name: "Lumens Internal" },
      create: {
        id: DEMO_ORGANIZATION_ID,
        name: "Lumens Internal",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    });
    console.info(`[seed] organization ${DEMO_ORGANIZATION_ID} ready`);

    await prisma.user.upsert({
      where: { id: DEMO_USER_ID },
      update: {
        name: "Alex Greene",
        email: "alex@trustaccept.dev",
        role: "OWNER",
        organizationId: DEMO_ORGANIZATION_ID,
      },
      create: {
        id: DEMO_USER_ID,
        name: "Alex Greene",
        email: "alex@trustaccept.dev",
        role: "OWNER",
        organizationId: DEMO_ORGANIZATION_ID,
      },
    });
    console.info(`[seed] user ${DEMO_USER_ID} ready`);

    let recordsCreated = 0;
    let recordsSkipped = 0;
    for (const record of SEED_RECORDS) {
      const existing = await prisma.riskRecord.findUnique({
        where: { id: record.id },
      });
      if (existing) {
        recordsSkipped++;
        continue;
      }
      await prisma.riskRecord.create({
        data: riskRecordCreateInput(record),
      });
      recordsCreated++;

      // Mirror the per-record audit-timeline entries into the AuditLog
      // table so the dashboard's audit views show identical history.
      let idx = 0;
      for (const entry of record.auditTimeline) {
        await prisma.auditLog.create({
          data: auditLogCreateInput({
            id: `${record.id}-seed-${idx}`,
            organizationId:
              record.organizationId ?? DEMO_ORGANIZATION_ID,
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
    console.info(
      `[seed] risk records: ${recordsCreated} created, ${recordsSkipped} skipped (already present)`,
    );
    console.info("[seed] done.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
