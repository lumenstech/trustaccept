# MARKETPLACE_AUDIT.md

**Branch:** `ibmflavor/marketplace-submission`
**Date:** 2026-05-20
**Block:** 1 (Audit + field mapping)
**Status:** Audit complete. Awaiting human review before any code is written.

This document captures the **ground truth** of the repository as it exists today. Every claim below was verified by reading the referenced file. There are no hardcoded test counts, no assumed file paths, and no speculative behavior — only what the code actually does.

---

## 1. Prisma schema — `prisma/schema.prisma`

### Models present

- `Organization`
- `User`
- `RiskRecord`
- `AuditLog`
- `EvidencePacket`
- `Lead`

### Enums present

| Enum | Values |
|---|---|
| `ProductModule` | `AI_ACTION_GATE`, `ACCESS_ACCEPT`, `VULNERABILITY_ACCEPT`, `KEV_EXPOSURE_REVIEW`, `SECURE_RELEASE_GATE`, `DEVICE_ACCEPT`, `EVIDENCE_DESK` |
| `RiskLevel` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `RiskStatus` | `PENDING`, `ACCEPTED`, `REJECTED`, `REMEDIATION_REQUIRED`, `EXPIRED` |
| `Decision` | `ACCEPT`, `REJECT`, `REMEDIATE` |
| `Role` | `OWNER`, `ADMIN`, `APPROVER`, `VIEWER` |
| `AuditEventType` | `RISK_RECORD_CREATED`, `RISK_RECORD_UPDATED`, `DECISION_ACCEPTED`, `DECISION_REJECTED`, `DECISION_REMEDIATION_REQUIRED`, `EVIDENCE_PACKET_GENERATED`, `APPROVAL_PAGE_VIEWED`, `LEAD_FORM_SUBMITTED` |
| `LeadFormType` | `BOOK_RISK_REVIEW`, `START_PILOT`, `REQUEST_EVIDENCE_DESK`, `CONTACT` |
| `LeadStatus` | `NEW`, `IN_REVIEW`, `CONTACTED`, `CLOSED` |

**Confirmed:** `RiskStatus` is exactly `PENDING / ACCEPTED / REJECTED / REMEDIATION_REQUIRED / EXPIRED`. There is **no `CANCELLED` value**, matching the plan's hard cut on `cancel_approval`.

### `RiskRecord` first-class fields

| Field | Type | Notes |
|---|---|---|
| `id` | `String` `@id @default(cuid())` | |
| `organizationId` | `String` | FK to `Organization` |
| `module` | `ProductModule` | enum |
| `title` | `String` | |
| `description` | `String @db.Text` | long text |
| `sourceSystem` | `String` | |
| `sourceType` | `String` | |
| `riskLevel` | `RiskLevel` | **first-class** — use this for `risk_level` |
| `riskScore` | `Int @default(50)` | |
| `status` | `RiskStatus @default(PENDING)` | |
| `ownerId` | `String?` | FK to `User` (nullable) |
| `ownerLabel` | `String` | display string |
| `department` | `String` | |
| `dueDate` | `DateTime?` | |
| `expirationDate` | `DateTime?` | **first-class** — use this for `expires_at` |
| `reviewDate` | `DateTime?` | |
| `decision` | `Decision?` | |
| `decisionById` | `String?` | FK to `User` |
| `decisionByLabel` | `String?` | display string |
| `decisionAt` | `DateTime?` | |
| `decisionNote` | `String? @db.Text` | long text |
| `compensatingControls` | `String @db.Text` | long text |
| `evidenceSummary` | `String @db.Text` | long text |
| `businessJustification` | `String @db.Text` | long text |
| `technicalContext` | `String @db.Text` | long text |
| `frameworkTags` | `String[]` | Postgres array |
| `sourceReferences` | `Json` | JSON column — actual shape is `Array<{label, system, externalId?, url?}>` (see §8) |
| `createdById` / `updatedById` | `String?` | FK to `User` |
| `createdAt` / `updatedAt` | `DateTime` | |

### `AuditLog` model

- `id`, `organizationId`, `riskRecordId?`, `eventType` (AuditEventType), `actorId?`, `actorName`, `previousStatus?`, `newStatus?`, `metadata` (Json), `createdAt`.
- Comment in schema: "Append-only by application convention. The service layer must only INSERT."

