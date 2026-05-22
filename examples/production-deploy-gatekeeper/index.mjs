#!/usr/bin/env node
// Production Deploy Gatekeeper — TrustAccept end-to-end demo.
//
// In production this script would call request_approval through the
// TrustAccept MCP server (stdio). It uses the HTTP wrapper directly
// here because that's what the MCP server itself proxies to and it
// keeps the script readable. The behaviour the agent observes is
// identical.
//
// Run: node examples/production-deploy-gatekeeper/index.mjs

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_URL = process.env.TRUSTACCEPT_API_URL ?? "http://localhost:3000";
const PUBLIC_KEY_PATH =
  process.env.TRUSTACCEPT_RECEIPT_PUBLIC_KEY_PEM_PATH ??
  resolve(fileURLToPath(import.meta.url), "../../../.demo-keys/public.pem");
const VERIFY_SCRIPT = resolve(
  fileURLToPath(import.meta.url),
  "../../verify-receipt/verify.mjs",
);

const action = {
  type: "production_deploy",
  summary: "Deploy checkout-api v4.2.0 to production",
  payload: { service: "checkout-api", commit: "abc1234", strategy: "blue-green" },
};
const principal = { type: "email", value: "alex@trustaccept.dev" };
const context = {
  agent_name: "release-bot",
  environment: "production",
  business_justification: "Scheduled weekly release window.",
};

async function main() {
  console.log("[1/6] release-bot requesting approval for production_deploy …");
  const create = await fetch(`${API_URL}/api/v1/approvals`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, principal, context }),
  });
  if (!create.ok) throw new Error(`POST /api/v1/approvals → HTTP ${create.status}`);
  const { approval, approval_url } = await create.json();
  const approvalUrl =
    approval_url ?? `${API_URL}/approve/${encodeURIComponent(approval.id)}`;

  console.log(
    `      policy → ${approval.policy_id} (risk ${approval.risk_level}, action_hash ${approval.action_hash.slice(0, 23)}…)`,
  );
  console.log(`      request id: ${approval.id}`);
  console.log("");
  console.log("[2/6] Human approver: open the approval page in a browser:");
  console.log(`      ${approvalUrl}`);
  console.log("      Click \"Accept\" to continue.");
  console.log("");
  console.log("[3/6] Polling get_approval_status every 3s for up to 5 minutes …");

  const start = Date.now();
  let resolved = approval;
  while (resolved.status === "pending") {
    if (Date.now() - start > 5 * 60_000) {
      throw new Error("Timed out waiting for human decision");
    }
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`${API_URL}/api/v1/approvals/${encodeURIComponent(approval.id)}`);
    if (!res.ok) throw new Error(`GET /api/v1/approvals/${approval.id} → HTTP ${res.status}`);
    const body = await res.json();
    resolved = body.approval;
    process.stdout.write(`      status=${resolved.status}\r`);
  }
  console.log("");
  console.log(`[4/6] Decision: status=${resolved.status}, decided_by=${resolved.decided_by}`);
  if (resolved.status !== "accepted") {
    console.log(`      → Halting deploy (status=${resolved.status}).`);
    process.exit(0);
  }

  if (!resolved.receipt_jwt) {
    throw new Error(
      "Approval was accepted but receipt_jwt was null. Is TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM set on the server?",
    );
  }

  console.log("");
  console.log("[5/6] Signed receipt (JWT, RS256):");
  console.log(`      ${resolved.receipt_jwt}`);
  console.log("");
  console.log("[6/6] Verifying receipt EXTERNALLY (no TrustAccept calls) …");
  const verify = spawnSync(
    "node",
    [VERIFY_SCRIPT, resolved.receipt_jwt, "--public-key", PUBLIC_KEY_PATH],
    { stdio: "inherit" },
  );
  if (verify.status !== 0) {
    throw new Error(`verify-receipt exited with code ${verify.status}`);
  }

  console.log("");
  console.log("✅ release-bot would now run: kubectl rollout deploy …");
  console.log(
    "   The receipt JWT above is the audit-grade proof that a named human approved this exact action payload.",
  );
}

main().catch((err) => {
  console.error("DEMO FAILED:", err.message ?? err);
  process.exit(1);
});
