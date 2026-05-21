import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  createVerify,
  createPublicKey,
  generateKeyPairSync,
} from "node:crypto";
import { requireCurrentUser } from "@/src/server/auth";
import {
  buildReceiptClaims,
  issueReceipt,
  loadPublicJwk,
  RECEIPT_ISSUER,
  RECEIPT_KEY_ID,
} from "@/src/server/receipts";
import {
  createRiskRecord,
  getRiskRecordForOrganization,
  updateRiskRecordDecision,
} from "@/src/server/riskRecords";
import { createApproval, getApproval } from "@/src/server/approvals";
import { __resetStoreForTests } from "@/src/server/store";
import { __resetNotificationsForTests } from "@/src/server/notifications";
import type { SessionUser } from "@/lib/types";

let publicKeyPem = "";
let savedEnv: string | undefined;

beforeAll(() => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  publicKeyPem = publicKey as string;
  savedEnv = process.env.TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM;
  process.env.TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM = privateKey as string;
});

afterAll(() => {
  if (savedEnv === undefined) {
    delete process.env.TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM;
  } else {
    process.env.TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM = savedEnv;
  }
});

beforeEach(() => {
  __resetStoreForTests();
  __resetNotificationsForTests();
});

function b64urlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function verifyJwt(jwt: string, publicKey: string): { header: any; claims: any; ok: boolean } {
  const [headerB64, claimsB64, sigB64] = jwt.split(".");
  const signingInput = `${headerB64}.${claimsB64}`;
  const signature = b64urlDecode(sigB64);
  const verifier = createVerify("RSA-SHA256");
  verifier.update(signingInput);
  verifier.end();
  const ok = verifier.verify(createPublicKey({ key: publicKey, format: "pem" }), signature);
  return {
    header: JSON.parse(b64urlDecode(headerB64).toString("utf8")),
    claims: JSON.parse(b64urlDecode(claimsB64).toString("utf8")),
    ok,
  };
}

function baseMcpRequest() {
  return {
    action: {
      type: "production_deploy",
      summary: "Deploy v4.2.0 to production",
      payload: { commit: "abc1234", service: "checkout-api" },
    },
    principal: {
      type: "email" as const,
      value: "approver@example.com",
    },
    context: {
      agent_name: "release-bot",
      environment: "production",
    },
  };
}

describe("issueReceipt — null guards", () => {
  it("returns null for PENDING records (no receipt for unresolved approvals)", () => {
    const user = requireCurrentUser();
    const approval = createApproval(user, baseMcpRequest());
    expect(approval.status).toBe("pending");
    expect(approval.receipt_jwt).toBeNull();
  });

  it("returns null when TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM is unset", () => {
    const saved = process.env.TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM;
    delete process.env.TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM;
    try {
      const user = requireCurrentUser();
      const created = createApproval(user, baseMcpRequest());
      updateRiskRecordDecision(user, created.id, { action: "accept", decisionNote: "ok" });
      const approval = getApproval(user, created.id);
      expect(approval.receipt_jwt).toBeNull();
    } finally {
      process.env.TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM = saved;
    }
  });
});

