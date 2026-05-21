# Receipts — design notes

Receipts are RS256-signed JWTs issued **on demand** for resolved approvals. They are the externally-verifiable proof that a specific human (or policy) decided on a specific action. Each receipt cryptographically binds the action hash to the decision so the receipt cannot be detached from the action it approved.

## Lifecycle

1. The wrapper's `POST /api/v1/approvals` writes an approval record. The action's canonical-JSON SHA-256 is stored in `sourceReferences[label="Action hash"]`.
2. When the record is resolved (human approval, human denial, or policy auto-decision), `decisionBy` and `decisionAt` are populated on the underlying `RiskRecord`.
3. The next call to `GET /api/v1/approvals/[id]` or MCP `get_approval_status` calls `issueReceipt(record)`. The JWT is constructed, signed, and returned in `receipt_jwt`. It is **not stored**.

## Why on-demand and not persisted

- Schema migrations are forbidden for the MVP. A `receipt_jwt` column would require one.
- JWTs are deterministic-ish (`iat` and the signature vary per issuance) but the security-relevant claims are stable. Re-issuing on read is safe.
- Compute cost is one RSA signature per response. Negligible relative to network and database I/O.

## Signing key

| Item | Value |
|---|---|
| Algorithm | RS256 |
| Source | `process.env.TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM` |
| Format | PEM (PKCS#8). Literal `\n` escapes are accepted (common in dotenv) |
| Key id (kid) | `trustaccept-receipt-rs256-1` (single key, no rotation in the MVP) |
| Public key endpoint | `GET /.well-known/jwks.json` (rewrites to `/api/jwks`) |

When the env var is unset, `issueReceipt()` returns `null` rather than throwing. The wrapper's locked output shape carries `receipt_jwt: null` and downstream callers handle this case naturally. This makes local dev permissive and keeps existing tests free of crypto setup.

For production, the env var must be set. There is no fallback signing key in source.

## Claims

Every claim is derived from the `RiskRecord` (no separate decision metadata table). See [`apps/mcp-server/FIELD_MAPPING.md`](../../apps/mcp-server/FIELD_MAPPING.md) §3 for the field mapping.

| Claim | Source |
|---|---|
| `approval_id` | `RiskRecord.id` |
| `agent` | `sourceReferences[label="Agent"].externalId` or `"unknown"` |
| `action_hash` | `sourceReferences[label="Action hash"].externalId` (Block 4) |
| `policy_id` | `sourceReferences[label="Policy"].externalId` (Block 4) |
| `status` | derived: human accept→`approved`, human reject→`denied`, policy accept→`policy_allowed`, policy reject→`policy_denied`, else `remediation_required` / `expired` |
| `decided_by` | `RiskRecord.decisionBy` **verbatim** — name string for humans, `"policy:{policy_id}"` for the synthetic policy actor. **Never** an email lookup from the user store. See "decided_by rule" below. |
| `decision_actor_type` | `"policy"` if `decisionBy.startsWith("policy:")` else `"human"` |
| `decided_at` | `RiskRecord.decisionAt` (ISO) |
| `expires_at` | `RiskRecord.expirationDate` (ISO) or `null` |
| `tenant_id` | `RiskRecord.organizationId` |
| `audit_log_ref` | `${RiskRecord.id}:${RiskRecord.decisionAt}` — composite reference (see "audit_log_ref" below) |
| `iss` | `"trustaccept"` |
| `iat` | issuance unix timestamp (varies per receipt) |

### decided_by rule (per FIELD_MAPPING.md tightening)

`decided_by` is `RiskRecord.decisionBy` verbatim:
- For human approvals/denials, this is `user.name` (whatever the existing `updateRiskRecordDecision` stored).
- For policy auto-decisions, this is `policy:{policy_id}` because the wrapper builds a synthetic policy actor with `name = "policy:{policy_id}"`.

The receipt service **does not** look up an email from the user store at issuance time. Reasons:
- Adds an I/O step per receipt request.
- Diverges from what's stored, opening a window for "audit doesn't match record" complaints later.
- Email addresses can change; the stored name is immutable per record.

If a future product surface needs an email, it should be added as a separate claim populated from the original `SessionUser` at decision time and stored on the record — not synthesized at issuance.

### audit_log_ref

Use the composite reference `${id}:${decisionAt}` documented in [`MARKETPLACE_AUDIT.md`](../../MARKETPLACE_AUDIT.md) §9. Rationale:
- `updateRiskRecordDecision` does not return the new `AuditLog` row id, and the audit refused to refactor existing services for this.
- The composite is deterministic and stable (the audit log is append-only by convention).
- Verifiers don't need to dereference the ref to verify the receipt; the ref is for forensic cross-checking against the audit log table.

Richer audit-log identifiers (real row id, signed audit-chain reference) are post-MVP work.

## Verification

External verifiers (see `examples/verify-receipt/`) read the public key from a local file or from `/.well-known/jwks.json`. The verification path does **not** touch TrustAccept's database or any TrustAccept HTTP endpoint other than (optionally) the JWKS endpoint. That decoupling is the IBM demo proof point.

Verifiers SHOULD check:
- Signature is valid against the published public key
- `iss` is `"trustaccept"`
- `kid` in the JWT header matches a published JWK
- `action_hash` matches an independently-computed SHA-256 of the action they observed an agent attempt

Verifiers SHOULD NOT trust:
- `iat` for revocation decisions — there is no revocation channel in the MVP
- `expires_at` as a verification deadline — it is the action's authorization window, not the receipt's TTL

## Rotation (post-MVP)

The current implementation has one signing key and one `kid`. To rotate:
1. Publish the new public key in JWKS alongside the old key (multi-key JWKS).
2. Switch the env var to the new private key.
3. Drop the old key from JWKS after all callers have refreshed their cache.

The verifier must respect `kid` and fail closed when an unknown `kid` is presented. This is a Block 6+ concern.
