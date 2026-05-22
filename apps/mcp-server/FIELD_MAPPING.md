# FIELD_MAPPING.md

**Branch:** `ibmflavor/marketplace-submission`
**Date:** 2026-05-20
**Companion to:** [`MARKETPLACE_AUDIT.md`](../../MARKETPLACE_AUDIT.md)
**Status:** Contract for Blocks 2–5. Any block that adds a field updates this document first.

This document is the **storage contract** for the MCP-facing `request_approval` / `get_approval_status` / `list_pending_approvals` tools. Every MCP input field has an explicit home in TrustAccept's data model; every MCP output field has an explicit source.

Storage rules from the plan are filled in with the audit's findings. The defaults below are picked from the **least-disruptive mapping** that uses first-class `RiskRecord` fields wherever they exist and `sourceReferences[]` only for short ID-bearing values.

All `sourceReferences[].externalId` values **must be ≤ 120 characters** (audit §8). Receipts are **generated on demand**, never persisted.

---

## 1. MCP `request_approval` input → TrustAccept storage

Input shape is locked from Day 1 (action is an object, never a string):

```ts
request_approval({
  action:    { type, summary, payload },
  principal: { type, value },
  context:   { agent_name?, environment?, amount?, resource?, business_justification?, metadata? },
  tool_id?:  string
})
```

| MCP input field | Storage location | Notes |
|---|---|---|
| `action.type` | `sourceReferences[]` as `{ system: "trustaccept", label: "Action type", externalId: action.type }` | Powers the policy engine at request time. ≤ 120 chars. |
| `action.summary` | `RiskRecord.title` (first-class) | Zod requires `min(4).max(280)`. **Wrapper rejects summaries shorter than 4 chars at the schema layer.** |
| `action.payload` | **NOT persisted directly.** Only the SHA-256 hash is stored (see `action_hash` below). | Plan rule: do not store full payload JSON. |
| `principal.type` | `sourceReferences[]` as `{ system: "trustaccept", label: "Principal type", externalId: principal.type }` | One of `email \| phone \| user_id`. |
| `principal.value` | `RiskRecord.owner` (first-class string, `min(1).max(120)`) AND `sourceReferences[]` as `{ system: "trustaccept", label: "Principal value", externalId: principal.value }` | `owner` is the display field; the source reference is the **queryable source of truth** and must respect the 120-char cap exactly. **The wrapper rejects `principal.value > 120 chars` with a 400 validation error at the schema boundary — never silently truncate the queryable `sourceReferences[]` copy.** A future UI may render a truncated `owner` mirror (with `…` suffix) purely for display, but that does not authorize accepting an oversized principal value upstream. |
| `context.agent_name` | `sourceReferences[]` as `{ system: "trustaccept", label: "Agent", externalId: agent_name }` | Optional. |
| `context.environment` | `sourceReferences[]` as `{ system: "trustaccept", label: "Environment", externalId: environment }` | Optional. e.g. `"production"`. |
| `context.amount` | `sourceReferences[]` as `{ system: "trustaccept", label: "Amount", externalId: String(amount) }` | Optional. **Stored as decimal string.** Policy engine reads `context.amount` directly from the request, not from storage. |
| `context.resource` | `sourceReferences[]` as `{ system: "trustaccept", label: "Resource", externalId: resource }` | Optional. |
| `context.business_justification` | `RiskRecord.businessJustification` (first-class long text, `min(1).max(4000)`) | If absent, wrapper defaults to a templated sentence (`"Submitted via TrustAccept MCP by {agent_name or 'agent'}. No business justification provided."`) to satisfy the `min(1)` Zod constraint. |
| `context.metadata` | **Deferred to post-MVP.** Not persisted. | Document in MCP tool description that metadata is accepted but not retained in the MVP. Future block can add a `Json` column or splat selected metadata into `sourceReferences[]`. |
| `tool_id` | `sourceReferences[]` as `{ system: "trustaccept", label: "Tool ID", externalId: tool_id }` | Enforced before persistence when `TRUSTACCEPT_ALLOWED_TOOL_IDS` is configured. The env var is a comma-separated list; requests with missing or unlisted `tool_id` fail with 403. |