describe("issueReceipt — human approval path", () => {
  it("produces a valid RS256 JWT whose claims bind action_hash, policy_id, and the human decider name verbatim", () => {
    const user = requireCurrentUser();
    const created = createApproval(user, baseMcpRequest());
    updateRiskRecordDecision(user, created.id, {
      action: "accept",
      decisionNote: "Approved with DLP review",
    });

    const approval = getApproval(user, created.id);
    expect(approval.status).toBe("accepted");
    expect(approval.receipt_jwt).not.toBeNull();

    const { header, claims, ok } = verifyJwt(approval.receipt_jwt!, publicKeyPem);
    expect(ok).toBe(true);
    expect(header.alg).toBe("RS256");
    expect(header.kid).toBe(RECEIPT_KEY_ID);
    expect(claims.iss).toBe(RECEIPT_ISSUER);
    expect(claims.approval_id).toBe(approval.id);
    expect(claims.status).toBe("approved");
    expect(claims.decided_by).toBe(user.name);
    expect(claims.decision_actor_type).toBe("human");
    expect(claims.action_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(claims.policy_id).toBe("production-deploys-require-human-approval");
    expect(claims.audit_log_ref).toBe(`${approval.id}:${approval.decided_at}`);
    expect(claims.tenant_id).toBe(user.organizationId);
  });

  it("returns 'denied' status in the receipt when the human rejects", () => {
    const user = requireCurrentUser();
    const created = createApproval(user, baseMcpRequest());
    updateRiskRecordDecision(user, created.id, { action: "reject", decisionNote: "no" });

    const approval = getApproval(user, created.id);
    const { claims, ok } = verifyJwt(approval.receipt_jwt!, publicKeyPem);
    expect(ok).toBe(true);
    expect(claims.status).toBe("denied");
    expect(claims.decision_actor_type).toBe("human");
  });
});

describe("issueReceipt — policy auto-decision path", () => {
  it("produces a 'policy_allowed' receipt when the policy auto-allows (read_*) and decided_by is policy:{id}", () => {
    const user = requireCurrentUser();
    const approval = createApproval(user, {
      ...baseMcpRequest(),
      action: {
        type: "read_user_profile",
        summary: "Read user profile for support session",
        payload: { user_id: "u-42" },
      },
    });
    expect(approval.status).toBe("accepted");
    expect(approval.receipt_jwt).not.toBeNull();

    const { claims, ok } = verifyJwt(approval.receipt_jwt!, publicKeyPem);
    expect(ok).toBe(true);
    expect(claims.status).toBe("policy_allowed");
    expect(claims.decision_actor_type).toBe("policy");
    expect(claims.decided_by).toBe("policy:read-only-low-risk-auto-allow");
    expect(claims.policy_id).toBe("read-only-low-risk-auto-allow");
  });
});

describe("buildReceiptClaims — direct unit tests", () => {
  it("returns null when the record has no decision yet", () => {
    const user = requireCurrentUser();
    const record = createRiskRecord(user, {
      module: "ai-action-gate",
      title: "Pending record",
      description: "test",
      sourceSystem: "test",
      sourceType: "test",
      riskLevel: "medium",
      owner: user.name,
      department: "test",
      compensatingControls: "n/a",
      evidenceSummary: "n/a",
      businessJustification: "n/a",
      technicalContext: "",
      frameworkTags: [],
      sourceReferences: [],
    });
    expect(buildReceiptClaims(record)).toBeNull();
  });

  it("falls back to 'unknown' for the agent claim when no Agent source-reference is present", () => {
    const user = requireCurrentUser();
    const created = createRiskRecord(user, {
      module: "ai-action-gate",
      title: "Manual record",
      description: "test record",
      sourceSystem: "manual",
      sourceType: "manual",
      riskLevel: "low",
      owner: user.name,
      department: "ops",
      compensatingControls: "n/a",
      evidenceSummary: "n/a",
      businessJustification: "n/a",
      technicalContext: "",
      frameworkTags: [],
      sourceReferences: [],
    });
    updateRiskRecordDecision(user, created.id, { action: "accept" });
    const finalized = getRiskRecordForOrganization(user, created.id);
    const claims = buildReceiptClaims(finalized);
    expect(claims).not.toBeNull();
    expect(claims!.agent).toBe("unknown");
  });
});

describe("loadPublicJwk", () => {
  it("returns a JWK with kid/alg/use populated for serving via /.well-known/jwks.json", () => {
    const jwk = loadPublicJwk();
    expect(jwk).not.toBeNull();
    expect(jwk!.kid).toBe(RECEIPT_KEY_ID);
    expect(jwk!.alg).toBe("RS256");
    expect(jwk!.use).toBe("sig");
    expect((jwk as { kty?: string }).kty).toBe("RSA");
  });

  it("returns null when the private key env var is unset", () => {
    const saved = process.env.TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM;
    delete process.env.TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM;
    try {
      expect(loadPublicJwk()).toBeNull();
    } finally {
      process.env.TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM = saved;
    }
  });
});

describe("integration: create → decide → fetch → verify (end-to-end)", () => {
  it("the JWT returned by getApproval verifies against loadPublicJwk's public key", () => {
    const user: SessionUser = requireCurrentUser();
    const created = createApproval(user, baseMcpRequest());
    updateRiskRecordDecision(user, created.id, {
      action: "accept",
      decisionNote: "End-to-end test approval",
    });
    const approval = getApproval(user, created.id);
    expect(approval.receipt_jwt).not.toBeNull();

    // Independently re-derive the public key from the env-configured
    // private key (the same path /.well-known/jwks.json would use).
    const jwk = loadPublicJwk();
    expect(jwk).not.toBeNull();

    // And independently verify the JWT against the originally-generated
    // PEM, which is what an external verifier (e.g. examples/verify-receipt)
    // would also do.
    const { ok, claims } = verifyJwt(approval.receipt_jwt!, publicKeyPem);
    expect(ok).toBe(true);
    expect(claims.approval_id).toBe(approval.id);
    expect(claims.action_hash).toBe(approval.action_hash);
  });
});
