import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetStoreForTests } from "@/src/server/store";
import { createDecisionV1 } from "@/src/server/decisions";
import { requireCurrentUser } from "@/src/server/auth";
import {
  canonicalHash,
  signDecisionReceipt,
  verifyDecisionReceipt,
} from "@/src/server/signing";

beforeEach(() => {
  __resetStoreForTests();
});

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

describe("M1: decisions table migration", () => {
  it("declares the additive columns in the correct migration", () => {
    const sql = readFileSync(
      join(MIGRATIONS_DIR, "20260513000002_decisions_evidence_columns", "migration.sql"),
      "utf8",
    );
    expect(sql).toContain(`ADD COLUMN IF NOT EXISTS "policy_version" TEXT NOT NULL DEFAULT 'v0'`);
    expect(sql).toContain(`ADD COLUMN IF NOT EXISTS "agent_id" UUID NULL`);
    expect(sql).toContain(`ADD COLUMN IF NOT EXISTS "evidence_hash" TEXT NULL`);
    expect(sql).toContain(`ADD COLUMN IF NOT EXISTS "signed_receipt" TEXT NULL`);
    expect(sql).toContain(`CREATE INDEX IF NOT EXISTS "idx_decisions_agent_id"`);
    expect(sql).toContain(`CREATE INDEX IF NOT EXISTS "idx_decisions_created_at"`);
  });

  it("backfills policy_version and computes evidence_hash from request_body", () => {
    const sql = readFileSync(
      join(MIGRATIONS_DIR, "20260513000002_decisions_evidence_columns", "migration.sql"),
      "utf8",
    );
    expect(sql).toContain(`UPDATE "decisions" SET "policy_version" = 'v0'`);
    expect(sql).toContain(`encode(digest("request_body"::text, 'sha256'), 'hex')`);
  });

  it("orders migrations so agents table comes after the decisions columns", () => {
    const dirs = readdirSync(MIGRATIONS_DIR).sort();
    expect(dirs).toEqual([
      "20260513000001_decisions_baseline",
      "20260513000002_decisions_evidence_columns",
      "20260513000003_agents_table",
    ]);
  });

  it("uses IF NOT EXISTS guards so the migration is idempotent", () => {
    for (const dir of readdirSync(MIGRATIONS_DIR)) {
      const sql = readFileSync(join(MIGRATIONS_DIR, dir, "migration.sql"), "utf8");
      const tableCreates = sql.match(/CREATE TABLE(?! IF NOT EXISTS)/g);
      const indexCreates = sql.match(/CREATE INDEX(?! IF NOT EXISTS)/g);
      expect(tableCreates).toBeNull();
      expect(indexCreates).toBeNull();
    }
  });
});

describe("M1: decision record defaults on insert", () => {
  it("defaults policy_version to 'v0' on every new decision", () => {
    const user = requireCurrentUser();
    const record = createDecisionV1(user, {
      action: "transfer.funds",
      decision: "accept",
      amount: 25,
      request_body: { amount: 25, currency: "USD" },
    });
    expect(record.policyVersion).toBe("v0");
  });

  it("computes a sha256 evidence_hash from the request body when provided", () => {
    const user = requireCurrentUser();
    const body = { foo: "bar", baz: [1, 2, 3] };
    const record = createDecisionV1(user, {
      action: "send.email",
      decision: "accept",
      request_body: body,
    });
    expect(record.evidenceHash).toBe(canonicalHash(body));
    expect(record.evidenceHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("leaves evidence_hash undefined when no request body is provided", () => {
    const user = requireCurrentUser();
    const record = createDecisionV1(user, {
      action: "noop",
      decision: "accept",
    });
    expect(record.evidenceHash).toBeUndefined();
  });

  it("issues a compact JWS receipt that verifies against the active key", () => {
    const user = requireCurrentUser();
    const record = createDecisionV1(user, {
      action: "transfer.funds",
      decision: "accept",
    });
    expect(record.signedReceipt).toBeDefined();
    expect(record.signedReceipt!.split(".")).toHaveLength(3);
    const result = verifyDecisionReceipt(record.signedReceipt!);
    expect(result.valid).toBe(true);
    expect(result.payload?.decision_id).toBe(record.id);
    expect(result.payload?.tenant_id).toBe(user.organizationId);
    expect(result.payload?.policy_version).toBe("v0");
  });

  it("agent_id is null when omitted (preserves backward-compat insert path)", () => {
    const user = requireCurrentUser();
    const record = createDecisionV1(user, {
      action: "noop",
      decision: "accept",
    });
    expect(record.agentId).toBeUndefined();
  });
});

describe("canonical hash + signing primitives", () => {
  it("produces the same hash regardless of key insertion order", () => {
    const a = { x: 1, y: { a: 1, b: 2 } };
    const b = { y: { b: 2, a: 1 }, x: 1 };
    expect(canonicalHash(a)).toBe(canonicalHash(b));
  });

  it("rejects a tampered JWS", () => {
    const jws = signDecisionReceipt({
      iss: "trustaccept",
      decision_id: "d1",
      tenant_id: "demo-org",
      action: "a",
      decision: "accept",
      policy_version: "v0",
      iat: 1,
    });
    const [h, p, s] = jws.split(".");
    // Flip the first signature byte by toggling its leading character.
    // Avoid the trailing 2 chars whose low bits are padding (changing them
    // does not affect the decoded signature byte and would not invalidate).
    const head = s[0];
    const swapped = head === "A" ? "B" : "A";
    const broken = `${h}.${p}.${swapped}${s.slice(1)}`;
    expect(verifyDecisionReceipt(broken).valid).toBe(false);
  });
});