### Wrapper-supplied static fields (required by `RiskRecordCreateInput` Zod schema)

These fields are required by the existing schema but are not part of the MCP input. The wrapper supplies them:

| Field | Wrapper-supplied value |
|---|---|
| `module` | `"ai-action-gate"` (always, for MCP-originated records) |
| `description` | Templated: `"Agent action request from {context.agent_name ?? 'unnamed agent'}. Action type: {action.type}."` (≥ 4 chars guaranteed) |
| `sourceSystem` | `"trustaccept-mcp"` |
| `sourceType` | `"agent_action_request"` |
| `department` | `context.environment ?? "AI Agents"` (cheap reuse of a required field) |
| `compensatingControls` | `"Pre-execution approval gate. Action will not execute until this record resolves to ACCEPTED."` (static, satisfies `min(1)`) |
| `evidenceSummary` | `"Action hash and policy decision captured at request time; signed receipt JWT issued on resolution."` (static, satisfies `min(1)`) |
| `frameworkTags` | `[]` |

---

## 2. Policy and action-hash fields (Block 4) → TrustAccept storage

These are produced by `evaluateApprovalPolicy(input)` and `hashAction(action)` in the wrapper, then written by the wrapper into the same `RiskRecord` create call.

| Computed value | Storage location | Notes |
|---|---|---|
| `risk_level` | `RiskRecord.riskLevel` (first-class) | Maps `"low" \| "medium" \| "high" \| "critical"` directly. **Audit §1 confirms first-class enum.** Do not also write to `sourceReferences[]`. |
| `policy_id` | `sourceReferences[]` as `{ system: "trustaccept", label: "Policy", externalId: policy_id }` | Policy slugs are short (e.g. `"production-deploys-require-human-approval"` = 41 chars). Well under 120. |
| `policy_reason` | `RiskRecord.technicalContext` (first-class long text, `max(4000)`, default `""`) | **Selected because `technicalContext` is the only required-text field with a default**, so populating it does not change required-field semantics from the wrapper's perspective. Policy reasons are typically 1–3 sentences, well within 4000 chars. Fallback: if a future policy ever needs >4000 chars, truncate with `…` suffix. **Alternative homes considered:** `businessJustification` is reserved for the principal-supplied justification (see §1); `evidenceSummary` is reserved for the audit narrative; `description` is user-visible summary text. **Do not move `policy_reason` between these without updating this contract.** |
| `action_hash` | `sourceReferences[]` as `{ system: "trustaccept", label: "Action hash", externalId: "sha256:" + hexDigest }` | SHA-256 hex digest is 64 chars; `"sha256:"` prefix makes 71 chars. Under 120. |
| `expires_at` | `RiskRecord.expirationDate` (first-class) | **Audit §8 confirms `isoDate` Zod constraint accepts `z.string().datetime()`** — wrapper passes an absolute ISO 8601 datetime. **`createRiskRecord` preserves `expirationDate` verbatim** (audit §3). Fallback (only if a future validation breaks): `sourceReferences[]` as `{ system: "trustaccept", label: "Expires at", externalId: expires_at_iso }`. |

### Auto-policy decision finalization

When the policy engine returns `decision === "allow"` or `decision === "deny"`:

1. **First**, call `createRiskRecord(user, data)` — this produces a PENDING record with full audit logging (`risk_record.created` event).
2. **Then**, immediately call `updateRiskRecordDecision(syntheticPolicyActor, recordId, { action: "accept" \| "reject", decisionNote: policy_reason })` — this produces an `ACCEPTED` / `REJECTED` record with full audit logging (`decision.accepted` / `decision.rejected` event).
3. The synthetic policy actor is constructed in-memory only (not persisted to the user store) with:
   - `id`: not set (undefined OK — `recordAuditEvent` handles missing id)
   - `name`: `"policy:{policy_id}"`
   - `email`: `"policy@trustaccept.local"`
   - `role`: `"OWNER"` (passes `requireDecisionAccess` if ever surfaced via HTTP)
   - `organizationId`: caller's `organizationId`