---

## 2. `src/server/` directory listing

Files present (verified with `ls`):

- `api.ts` — error/response helper (`jsonError`, `handleApiError`)
- `auditLogs.ts` — `recordAuditEvent`, `listAuditLogsForRecord`, `listAuditLogsForOrganization`
- `auth.ts` — `getCurrentUser`, `requireCurrentUser`, `requireDashboardAccess`, `requireDecisionAccess`, `assertCanAccessOrganizationRecord`
- `csv.ts` — CSV export helpers
- `evidencePackets.ts` — evidence packet builder + PDF generator
- `leads.ts` — lead capture
- `notifications.ts` — mock notification dispatcher (in-memory log only)
- `riskRecords.ts` — `createRiskRecord`, `updateRiskRecord`, `updateRiskRecordDecision`, read helpers
- `store.ts` — **in-memory `Map` store** (see Critical Finding below)

**Files NOT present (must be created in later blocks):**

- `receipts.ts` — Block 5
- `policies.ts` — Block 4
- `action-hash.ts` — Block 4

### Critical finding: storage layer is in-memory, not Prisma-backed

Although `prisma/schema.prisma` defines the Postgres schema, the runtime service layer is currently backed by an in-memory `Map` (`src/server/store.ts`) and does **not** import `@prisma/client`. The runtime `RiskStatus`, `Decision`, `RiskLevel`, `ProductModuleKey`, `AuditEventType` are all **lowercase string union types** declared in `lib/types.ts`:

- `RiskStatus = "pending" | "accepted" | "rejected" | "remediation_required" | "expired"`
- `RiskLevel = "low" | "medium" | "high" | "critical"`
- `Decision = "accept" | "reject" | "remediate"`
- `AuditEventType = "risk_record.created" | "risk_record.updated" | "decision.accepted" | "decision.rejected" | "decision.remediation_required" | "evidence_packet.generated" | "approval_page.viewed" | "lead_form.submitted"`

**Implication for the MVP:** The MCP wrapper must produce/consume the **lowercase** status strings, not the Prisma enum names. All MCP `get_approval_status` mapping uses the lowercase values. The Prisma uppercase enums are aspirational and not enforced at runtime today. **No schema migration is required** (and is forbidden by the plan); the wrapper just needs to honor what `lib/types.ts` declares.

---

## 3. Existing service function signatures

### `createRiskRecord(user, data)` — `src/server/riskRecords.ts:136`

```ts
function createRiskRecord(user: SessionUser, data: RiskRecordCreateData): RiskRecord
```

`RiskRecordCreateData` interface (verbatim from source, riskRecords.ts:24):

```ts
interface RiskRecordCreateData {
  module: ProductModuleKey;
  title: string;
  description: string;
  sourceSystem: string;
  sourceType: string;
  riskLevel: RiskLevel;
  riskScore?: number;
  owner: string;                 // free-form owner label
  department: string;
  dueDate?: string;
  expirationDate?: string;       // ISO YYYY-MM-DD or full ISO datetime; PRESERVED in stored record
  reviewDate?: string;
  compensatingControls: string;  // long text (required)
  evidenceSummary: string;       // long text (required)
  businessJustification: string; // long text (required)
  technicalContext: string;      // long text (required at type level; Zod default "")
  frameworkTags: string[];
  sourceReferences: SourceReference[];
  accessContext?: AccessContext;
  vulnerabilityContext?: VulnerabilityContext;
}
```

**Behavior:**
- Always creates with `status: "pending"`.
- Sets `decisionAt`, `decision`, `decisionBy` all undefined.
- Appends an `AuditTimelineEntry` to the new record's `auditTimeline`.
- Calls `recordAuditEvent({ eventType: "risk_record.created", newStatus: "pending", … })`.
- Returns the new `RiskRecord`.

**Confirmed:** `createRiskRecord` creates **PENDING-only** records. It does not accept an initial status. The plan's two-step pattern (create then finalize) is mandatory for auto-policy decisions.

### `updateRiskRecordDecision(user, id, input)` — `src/server/riskRecords.ts:219`

