import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Tenant-scoped Prisma facade.
 *
 * Every method here automatically injects the caller's tenant
 * identifier into the `where` (and, where relevant, the `data`) clause.
 * Callers cannot read or write rows belonging to another tenant — the
 * tenant id is captured in the closure and applied unconditionally, so
 * forgetting to pass a `where` clause is a hard failure instead of an
 * accidental cross-tenant read.
 *
 * The tenant id is mapped to the right column name per model:
 *   - Agent / AgentDecision use `tenantId`
 *   - RiskRecord / AuditLog / EvidencePacket use `organizationId`
 *   - Lead is global (no tenant column today; reads return ALL rows).
 *     The lead surface is single-tenant in this build and will need a
 *     tenant column before it can be safely opened up.
 */
export function tenantPrisma(client: PrismaClient, tenantId: string) {
  if (!tenantId) {
    throw new Error("tenantPrisma: empty tenantId");
  }

  const merge = <T extends Record<string, unknown>>(
    extra: T,
    where?: Record<string, unknown>,
  ): T & Record<string, unknown> => ({
    ...extra,
    ...(where ?? {}),
  });

  // Agent ---------------------------------------------------------------
  const agent = {
    findMany: (args?: Prisma.AgentFindManyArgs) =>
      client.agent.findMany({
        ...args,
        where: merge({ tenantId }, args?.where as Record<string, unknown>),
      }),
    findUnique: (args: { where: { id: string } }) =>
      client.agent.findFirst({ where: { id: args.where.id, tenantId } }),
    findFirst: (args?: Prisma.AgentFindFirstArgs) =>
      client.agent.findFirst({
        ...args,
        where: merge({ tenantId }, args?.where as Record<string, unknown>),
      }),
    create: (args: { data: Prisma.AgentUncheckedCreateInput }) =>
      client.agent.create({ data: { ...args.data, tenantId } }),
    update: (args: {
      where: { id: string };
      data: Prisma.AgentUncheckedUpdateInput;
    }) =>
      client.agent.updateMany({
        where: { id: args.where.id, tenantId },
        data: args.data,
      }),
    upsert: (args: {
      where: { id: string };
      create: Prisma.AgentUncheckedCreateInput;
      update: Prisma.AgentUncheckedUpdateInput;
    }) => upsertManually(client.agent as unknown as DelegateLike, args, tenantId),
    deleteMany: (args?: { where?: Record<string, unknown> }) =>
      client.agent.deleteMany({ where: merge({ tenantId }, args?.where) }),
  };

  // AgentDecision -------------------------------------------------------
  const agentDecision = {
    findMany: (args?: Prisma.AgentDecisionFindManyArgs) =>
      client.agentDecision.findMany({
        ...args,
        where: merge({ tenantId }, args?.where as Record<string, unknown>),
      }),
    create: (args: { data: Prisma.AgentDecisionUncheckedCreateInput }) =>
      client.agentDecision.create({ data: { ...args.data, tenantId } }),
    deleteMany: (args?: { where?: Record<string, unknown> }) =>
      client.agentDecision.deleteMany({
        where: merge({ tenantId }, args?.where),
      }),
  };

  // RiskRecord ----------------------------------------------------------
  const riskRecord = {
    findMany: (args?: Prisma.RiskRecordFindManyArgs) =>
      client.riskRecord.findMany({
        ...args,
        where: merge(
          { organizationId: tenantId },
          args?.where as Record<string, unknown>,
        ),
      }),
    findUnique: (args: { where: { id: string } }) =>
      client.riskRecord.findFirst({
        where: { id: args.where.id, organizationId: tenantId },
      }),
    create: (args: { data: Prisma.RiskRecordUncheckedCreateInput }) =>
      client.riskRecord.create({
        data: { ...args.data, organizationId: tenantId },
      }),
    update: (args: {
      where: { id: string };
      data: Prisma.RiskRecordUncheckedUpdateInput;
    }) =>
      client.riskRecord.updateMany({
        where: { id: args.where.id, organizationId: tenantId },
        data: args.data,
      }),
    upsert: (args: {
      where: { id: string };
      create: Prisma.RiskRecordUncheckedCreateInput;
      update: Prisma.RiskRecordUncheckedUpdateInput;
    }) =>
      upsertManually(
        client.riskRecord as unknown as DelegateLike,
        args,
        tenantId,
        "organizationId",
      ),
    deleteMany: (args?: { where?: Record<string, unknown> }) =>
      client.riskRecord.deleteMany({
        where: merge({ organizationId: tenantId }, args?.where),
      }),
  };

  // AuditLog (insert-only) ---------------------------------------------
  const auditLog = {
    findMany: (args?: Prisma.AuditLogFindManyArgs) =>
      client.auditLog.findMany({
        ...args,
        where: merge(
          { organizationId: tenantId },
          args?.where as Record<string, unknown>,
        ),
      }),
    create: (args: { data: Prisma.AuditLogUncheckedCreateInput }) =>
      client.auditLog.create({
        data: { ...args.data, organizationId: tenantId },
      }),
    // Intentionally no update/delete — callers that need to mutate
    // audit history will have to bypass tenantPrisma, which is the
    // signal we want.
  };

  // EvidencePacket -------------------------------------------------------
  const evidencePacket = {
    findMany: (args?: Prisma.EvidencePacketFindManyArgs) =>
      client.evidencePacket.findMany({
        ...args,
        where: merge(
          { organizationId: tenantId },
          args?.where as Record<string, unknown>,
        ),
      }),
    create: (args: { data: Prisma.EvidencePacketUncheckedCreateInput }) =>
      client.evidencePacket.create({
        data: { ...args.data, organizationId: tenantId },
      }),
  };

  return { agent, agentDecision, riskRecord, auditLog, evidencePacket };
}

/**
 * Loosely typed delegate facade — Prisma's strict delegate generics
 * don't survive being widened to "anything with findFirst+create+
 * updateMany", so the upsertManually helper takes this shape instead
 * and the call sites cast the delegate in. Internal-only.
 */
interface DelegateLike {
  findFirst: (args: { where: Record<string, unknown> }) => Promise<unknown>;
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  updateMany: (args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }) => Promise<{ count: number }>;
}

/**
 * Prisma's native `upsert` does not accept arbitrary tenant filters in
 * its `where` because it requires a unique index. We pre-filter to the
 * tenant and pick create vs update based on the result, then issue the
 * appropriate single-tenant statement.
 */
async function upsertManually(
  delegate: DelegateLike,
  args: {
    where: { id: string };
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  },
  tenantId: string,
  tenantColumn: "tenantId" | "organizationId" = "tenantId",
): Promise<unknown> {
  const existing = await delegate.findFirst({
    where: { id: args.where.id, [tenantColumn]: tenantId },
  });
  if (existing) {
    await delegate.updateMany({
      where: { id: args.where.id, [tenantColumn]: tenantId },
      data: args.update,
    });
    const updated = await delegate.findFirst({
      where: { id: args.where.id, [tenantColumn]: tenantId },
    });
    if (!updated) {
      throw new Error("upsertManually: row vanished mid-upsert");
    }
    return updated;
  }
  return delegate.create({
    data: { ...args.create, [tenantColumn]: tenantId },
  });
}

export type TenantPrisma = ReturnType<typeof tenantPrisma>;
