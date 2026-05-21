# SECURITY_ONE_PAGER.md

Evidence-backed summary of the security posture of the TrustAccept MVP. Every claim references a file in this repository as of Block 5.

## Cryptographic primitives

| Primitive | Implementation | Source |
|---|---|---|
| Receipt JWT signing | RS256 via Node `node:crypto` (`createSign("RSA-SHA256")`) | [`src/server/receipts.ts`](../../src/server/receipts.ts) |
| Action hash | SHA-256 of canonical JSON (sorted keys at every depth, arrays preserved, undefined dropped) | [`src/server/action-hash.ts`](../../src/server/action-hash.ts) |
| Public key publication | JWKS at `/.well-known/jwks.json` (Next.js rewrite to `/api/jwks`) | [`app/api/jwks/route.ts`](../../app/api/jwks/route.ts), [`next.config.js`](../../next.config.js) |
| Signing key source | `TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM` env var; PKCS#8 PEM; single key for the MVP | [`src/server/receipts.ts`](../../src/server/receipts.ts) `loadPrivateKeyPem` |
| Key id | `trustaccept-receipt-rs256-1` (constant for the MVP) | `RECEIPT_KEY_ID` in `src/server/receipts.ts` |
| Verification path | Standalone Node script; no TrustAccept dependencies; signature check against public key from file, JWKS URL, or env var | [`examples/verify-receipt/verify.mjs`](../../examples/verify-receipt/verify.mjs) |

Receipts are generated **on demand** at read time and are never persisted. Design rationale in [`src/server/receipts.md`](../../src/server/receipts.md).

## Authorization model

| Concern | Implementation | Source |
|---|---|---|
| Pre-execution policy | Deterministic, rule-based, no LLM at decision time | [`src/server/policies.ts`](../../src/server/policies.ts) |
| Rule registry | Seven ordered rules, first match wins, default rule catches the unrecognized | `RULES` in `src/server/policies.ts`, full registry in [`POLICY_RULES.md`](POLICY_RULES.md) |
| Auto-decision actor | Synthetic `policy:{policy_id}` SessionUser; goes through the same `updateRiskRecordDecision` path as a human approval | [`src/server/approvals.ts`](../../src/server/approvals.ts) `syntheticPolicyActor`, `createApproval` |
| Tenant scoping | `assertCanAccessOrganizationRecord` runs on every record read inside the service layer | [`src/server/auth.ts`](../../src/server/auth.ts), called from `src/server/riskRecords.ts` |
| Receipt actor binding | `decided_by` is `RiskRecord.decisionBy` verbatim — name string for humans, `policy:{policy_id}` for auto-decisions. No email lookup at issuance time. | [`src/server/receipts.ts`](../../src/server/receipts.ts) `buildReceiptClaims`, [`src/server/receipts.md`](../../src/server/receipts.md) |

## Audit

| Event | Source |
|---|---|
| `risk_record.created` — written by `createRiskRecord` on every approval request | [`src/server/riskRecords.ts`](../../src/server/riskRecords.ts), [`src/server/auditLogs.ts`](../../src/server/auditLogs.ts) |
| `decision.accepted` / `decision.rejected` / `decision.remediation_required` — written by `updateRiskRecordDecision` on every resolution (human or policy) | same |
| `audit_log_ref` in the receipt | `${RiskRecord.id}:${RiskRecord.decisionAt}` — deterministic composite reference per [`MARKETPLACE_AUDIT.md`](../../MARKETPLACE_AUDIT.md) §9 |

The audit log table is **append-only by application convention**; the schema comment on `model AuditLog` in `prisma/schema.prisma` requires INSERT-only access.

## MVP scope — what is NOT yet production-grade

The product is shipping as an MVP for IBM Agent Connect submission. The following are explicitly known limitations rather than overlooked gaps. Each is roadmap, not blocker for the demo.

| Limitation | Today | Roadmap |
|---|---|---|
| Storage | In-memory `Map` ([`src/server/store.ts`](../../src/server/store.ts)); Prisma schema present but not wired at runtime | Postgres migration |
| Signing key | Single env-configured RSA private key | Multi-key JWKS with `kid` rotation; per-tenant signing keys |
| Authentication | Demo session via the existing `requireDashboardAccess` / `requireDecisionAccess` helpers ([`src/server/auth.ts`](../../src/server/auth.ts)); always returns the demo user in demo mode | Real session lookup (SSO / SAML / token-based) |
| Approval URL capability | The hosted `/approve/[id]` page is publicly readable — the URL is the capability | Signed URLs with expiry and one-time-use semantics |
| MCP transport | stdio only ([`apps/mcp-server/src/index.ts`](../../apps/mcp-server/src/index.ts)) | Streamable HTTP |
| Tool allowlist | `tool_id` is reserved on the input/output shape but not enforced | Allowlist enforcement |
| Background expiration | None; expiration is computed at presentation time | Background sweep + receipt-time `iat`/`exp` claim |
| SIEM export, ServiceNow / Jira bridges, policy-editing UI, DB-backed policies | Not implemented | All on roadmap |

Status: **not yet certified** for SOC 2, ISO 27001, FedRAMP, HIPAA, or any other compliance framework. No claim to current Anthropic, IBM, Microsoft, or Auth0 partnership review status is made in this document.

## Patent posture

| Subject | Status |
|---|---|
| Channel-Bound Origin-Verified OTP Delivery | Provisional patent filed. **This primitive is not part of the TrustAccept MVP** in this submission. |
| Policy engine, receipts, MCP server, action hash | No patent claims |

Anyone is free to implement a similar policy engine, receipt format, action-hash scheme, or MCP server. TrustAccept's defensibility comes from the integrated, code-resident implementation and the action-bound signed receipt — not from patent protection.