```ts
function updateRiskRecordDecision(
  user: SessionUser,
  id: string,
  input: { action: "accept" | "reject" | "remediate"; decisionNote?: string; compensatingControlsNote?: string; reviewDate?: string }
): RiskRecord
```

**Behavior:**
- Asserts org access via `ensureOwnedByOrg`.
- Maps `action` → status: `accept` → `"accepted"`, `reject` → `"rejected"`, `remediate` → `"remediation_required"`.
- Sets `decision`, `decisionBy = user.name`, `decisionAt = now()`, `decisionNote`.
- Appends to `auditTimeline`.
- Calls `recordAuditEvent` with the matching event type (`decision.accepted` / `decision.rejected` / `decision.remediation_required`) — preserves audit logging.
- Returns the updated `RiskRecord`. **Does not return the audit log row id.**

**Action vocabulary accepted:** `"accept" | "reject" | "remediate"` only. **No `cancel` action exists.**

### `recordAuditEvent(input)` — `src/server/auditLogs.ts:25`

```ts
function recordAuditEvent(input: RecordAuditEventInput): AuditLog
```

- Append-only by convention; the function only pushes.
- Returns the created `AuditLog` entry (including its generated `id`).

### Audit log read helpers

- `listAuditLogsForRecord(organizationId, riskRecordId): AuditLog[]` — sorted by `createdAt` ASC.
- `listAuditLogsForOrganization(organizationId): AuditLog[]` — sorted by `createdAt` ASC.

---

## 4. `app/api/` route tree

Verified with `find /Users/dram/projects/trustaccept/app/api -type f`:

| Route | Method | Auth | Notes |
|---|---|---|---|
| `app/api/leads/route.ts` | — | — | not relevant to this block |
| `app/api/risk-records/route.ts` | `GET`, `POST` | `requireDashboardAccess` | List + create |
| `app/api/risk-records/[id]/route.ts` | `GET` | `requireDashboardAccess` | Read one |
| `app/api/risk-records/[id]/decision/route.ts` | **`PATCH`** | `requireDecisionAccess` | Body = `ApprovalDecisionInput` `{ action, decisionNote?, compensatingControlsNote?, reviewDate? }`; calls `updateRiskRecordDecision` then `notifyDecisionRecorded` |
| `app/api/risk-records/export.csv/route.ts` | — | — | CSV export |
| `app/api/evidence-packets/[id]/export.pdf/route.ts` | — | — | PDF export |
| `app/api/demo/risk-flow/route.ts` | `GET` | `requireDashboardAccess` | Demo dashboard counts |

**Confirmed:**
- `app/api/v1/approvals/` does **not** exist (verified: `ls` returned `NO_V1_DIR`).
- The decision route uses **`PATCH`**, not `POST`. The wrapper must call `PATCH /api/risk-records/[id]/decision` if it ever proxies via HTTP; in practice the wrapper should call the service function directly to avoid an extra hop.

---

## 5. Existing auth function — `src/server/auth.ts`

Functions:

- `getCurrentUser(): SessionUser | null` — returns demo user in demo mode.
- `requireCurrentUser(): SessionUser` — throws `UnauthorizedError(401)` if absent.
- `requireDashboardAccess(): SessionUser` — allows roles `OWNER, ADMIN, APPROVER, VIEWER`.
- `requireDecisionAccess(): SessionUser` — allows roles `OWNER, ADMIN, APPROVER` (VIEWER excluded).
- `assertCanAccessOrganizationRecord(user, entity)` — throws `ForbiddenError(403)` on tenant mismatch.

`SessionUser` (from `lib/types.ts`):
```ts
interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "APPROVER" | "VIEWER";
  organizationId: string;
}
```

**Middleware** (`middleware.ts`) protects `/dashboard/*`, `/api/risk-records/*`, `/api/evidence-packets/*`, `/api/demo/*`. The new `/api/v1/approvals/*` paths are **not yet covered**; Block 2 must add `/api/v1/:path*` to the matcher (or rely on per-route `requireDashboardAccess()` calls — the middleware in demo mode is permissive anyway).

---

## 6. `package.json`

- Package manager: **npm** (no `pnpm-workspace.yaml` or `workspaces` key in `package.json`).
- Single-package repo. `grep -E "workspaces" package.json` → no match.