4. The receipt's `decided_by` then reads `"policy:{policy_id}"` directly from `RiskRecord.decisionBy`, and `decision_actor_type` is computed as `"policy"` based on the `"policy:"` prefix.

When the policy engine returns `decision === "require_approval"`:

- Only step 1 runs. Record stays PENDING. Human resolves via the existing `/approve/[id]` page → `PATCH /api/risk-records/[id]/decision`.

**Do not bypass `createRiskRecord` or `updateRiskRecordDecision`** to manually construct ACCEPTED/REJECTED records. Audit log integrity depends on the existing call paths.

---

## 3. Receipt JWT fields (Block 5) → source

Receipts are issued on demand by `issueReceipt(decision)` and embedded in the response of `GET /api/v1/approvals/[id]` and MCP `get_approval_status` **only for resolved decisions** (status ∈ {accepted, rejected, remediation_required, expired}).

| Receipt JWT claim | Source |
|---|---|
| `approval_id` | `RiskRecord.id` |
| `agent` | `sourceReferences[]` entry with `label: "Agent"` → `externalId`, or `"unknown"` if absent |
| `action_hash` | `sourceReferences[]` entry with `label: "Action hash"` → `externalId` (already prefixed `sha256:`) |
| `policy_id` | `sourceReferences[]` entry with `label: "Policy"` → `externalId` |
| `status` | Computed: human approval → `"approved"`; human denial → `"denied"`; policy allow → `"policy_allowed"`; policy deny → `"policy_denied"` (detect policy via `RiskRecord.decisionBy.startsWith("policy:")`) |
| `decided_by` | **`RiskRecord.decisionBy` verbatim — always.** This is the name string the existing decision path stores (`user.name` for humans, `"policy:{policy_id}"` for the synthetic policy actor). Do **not** look up an email from the user store at receipt-issuance time. Block 5's `receipts.md` must document this so the choice survives later refactors. |
| `decision_actor_type` | `"policy"` if `decisionBy.startsWith("policy:")` else `"human"` |
| `decided_at` | `RiskRecord.decisionAt` (ISO string) |
| `expires_at` | `RiskRecord.expirationDate` (ISO string) or `null` |
| `tenant_id` | `RiskRecord.organizationId` |
| `audit_log_ref` | **`"{RiskRecord.id}:{RiskRecord.decisionAt}"`** — stable composite reference (audit §9). Richer audit log IDs deferred to post-MVP. |

JWT signing: RS256, single key from env (e.g. `TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM`). Public key exposed via `GET /.well-known/jwks.json` if achievable in <1 hour without schema work; otherwise documented in README.

**Receipt is never stored.** Generation cost is one signature per response.

---

## 4. MCP `get_approval_status` output → source

Locked output schema. All reserved fields default to `null` until later blocks populate them.

| Output field | Source | Block that fills it |
|---|---|---|
| `id` (= `approval_id`) | `RiskRecord.id` | Block 2 |
| `status` | `RiskRecord.status` (lowercase) with presentation-time expiration check: if `status === "pending"` and `RiskRecord.expirationDate < now`, surface as `"expired"` (no DB mutation). | Block 2 (status), Block 5 (expiration check) |
| `policy_id` | `sourceReferences[]` entry `Policy` → `externalId`, or `null` | Block 4 |
| `risk_level` | `RiskRecord.riskLevel`, or `null` for legacy records | Block 4 |
| `policy_reason` | `RiskRecord.technicalContext` (only if originated via MCP — wrapper sets it then), or `null` | Block 4 |
| `action_hash` | `sourceReferences[]` entry `Action hash` → `externalId`, or `null` | Block 4 |
| `tool_id` | `sourceReferences[]` entry `Tool ID` → `externalId`, or `null` | Block 2 |
| `receipt_jwt` | `issueReceipt(record)` if status is resolved (`accepted` / `rejected` / `remediation_required` / `expired`), else `null` | Block 5 |
| `expires_at` | `RiskRecord.expirationDate` (ISO string), or `null` | Block 2 (passthrough), Block 4 (populated by policy) |
| `decided_by` | `RiskRecord.decisionBy` (string — name or `"policy:{id}"`), or `null` | Block 2 |
| `decision_actor_type` | Computed from `decisionBy.startsWith("policy:")` → `"policy"` else `"human"`; `null` if undecided | Block 2 |

---

## 5. Reserved-for-later fields (initially `null`)

All fields in the MCP output schema are reserved from Day 1 to avoid breaking changes:

| Field | Default when wrapper ships in Block 2 | Filled in by |
|---|---|---|
| `policy_id`, `risk_level`, `policy_reason` | `null` (Block 2 ships a no-op policy returning these as null) | Block 4 |
| `action_hash` | `null` | Block 4 |
| `tool_id` | Passed through from input if provided, else `null` | Block 2 |
| `receipt_jwt` | `null` | Block 5 |
| `expires_at` | `null` for the Block 2 no-op; absolute ISO string once Block 4 wires policy | Block 4 |
| `decided_by`, `decision_actor_type` | `null` while pending; populated when resolved | Block 2 (passthrough) |

Block 2's wrapper **must declare and return these fields with `null` values from the first commit**, even before the policy engine exists. This prevents schema-evolution rework when Blocks 4 and 5 land.

---

## 6. What goes where — quick reference card

```
First-class RiskRecord fields used:
  title                    ← action.summary
  description              ← wrapper-supplied template
  sourceSystem             ← "trustaccept-mcp"
  sourceType               ← "agent_action_request"
  riskLevel                ← policy.risk_level     [Block 4]
  owner                    ← principal.value (≤120, truncate display only)
  department               ← context.environment ?? "AI Agents"
  expirationDate           ← policy.expires_at     [Block 4]
  businessJustification    ← context.business_justification (or default)
  technicalContext         ← policy.reason         [Block 4]
  compensatingControls     ← static
  evidenceSummary          ← static
  status                   ← "pending" initially; finalized by updateRiskRecordDecision
  decisionBy               ← user.name OR "policy:{policy_id}"
  decisionAt               ← set by updateRiskRecordDecision
  module                   ← "ai-action-gate"

sourceReferences[] entries (each externalId ≤120 chars):
  { label: "Action type",     system: "trustaccept", externalId: action.type }
  { label: "Principal type",  system: "trustaccept", externalId: principal.type }
  { label: "Principal value", system: "trustaccept", externalId: principal.value }
  { label: "Agent",           system: "trustaccept", externalId: context.agent_name } [optional]
  { label: "Environment",     system: "trustaccept", externalId: context.environment } [optional]
  { label: "Amount",          system: "trustaccept", externalId: String(context.amount) } [optional]
  { label: "Resource",        system: "trustaccept", externalId: context.resource } [optional]
  { label: "Tool ID",         system: "trustaccept", externalId: tool_id } [optional]
  { label: "Policy",          system: "trustaccept", externalId: policy_id } [Block 4]
  { label: "Action hash",     system: "trustaccept", externalId: "sha256:" + hex } [Block 4]
  { label: "Agent run ID",    system: "trustaccept", externalId: agent_run_id } [reserved, post-MVP]

Generated on demand (never persisted):
  receipt_jwt — RS256-signed JWT, claims per §3, only when status is resolved
```

---

## 7. Cross-references

- Audit findings: [`MARKETPLACE_AUDIT.md`](../../MARKETPLACE_AUDIT.md)
- Existing service code: `src/server/riskRecords.ts`, `src/server/auditLogs.ts`, `src/server/auth.ts`
- Existing Zod schemas: `src/lib/validation.ts`
- Runtime type definitions: `lib/types.ts` (**lowercase status strings**, not Prisma enums)
- Existing decision route: `app/api/risk-records/[id]/decision/route.ts` (PATCH)

Any subagent that needs to add a field NOT listed above writes a `BLOCKER-{agent}.md` at repo root and pauses for human review.