| Dependency | Version |
|---|---|
| `next` | `14.2.18` |
| `react` / `react-dom` | `^18.3.1` |
| `@prisma/client` | `^5.22.0` |
| `prisma` (dev) | `^5.22.0` |
| `vitest` (dev) | `^2.1.5` |
| `typescript` (dev) | `^5.6.3` |
| `zod` | `^3.23.8` |
| `tsx` (dev) | `^4.19.2` |

Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test` (`vitest run`), `test:watch`, `prisma:*`, `db:*`.

---

## 7. Test command and current pass output (verbatim)

Command: `npm test` (resolves to `vitest run`).

Output (after a clean `npm install`, captured 2026-05-20):

```
 RUN  v2.1.9 /Users/dram/projects/trustaccept

 ✓ tests/decision.test.ts (8 tests) 8ms
 ✓ tests/evidence.test.ts (6 tests) 10ms
 ✓ tests/validation.test.ts (14 tests) 20ms
 ✓ tests/csv.test.ts (9 tests) 9ms
 ✓ tests/access.test.ts (22 tests) 77ms
 ✓ tests/vulnerability.test.ts (22 tests) 128ms
 ✓ tests/services.test.ts (12 tests) 36ms
 ✓ tests/module-query.test.ts (6 tests) 16ms
 ✓ tests/cta.test.ts (5 tests) 5ms

 Test Files  9 passed (9)
      Tests  104 passed (104)
   Start at  22:38:20
   Duration  2.32s (transform 732ms, setup 0ms, collect 1.43s, tests 308ms, environment 4ms, prepare 2.26s)
```

This is the **baseline**. Future blocks must keep this green and add their own tests on top. Do not assert hardcoded counts in any new test or commit message; always re-verify by running.

---

## 8. `RiskRecordCreateInput` Zod schema — `src/lib/validation.ts:66`

Field-by-field constraints (verbatim from source):

| Field | Zod constraint | Accepts what the wrapper needs? |
|---|---|---|
| `module` | `z.enum(moduleKeys)` | Yes — wrapper uses `"ai-action-gate"`. |
| `title` | `z.string().min(4).max(280)` | Yes — `action.summary` mapped here. **`action.summary` must be ≥ 4 chars.** |
| `description` | `z.string().min(4).max(4000)` | Yes — long text available. |
| `sourceSystem` | `z.string().min(1).max(120)` | Yes — wrapper sets to e.g. `"trustaccept-mcp"`. |
| `sourceType` | `z.string().min(1).max(120)` | Yes — wrapper sets to e.g. `"agent_action_request"`. |
| `riskLevel` | `z.enum(["low","medium","high","critical"])` | **Yes — `risk_level` maps directly to this first-class enum field.** |
| `riskScore` | `z.number().int().min(0).max(100).optional()` | Optional; derived from `riskLevel` if absent. |
| `owner` | `z.string().min(1).max(120)` | Yes — wrapper sets to `principal.value` (truncated to 120 if needed). |
| `department` | `z.string().min(1).max(120)` | Required; wrapper supplies default e.g. `"AI Agents"`. |
| `dueDate` / `expirationDate` / `reviewDate` | `isoDate.optional()` (regex `^\d{4}-\d{2}-\d{2}$` OR `z.string().datetime()`) | **Yes — `expirationDate` accepts an ISO datetime string; preserved by `createRiskRecord`. Maps `expires_at`.** |
| `compensatingControls` | `z.string().min(1).max(4000)` | Required long text; wrapper supplies a default sentence. |
| `evidenceSummary` | `z.string().min(1).max(4000)` | Required long text; wrapper supplies a default sentence. |
| `businessJustification` | `z.string().min(1).max(4000)` | Required long text; **wrapper sets from `context.business_justification` when provided, otherwise from `action.summary`.** |
| `technicalContext` | `z.string().max(4000).default("")` | Optional. **Recommended home for `policy_reason`** (least disruptive: it has a default, so populating it does not change required-field semantics). |
| `frameworkTags` | `z.array(z.string().min(1).max(120)).max(20).default([])` | Optional. |
| `sourceReferences` | `z.array(sourceReferenceSchema).max(20).default([])` | Holds short ID-bearing entries. |

**`sourceReferences` shape (validation.ts:53):**

```ts
{
  label: z.string().min(1).max(200),
  system: z.string().min(1).max(120),
  externalId: z.string().max(120).optional(),
  url: z.string().url().max(500).optional(),
}
```

**Length constraint on `externalId`:** `max(120)`. Every value stored in `sourceReferences[].externalId` (policy_id, action_hash, tool_id, agent_run_id, expires_at fallback, action_type, etc.) **must be ≤ 120 characters**. A SHA-256 hex digest is 64 chars — well under.

Max entries in the `sourceReferences` array: `max(20)`. The wrapper produces at most ~10 entries per record, so this is not a constraint in practice.

---

## 9. Audit log access from a decision call

Question from the plan: can a caller of `updateRiskRecordDecision` retrieve the resulting audit log row id without a refactor?

**Answer:** Not directly. `updateRiskRecordDecision` returns only the updated `RiskRecord`. The internally-called `recordAuditEvent` *does* return the new `AuditLog` (including its `id`), but that return value is discarded by `updateRiskRecordDecision`.

**Two no-refactor options:**

1. **Latest-matching-event lookup.** After calling `updateRiskRecordDecision`, call `listAuditLogsForRecord(orgId, recordId)` (already exported from `auditLogs.ts`) and take the most recent entry whose `eventType` matches the expected `decision.*` event. This works today without any service change.

2. **Stable composite reference.** Use `"{riskRecordId}:{decidedAt}"` (the ISO timestamp from the returned record). Stable and deterministic; does not require any new read.

**Recommendation for receipts:** Use option 2 (`riskRecordId:decidedAt`) as the `audit_log_ref` value in receipt JWTs. It's deterministic, requires no extra read, and the receipt verification path does not need to dereference it — it's a *reference*, not a pointer that must resolve. Document in `src/server/receipts.md` (Block 5) that richer audit log identifiers (real audit log row id, signed audit chain reference) are post-MVP work.

---

## 10. Other findings worth flagging for downstream blocks

- **Owner field is a single string, not a `{type, value}` shape.** The wrapper must pack `principal` into either `owner` (display) + a `sourceReferences[]` entry (`principal_type`, `principal_value`), or use just `owner = principal.value` and stash `principal_type` in references. Recommended in FIELD_MAPPING.md.
- **`/approve/[id]` page is publicly readable** (`getRiskRecordPublic` bypasses org check). It already renders title, description, risk level, source references, compensating controls, evidence summary, business justification, technical context. Block 4's approval page polish can extend this without removing existing behavior.
- **Demo auth is permissive.** `getCurrentUser()` returns a hardcoded `DEMO_USER_ID` from the store. All wrapper integration tests will run as that user. Real auth is out of scope for the MVP.
- **`notifications.ts` only logs** to an in-memory array. The plan's hard cut on channels (WhatsApp/Slack/email/SMS) is already reflected in the codebase — there is no real channel integration to remove.
- **Synthetic policy actor for auto-decisions.** `updateRiskRecordDecision` requires a `SessionUser`. For auto-policy allow/deny, the wrapper should construct a synthetic in-memory `SessionUser` (no need to persist to the user store) with `name = "policy:{policy_id}"`, `email = "policy@trustaccept.local"`, `role = "OWNER"`, `organizationId = caller's org`. This passes the role gate and produces a clean audit trail (`decisionBy = "policy:{policy_id}"`) without bypassing service-layer logging. The receipt then surfaces this with `decision_actor_type: "policy"`.

---

## Sign-off gate

Per Block 1 of the plan: **Stop after this block. Human reviews the audit and field mapping before code starts.**

Reviewer, please confirm:

- [ ] Schema and enum lists in §1 match expectations.
- [ ] In-memory store finding (§2 Critical Finding) is acknowledged — MCP must use lowercase status strings.
- [ ] Service signatures in §3 are sufficient to build the wrapper without refactor.
- [ ] PATCH (not POST) on the existing decision route is acknowledged.
- [ ] `technicalContext` as the home for `policy_reason` is acceptable (see FIELD_MAPPING.md §3 for alternative options if not).
- [ ] `expirationDate` as the home for `expires_at` is acceptable.
- [ ] `riskRecordId:decidedAt` as the `audit_log_ref` fallback is acceptable for MVP.

Once approved, Block 2 (`/api/v1/approvals` wrapper) may begin.
