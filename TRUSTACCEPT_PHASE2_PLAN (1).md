# TrustAccept Phase 2 — Implementation Plan for Claude Code

**Scope:** Build the three new monetizable products — Agent Action Receipts API, EvidenceDesk, and Slack Approval App — as additions to the existing TrustAccept platform, not as a separate stack.

**Author note:** This plan was written against the current repo (Next.js 14 App Router + TypeScript + Prisma + Tailwind + in-memory store with Prisma schema ready, seven RiskRecord modules, hosted `/approve/[id]`, evidence PDF export, Vitest tests). Read this whole document before starting. Build sequence is at the bottom.

**Revision 2 changelog (against the first draft):**

- §1 — added `npm run prisma:generate` to the inspection checklist
- §2.1 — fixed the comment on `IdempotencyKey.key` to match the endpoint-scoped composite format used by the security primitive in §3.3
- §5.1 — preserved `createEvidencePacket(user, record)` as a backward-compat wrapper so the existing PDF export route does not break; receipt timestamp field is `generatedAt` to match the existing `EvidencePacket` shape
- §6.3 — `reviewUrl` is built from the `NEXT_PUBLIC_APP_URL` env var (already required by §10), not a hardcoded host
- §7.2 — added an explicit fire-and-forget contract; the decision response must return before webhook delivery completes
- §9.1 — replaced the ambiguous `/dashboard/decisions` alias with a concrete decision: filter the existing `/dashboard/risk-records` page by `?source=api` and render a small "Source: API" badge per row
- §10 — no change to the env list itself, but `NEXT_PUBLIC_APP_URL` now explicitly required

---

## 0. The architectural decision that drives everything

The new spec proposes a `DecisionRequest` + `Receipt` + `Slack` model. The existing repo has `RiskRecord` + `EvidencePacket` + hosted approval. These overlap ~90%.

**Decision: extend, don't replace.**

- `RiskRecord` stays the canonical decision entity. The dashboard, marketing pages, hosted approval, intake wizard, Vulnerability Accept, and Access Accept are all built around it. Throwing it out is a 2-week setback.
- The new `POST /api/v1/decision-requests` endpoint **creates RiskRecords under the hood**, but speaks the developer-facing payload shape from the spec.
- `EvidencePacket` becomes the canonical receipt model. We harden it with a content hash + HMAC signature and expose a verify endpoint. The existing `/api/evidence-packets/[id]/export.pdf` route stays.
- Slack becomes a new approval **surface** that drives `PATCH /api/risk-records/[id]/decision` (which already exists). The Slack handler is a thin adapter — no new decision pipeline.

**What the three new "products" actually are in this codebase:**

| New product | What it adds | Existing surface it builds on |
|---|---|---|
| Agent Action Receipts API | `/api/v1/*` endpoints, API key auth, idempotency, policy engine, risk scoring, webhook signing | Wraps the existing risk-record service |
| EvidenceDesk | Signed receipts (hash + HMAC), public `/verify/[receiptId]`, JSON export, formalized receipt lifecycle | Hardens existing EvidencePacket |
| Slack Approval App | OAuth install, signed-request verification, approval card, interaction handler, dashboard Slack settings | Drives existing decision PATCH endpoint |

If anything in the new spec conflicts with the existing UX, the existing UX wins unless this plan calls it out explicitly.

---

## 1. Repo inspection checklist (do this first)

Before writing code, run through and confirm these exist and behave as documented in `README.md`. If any are missing or different, stop and flag it.

- [ ] `npm install` succeeds against the live registry
- [ ] `npm run prisma:generate` succeeds
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (Vitest, ~10 test files)
- [ ] `npm run build` passes
- [ ] `prisma/schema.prisma` matches the README
- [ ] `lib/types.ts` defines `RiskRecord`, `AuditLog`, `Lead`, etc.
- [ ] `src/server/store.ts` exports the singleton in-memory store
- [ ] `src/server/riskRecords.ts` exports `createRiskRecord`, `updateRiskRecordDecision`, etc.
- [ ] `src/server/evidencePackets.ts` exports `createEvidencePacket`, `generateEvidencePdf`
- [ ] `src/server/auth.ts` has `requireDashboardAccess`, `requireDecisionAccess`, `assertCanAccessOrganizationRecord`
- [ ] `src/lib/validation.ts` exports Zod schemas
- [ ] `middleware.ts` protects `/dashboard` and `/api/risk-records` with demo auth

If all of these check out, proceed. If anything is off, fix the divergence first and report it.

---

## 2. Schema extensions (Prisma + in-memory store)

Add to `prisma/schema.prisma` — do not break or rename existing models.

### 2.1 New models

```prisma
model ApiKey {
  id           String   @id @default(cuid())
  organizationId String
  organization Organization @relation(fields: [organizationId], references: [id])
  name         String
  prefix       String   // e.g. "ta_live_abcd" — first 12 chars, safe to display
  keyHash      String   // scrypt of the full key + pepper
  lastUsedAt   DateTime?
  revokedAt    DateTime?
  createdAt    DateTime @default(now())

  @@index([organizationId])
  @@index([prefix])
}

model WebhookEndpoint {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  url            String
  signingSecret  String   // generated once, shown once, then masked
  enabled        Boolean  @default(true)
  description    String?
  createdAt      DateTime @default(now())

  deliveries     WebhookDelivery[]

  @@index([organizationId])
}

model WebhookDelivery {
  id                String   @id @default(cuid())
  webhookEndpointId String
  webhookEndpoint   WebhookEndpoint @relation(fields: [webhookEndpointId], references: [id], onDelete: Cascade)
  riskRecordId      String?
  eventType         String   // "decision.created" | "decision.accepted" | "decision.rejected" | "decision.remediation_required" | "receipt.created"
  payload           Json
  signature         String   // HMAC SHA-256 of payload with endpoint signingSecret
  status            String   // "pending" | "delivered" | "failed"
  responseCode      Int?
  responseBody      String?
  attemptCount      Int      @default(0)
  lastAttemptAt     DateTime?
  createdAt         DateTime @default(now())

  @@index([webhookEndpointId])
  @@index([riskRecordId])
}

model SlackInstallation {
  id               String   @id @default(cuid())
  organizationId   String   @unique
  organization     Organization @relation(fields: [organizationId], references: [id])
  teamId           String
  teamName         String?
  botUserId        String?
  botAccessToken   String   // encrypted at rest in production
  defaultChannelId String?
  installedById    String?  // free-form for v1; not a foreign key
  installedByName  String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model SlackApprovalMessage {
  id             String   @id @default(cuid())
  organizationId String
  riskRecordId   String
  teamId         String
  channelId      String
  messageTs      String   // Slack's message timestamp, used to update the card
  status         String   // "sent" | "decided" | "expired"
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([riskRecordId])
}

model IdempotencyKey {
  // Composite key format: "{orgId}:{endpoint}:{userKey}"
  // Endpoint is included so the same Idempotency-Key from a client maps to
  // different cache entries across different POST routes. This matches the
  // checkIdempotencyKey signature in §3.3.
  key            String   @id
  organizationId String
  endpoint       String
  responseStatus Int
  responseBody   Json
  createdAt      DateTime @default(now())

  @@index([organizationId, createdAt])
}
```

### 2.2 Receipt extensions on existing `EvidencePacket`

Add to the existing model (additive, no breaking changes). The existing model already has `summary Json` and `generatedAt DateTime`. Add:

```prisma
// Add to EvidencePacket:
receiptHash       String?   // SHA-256 of canonicalized receipt body (excluding hash + signature)
signature         String?   // HMAC SHA-256 of receiptHash with TRUSTACCEPT_RECEIPT_SIGNING_SECRET
receiptVersion    Int       @default(1)
trigger           String?   // "decision_request_created" | "decision_recorded" | "manual_export"
exportedAt        DateTime?
recordSnapshot    Json?     // immutable copy of the RiskRecord at receipt time
```

Receipts must be verifiable independently of subsequent record mutations — that's what `recordSnapshot` is for.

### 2.3 In-memory store mirror

Update `src/server/store.ts` to mirror the new models. The store currently uses `Map`s keyed by id. Add:

```ts
apiKeys: Map<string, ApiKeyRecord>;
webhookEndpoints: Map<string, WebhookEndpointRecord>;
webhookDeliveries: WebhookDeliveryRecord[];  // append-mostly
slackInstallations: Map<string, SlackInstallationRecord>;  // keyed by orgId
slackApprovalMessages: Map<string, SlackApprovalMessageRecord>;
idempotencyKeys: Map<string, IdempotencyKeyRecord>;
```

Seed an empty array/map for each in `seedStore()`. Do not seed fake API keys; the test suite will create them.

### 2.4 Acceptance

- `npm run prisma:generate` succeeds
- `npm run typecheck` passes after store changes
- All existing tests still pass

---

## 3. Security primitives

Create `src/lib/security/` with the following files. These must land before any API route is written.

### 3.1 `src/lib/security/api-key-auth.ts`

```ts
export interface ApiKeyVerification {
  apiKey: ApiKeyRecord;
  organization: Organization;
}

export async function verifyApiKey(rawAuthHeader: string | null): Promise<ApiKeyVerification>;
export function generateApiKey(): { fullKey: string; prefix: string; keyHash: string };
export function maskApiKey(prefix: string): string;  // returns "ta_live_abcd...****"
```

- Full key format: `ta_live_` + 32 url-safe random chars.
- Hash full key with scrypt + `TRUSTACCEPT_API_KEY_PEPPER` env var. Constant-time compare.
- `verifyApiKey` reads `Authorization: Bearer ta_live_...`, finds the row by prefix, verifies hash, throws `UnauthorizedError` if no match or revoked, updates `lastUsedAt` async (fire-and-forget).
- Never log the full key. Logs may include the prefix only.

### 3.2 `src/lib/security/hmac.ts`

```ts
export function signPayload(payload: unknown, secret: string): string;
export function verifyPayloadSignature(payload: unknown, signature: string, secret: string): boolean;
export function canonicalize(value: unknown): string;  // deterministic JSON serialization
```

- SHA-256 HMAC, lowercase hex output, `sha256=` prefix in headers.
- Canonicalize by sorting object keys recursively. Numbers and strings serialize as JSON. Tests must lock this down.

### 3.3 `src/lib/security/idempotency.ts`

```ts
export interface IdempotencyHit {
  responseStatus: number;
  responseBody: unknown;
}

export async function checkIdempotencyKey(
  orgId: string,
  endpoint: string,
  userKey: string,
): Promise<IdempotencyHit | null>;

export async function storeIdempotencyResponse(
  orgId: string,
  endpoint: string,
  userKey: string,
  status: number,
  body: unknown,
): Promise<void>;
```

- Composite key: `{orgId}:{endpoint}:{userKey}`. Userkey is the client-supplied `Idempotency-Key` header. This matches the `IdempotencyKey.key` format in §2.1 exactly.
- TTL: 24 hours (clean up on read).
- If a hit exists, return the cached response; the route handler short-circuits.

### 3.4 `src/lib/security/payload-guard.ts`

```ts
export function rejectIfUnsafe(payload: unknown): void;  // throws PayloadGuardError
export function sanitizeForLogging(payload: unknown): unknown;
```

Reject if the payload contains anything that looks like a card number (Luhn), CVV (`/cvv|cvc/i` + 3-4 digit string), or bank-account-ish patterns (`/routing|aba/i` near 9-digit string). This is a tripwire, not a payment-processor — TrustAccept must never become a card-data path.

### 3.5 `src/lib/security/slack-signature.ts`

```ts
export function verifySlackSignature(
  body: string,             // raw request body, not parsed
  timestamp: string,        // X-Slack-Request-Timestamp header
  signature: string,        // X-Slack-Signature header
  signingSecret: string,    // env SLACK_SIGNING_SECRET
): boolean;
```

- Reject if timestamp is >5 minutes old (replay protection).
- Compute `v0:${timestamp}:${body}`, HMAC-SHA256 with signing secret, compare to `signature` minus the `v0=` prefix, constant-time.

### 3.6 Acceptance

- New tests in `tests/security/`:
  - `api-key-auth.test.ts` — generate, verify, reject wrong key, reject revoked key, reject malformed header
  - `hmac.test.ts` — canonicalize determinism, sign+verify roundtrip, reject tampered payload
  - `idempotency.test.ts` — store + replay, different orgs don't collide, different endpoints don't collide, expiry honored
  - `payload-guard.test.ts` — reject card-like, reject CVV-like, allow safe payloads
  - `slack-signature.test.ts` — happy path, stale timestamp, tampered signature
- No security primitive is allowed to log secrets, full keys, or sensitive payload fields.

---

## 4. Policy engine + risk scoring

Create `src/lib/policies/`.

### 4.1 `src/lib/policies/policy-engine.ts`

```ts
export type Decision = "allow" | "deny" | "manual_review";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface PolicyInput {
  source: string;
  actionType: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface PolicyResult {
  decision: Decision;
  riskScore: number;          // 0–100
  riskLevel: RiskLevel;
  matchedRules: string[];
  reasons: string[];
}

export function evaluatePolicy(
  input: PolicyInput,
  tenantPolicy: TenantPolicy,
): PolicyResult;
```

### 4.2 Default tenant policy

For now, hard-code a default. Make it data-driven later via a `Policy` model. Defaults:

- `actionType` in `BLOCKED_ACTIONS` → `deny`, riskScore 100, reason: "Blocked action type"
- `payload-guard` rejection upstream → never reaches here (route returns 400 first)
- `actionType` in `REQUIRES_REVIEW_ACTIONS` (e.g. `delete_customer_record`, `api_key_create`, `break_glass_access`, `release_exception`, `device_join`, anything with `source: ai_agent`) → `manual_review`, riskScore 70+, reason explains
- `amount > BLOCK_THRESHOLD` (default $10,000) → `deny`, riskScore 95
- `amount > REVIEW_THRESHOLD` (default $1,000) and not already denied → bump to `manual_review`, riskScore 60+
- otherwise → `allow`, riskScore 20

### 4.3 `src/lib/policies/risk-scoring.ts`

Pure function. Sums weighted signals from `metadata.risk_signals` (e.g. `new_device: true` adds 15, `impossible_travel: true` adds 25, `customer_impact: "high"` adds 20). Clamp to 0–100. Map to riskLevel: ≤25 low, ≤50 medium, ≤75 high, >75 critical.

### 4.4 Mapping to existing RiskRecord

When the API creates a RiskRecord from a DecisionRequest:

- `allow` → still create the RiskRecord, status `accepted`, decision `accept`, decisionBy = `"policy-engine"`, decisionAt = now, audit timeline notes "auto-approved by policy"
- `deny` → status `rejected`, decision `reject`, decisionBy = `"policy-engine"`, audit notes "auto-rejected by policy"
- `manual_review` → status `pending`, no decision yet

The marketing claim is "we record every decision". Auto-allow and auto-deny still produce a record; that's a feature, not waste.

### 4.5 Acceptance

- `tests/policies/policy-engine.test.ts` — at least one test per branch above
- `tests/policies/risk-scoring.test.ts` — boundary tests (0, 25, 26, 50, 51, 75, 76, 100)
- Auto-decisions produce a RiskRecord visible in the existing dashboard

---

## 5. Receipt engine (formalize EvidenceDesk)

Extend `src/server/evidencePackets.ts`.

### 5.1 Receipt creation — preserving the existing callsite

The existing function signature is:

```ts
// existing — keep it working
export function createEvidencePacket(user: SessionUser, record: RiskRecord): EvidencePacket;
```

`app/api/evidence-packets/[id]/export.pdf/route.ts` calls this with no third argument. We must not break it.

**Solution: introduce `createReceipt(input)` as the new canonical function, and keep `createEvidencePacket` as a thin backward-compat wrapper.**

```ts
export interface ReceiptCreateInput {
  user: SessionUser;
  record: RiskRecord;
  trigger: "decision_request_created" | "decision_recorded" | "manual_export";
}

export function createReceipt(input: ReceiptCreateInput): EvidencePacket;

// Backward-compat shim — DO NOT REMOVE.
// The existing PDF export route calls this with (user, record). It must continue to work.
export function createEvidencePacket(user: SessionUser, record: RiskRecord): EvidencePacket {
  return createReceipt({ user, record, trigger: "manual_export" });
}
```

Each receipt embeds (note: timestamp field is `generatedAt` to match the existing `EvidencePacket` interface in `src/server/evidencePackets.ts`):

- `record` — a deep clone of the RiskRecord at receipt time (returned on read; hydrated from `recordSnapshot` in the store)
- `recordSnapshot` — same data, persisted to the store as JSON, immutable
- `summary` — output of `summarizeRecordForEvidence(record)`
- `auditTimeline` — frozen copy from the record
- `webhookDeliveryRefs` — IDs of any webhook deliveries that referenced this receipt
- `trigger` — one of the three values above
- `receiptVersion: 1`
- `generatedAt` — ISO timestamp at receipt creation

### 5.2 Hash + signature

```ts
export function computeReceiptHash(packet: EvidencePacket): string;
export function signReceipt(packet: EvidencePacket, secret: string): string;
export function verifyReceiptSignature(packet: EvidencePacket, secret: string): boolean;
```

- Hash = SHA-256 of canonicalized receipt body **excluding** `signature` and `receiptHash` fields themselves
- Signature = HMAC-SHA256(hash, `TRUSTACCEPT_RECEIPT_SIGNING_SECRET`)
- Hash + signature are stored on the packet. Verification recomputes from the body and compares.

### 5.3 Receipt lifecycle on decision changes

Receipts are append-only by application convention. When `updateRiskRecordDecision` runs:

1. Look up any existing receipts for this record.
2. Create a **new** receipt with `trigger: decision_recorded` (do not mutate the prior receipt — its hash and signature must remain verifiable forever as the snapshot of "what we knew at submission time").
3. Each receipt is independently verifiable. The verify page for a given receipt ID always shows that specific receipt; if a newer receipt exists for the same record, the verify page may note "a newer receipt for this decision exists at /verify/<newer-id>".

### 5.4 Public verify route

Add `app/verify/[receiptId]/page.tsx`. Public, no auth. Shows:

- Receipt ID
- Trigger (e.g. "decision_request_created" vs "decision_recorded")
- Decision status at the time of this receipt
- Hash status: "verified" / "invalid"
- Signature status: "verified" / "invalid"
- `generatedAt`
- Module + one-line decision summary
- A link to a newer receipt for the same record if one exists
- "Want to see the full evidence packet? Contact the issuing tenant." — do not expose the full body publicly

### 5.5 New API routes

- `GET /api/v1/receipts/:id` — auth'd, returns the packet body
- `GET /api/v1/receipts/:id/verify` — auth'd, returns `{ valid: boolean, hashValid, signatureValid }`
- `GET /api/v1/receipts/:id/export.json` — auth'd, returns the packet as a downloadable JSON file with `Content-Disposition: attachment`

Keep the existing `GET /api/evidence-packets/[id]/export.pdf` route untouched. It already works through the backward-compat wrapper in §5.1.

### 5.6 Acceptance

- `tests/evidence/receipt-hash.test.ts` — same input → same hash; reordered keys → same hash; tampered field → different hash
- `tests/evidence/receipt-signature.test.ts` — valid signature verifies; wrong secret fails; tampered body fails
- `tests/evidence/receipt-lifecycle.test.ts` — `decision_request_created` receipt created on API submission; second receipt created on decision; both queryable; prior receipt's hash still verifies after the new one is written
- `tests/evidence/backward-compat.test.ts` — `createEvidencePacket(user, record)` still works and produces a `trigger: "manual_export"` receipt; the existing PDF export route still passes its own tests unchanged
- Verify page renders for an existing seeded record
- Verify page does NOT expose `record.evidenceSummary`, `record.businessJustification`, etc. — only the public-safe summary fields

---

## 6. Agent Action Receipts API (v1)

Create `app/api/v1/` route handlers. Every route follows this pattern:

1. `verifyApiKey()` — throws on bad/missing
2. `rejectIfUnsafe(body)` — payload guard
3. Idempotency check if `Idempotency-Key` header present (POST routes only)
4. Zod validation
5. Service call
6. Store idempotency response if header was present
7. Return JSON

### 6.1 Routes

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/decision-requests` | Create a decision request (calls policy engine, creates RiskRecord, creates receipt) |
| GET | `/api/v1/decision-requests` | List for caller's org, paginated via `?cursor=` and `?limit=` (max 100) |
| GET | `/api/v1/decision-requests/:id` | Get one |
| POST | `/api/v1/decision-requests/:id/decision` | Manually record a decision (server-to-server alternative to the dashboard) |
| POST | `/api/v1/decision-requests/:id/cancel` | Move to status `expired` with reason "cancelled by client" |
| GET | `/api/v1/decision-requests/:id/audit-events` | List audit events for this record (org-scoped) |
| GET | `/api/v1/receipts/:id` | See §5.5 |
| GET | `/api/v1/receipts/:id/verify` | See §5.5 |
| GET | `/api/v1/receipts/:id/export.json` | See §5.5 |
| POST | `/api/v1/webhooks/test` | Send a synthetic delivery to the org's configured endpoint(s) to validate signing |

### 6.2 Request mapping

The spec's `decision_requests` payload maps to RiskRecord like this:

| Spec field | RiskRecord field |
|---|---|
| `source` | stored in `sourceSystem` (string label) and added to `sourceType` as `${source}.${actionType}` |
| `sourceId` | first entry in `sourceReferences` |
| `sourceName` | also stored on the source reference |
| `actionType` | `sourceType` and surfaced in `title` |
| `subjectType`, `subjectRef` | `sourceReferences` entry |
| `amount`, `currency` | `technicalContext` and `metadata.amount` (new field) |
| `description` | `description` (use `actionType` as fallback) |
| `metadata` | `metadata` JSON column (add to RiskRecord — see §6.4) |
| `callbackUrl` | per-request override of webhook endpoint; stored on the record |
| `idempotencyKey` | header `Idempotency-Key`, not body |

Module for API-created records: `"ai-action-gate"` by default (most agent action use cases). Allow override via `metadata.module` — but only if the value is one of the seven module keys.

Risk level mapping: from `policy.riskLevel` directly.

The v1 endpoint must also set `metadata.source = "api"` on every created record, so the dashboard's `?source=api` filter (§9.1) can find them.

### 6.3 Response shape

```json
{
  "decisionRequestId": "ra-abc123",
  "status": "pending_review",
  "decision": "manual_review",
  "riskScore": 78,
  "riskLevel": "high",
  "reviewUrl": "<NEXT_PUBLIC_APP_URL>/approve/ra-abc123",
  "receiptId": "evidence-abc123",
  "matchedRules": ["..."],
  "reasons": ["..."]
}
```

**`reviewUrl` construction:** read `process.env.NEXT_PUBLIC_APP_URL` (which §10 requires) and concatenate `/approve/${decisionRequestId}`. Throw at boot if `NEXT_PUBLIC_APP_URL` is unset. Do not hardcode `https://trustaccept.com`.

Note: the spec's `status` values (`pending_review`, `approved`, `auto_approved`, etc.) map onto existing RiskStatus (`pending`, `accepted`, etc.) at the response boundary. Internal storage stays consistent with the existing model. Map both directions in `src/lib/api/status-mapping.ts`.

### 6.4 Add `metadata` field to RiskRecord

This is a small but real schema change. Add `metadata: Json @default("{}")` to the `RiskRecord` Prisma model and `metadata?: Record<string, unknown>` to `lib/types.ts`. Update the seed records to leave it empty. Update Zod validation in `src/lib/validation.ts` to accept an optional `metadata` field.

### 6.5 Pagination

Cursor-based, not offset. Cursor = `createdAt|id` base64-encoded. `limit` default 25, max 100. Return `{ items, nextCursor }`.

### 6.6 Errors

All v1 errors return:

```json
{ "error": { "code": "string", "message": "human-readable", "details": { ... } } }
```

Standard codes: `unauthorized` (401), `forbidden` (403), `validation_failed` (400), `not_found` (404), `payload_unsafe` (400), `rate_limited` (429), `internal` (500), `idempotency_conflict` (409 if same key with different body).

### 6.7 Acceptance

- `tests/api/v1/decision-requests.test.ts`
  - happy path: POST creates record, returns expected shape, creates receipt, persists in store
  - missing auth → 401
  - bad payload (no actionType) → 400 with `validation_failed`
  - card number in metadata → 400 with `payload_unsafe`
  - duplicate idempotency key with same body → returns same response, does not create second record
  - duplicate idempotency key with different body → 409 `idempotency_conflict`
  - policy says deny → record auto-rejected, response shows `decision: "deny"`
  - `reviewUrl` is built from `NEXT_PUBLIC_APP_URL` and matches the test's configured env value
  - every API-created record has `metadata.source === "api"`
- `tests/api/v1/receipts.test.ts`
  - happy path GET, verify, export.json
  - cross-tenant access → 403
- Documentation in `/docs/decision-api` page reflects the actual endpoint signatures (no drift)

---

## 7. Webhook engine

Create `src/server/webhooks.ts`.

### 7.1 Service surface

```ts
export interface WebhookEvent {
  eventType: "decision.created" | "decision.accepted" | "decision.rejected" | "decision.remediation_required" | "receipt.created";
  organizationId: string;
  riskRecordId: string;
  receiptId?: string;
  occurredAt: string;
  data: unknown;
}

export async function emitWebhookEvent(event: WebhookEvent): Promise<void>;
export async function retryFailedDelivery(deliveryId: string): Promise<void>;
```

### 7.2 Behavior + fire-and-forget contract

- On any decision lifecycle change in `riskRecords.ts` (already centralized via `updateRiskRecordDecision`), call `emitWebhookEvent` with the matching type.
- On receipt creation, call `emitWebhookEvent` with `receipt.created`.
- For each enabled WebhookEndpoint in the org, build the canonicalized payload, sign with the endpoint's signingSecret, POST to the URL with headers:
  - `X-TrustAccept-Signature: sha256=...`
  - `X-TrustAccept-Event: decision.accepted`
  - `X-TrustAccept-Delivery: <delivery-id>`
  - `Content-Type: application/json`
- Create a `WebhookDelivery` row first (status `pending`), then attempt delivery, then update status and `responseCode`/`responseBody`.
- On failure, do **not** retry inline. Mark `failed`, increment `attemptCount`. Manual retry via the dashboard or `POST /api/v1/webhooks/deliveries/:id/retry`.
- In the in-memory store backing the demo, the delivery should just log + persist; no real HTTP fetch unless `process.env.TRUSTACCEPT_WEBHOOKS_LIVE === "1"`. This keeps tests deterministic.

**Fire-and-forget contract (binding):** `emitWebhookEvent` must NOT block the decision response. The route handlers for `POST /api/v1/decision-requests`, `POST /api/v1/decision-requests/:id/decision`, the PATCH handler for `/api/risk-records/[id]/decision`, and the Slack interaction handler must all return their HTTP response **before** webhook delivery completes. Implementation pattern: create the `WebhookDelivery` row synchronously (status `pending`, so it shows up in the dashboard immediately), then kick off the actual HTTP POST via `setImmediate` / `queueMicrotask` / a detached promise, then return the HTTP response from the route handler. Do not `await` the delivery promise inside the route. Tests in §7.3 assert this — a mocked slow webhook endpoint must not delay the decision response.

### 7.3 Acceptance

- `tests/webhooks/webhook-service.test.ts` — emits on accept/reject/remediation, signs payload correctly, records delivery, marks failed on simulated 500
- `tests/webhooks/async-emission.test.ts` — decision endpoint returns its HTTP response within ~50ms while the webhook delivery is mocked to take 2 seconds; assert the response time is independent of webhook URL latency
- Existing decision tests still pass (webhook emission must not change observable record state)

---

## 8. Slack Approval App

This is the largest net-new surface. Split across three commits if needed.

### 8.1 OAuth install

Route: `GET /api/slack/install` redirects to Slack's authorize URL. Required scopes: `chat:write`, `chat:write.public`, `commands`, `incoming-webhook` (optional), `users:read`.

Route: `GET /api/slack/oauth/callback` exchanges code for token, upserts `SlackInstallation` for the caller's org. Redirect to `/dashboard/settings/slack?installed=1`.

The org is determined from a `state` parameter set on the install redirect, signed with `TRUSTACCEPT_RECEIPT_SIGNING_SECRET` (reuse). Validate signature on callback. Reject if state is older than 10 minutes.

### 8.2 Approval card

Create `src/lib/slack/approval-card.ts`. Function `buildApprovalCard(record: RiskRecord): SlackBlocks`. Use the Block Kit JSON in the spec as the template, but **respect the existing module-aware label resolver** — call `getApprovalLabels(record)` from `lib/access.ts` and use those for button text (so suspicious-login records get "Accept Login Risk" etc., not generic "Approve").

Button `action_id` values: `trustaccept_approve`, `trustaccept_reject`, `trustaccept_remediate`, `trustaccept_open`. Button `value` is the RiskRecord id.

### 8.3 Sending cards

Function `sendApprovalCard(record: RiskRecord, installation: SlackInstallation)`. Posts to `chat.postMessage` with the installation's bot token and the org's `defaultChannelId`. Stores the resulting `messageTs` in a `SlackApprovalMessage` row.

**When to send:** when a RiskRecord transitions to status `pending` and the org has a connected SlackInstallation AND has not opted out (a new `slackApprovalDeliveryEnabled` flag on the SlackInstallation row, default `true`).

Hook this into `createRiskRecord` and `updateRiskRecordDecision` (for records that transition back to pending — rare, but possible via remediation flows). Fire-and-forget; failures are logged but do not block the decision.

### 8.4 Interaction handler

`POST /api/slack/interactions` — receives Slack's signed interaction payload.

1. Read raw body (do NOT pass through `req.json()` before signature verification — the verification requires the raw string).
2. `verifySlackSignature` — reject 401 on failure.
3. Parse JSON.
4. Look up `SlackInstallation` by `team.id` → resolves org.
5. Look up the user via `users:read` if needed for the audit trail.
6. Switch on `action_id`:
   - `trustaccept_approve` → `updateRiskRecordDecision(systemUser, recordId, { action: "accept", decisionNote: `Approved via Slack by ${user.real_name}` })`
   - `trustaccept_reject` → same with `reject`
   - `trustaccept_remediate` → same with `remediate`
   - `trustaccept_open` → respond with an ephemeral message containing the `/approve/[id]` link
7. After the decision is recorded, update the Slack message via `chat.update` to show the outcome (gray it out, show who decided and when).
8. Emit webhooks (already happens inside `updateRiskRecordDecision`, per the fire-and-forget contract in §7.2).
9. Return 200 with empty body.

The "user" recorded on the decision needs to be a real `SessionUser`. For now: create or upsert a synthetic user per Slack user with email `slack:{teamId}:{userId}@trustaccept.local` and name from the Slack profile. Role: `APPROVER`.

### 8.5 Slash command (optional v1)

`POST /api/slack/commands` — `/trustaccept` opens a modal listing the org's pending records. Cut from scope if time-constrained.

### 8.6 Dashboard settings

Add `app/dashboard/settings/slack/page.tsx`:

- If not installed: "Install TrustAccept for Slack" button linking to `/api/slack/install?state=<signed>`
- If installed: show team name, default channel selector, "Send test approval" button (POSTs to `/api/slack/test-message`), uninstall button (revokes token via Slack API, deletes the installation row)

### 8.7 Acceptance

- `tests/slack/signature.test.ts` — already covered in §3.5
- `tests/slack/approval-card.test.ts` — module-aware labels are used (Vulnerability Accept release-blocking record → buttons say "Accept for Release" etc.)
- `tests/slack/interaction-handler.test.ts` — approve action transitions record to accepted, audit timeline updated, webhook emitted, Slack message update queued
- Cannot send card without a valid SlackInstallation for the org
- Cross-tenant: a request signed by team A cannot touch a record from team B's org

---

## 9. Dashboard additions

### 9.1 Decision: how to surface API-created records

Do **not** add a new `/dashboard/decisions` page. Instead:

- Extend `/dashboard/risk-records` to accept a `?source=api` query parameter that filters to records whose `metadata.source === "api"` (set by the v1 endpoint when it creates a record — see §6.2).
- Add a small "Source: API" badge to the Source column for any record where `metadata.source === "api"`. Use the existing `Badge` component with `tone="info"`.
- The badge is always visible; the filter is opt-in via the query param.
- The Risk Records table query handler reads the param via the existing `?status=` / `?module=` pattern in `app/api/risk-records/route.ts`.

This avoids navigation duplication and keeps the existing UX intact.

### 9.2 New settings pages

- `/dashboard/settings/api-keys` — list, create (shows full key once, then masked forever), revoke
- `/dashboard/settings/webhooks` — list endpoints, create (shows signingSecret once), test, view recent deliveries
- `/dashboard/settings/slack` — see §8.6

Keep the existing `/dashboard/settings` page as a hub with links to these three sub-pages. Add a small left-nav inside the settings area.

### 9.3 Demo pages

- `/demo/decision-api` — live form that POSTs to `/api/v1/decision-requests` with a sample payload, shows the response, links to the created record. Place under `app/(marketing)/demo/decision-api/page.tsx` so it inherits the marketing chrome.
- `/demo/slack-approval` — instructions for installing the Slack app, "Send a test approval to my workspace" button. Same location.

### 9.4 Docs pages

- `/docs/decision-api` — curl + JSON examples for every v1 endpoint, idempotency, error codes
- `/docs/evidence-api` — receipt structure, hash + signature verification recipe, public verify URL pattern
- `/docs/slack-app` — install steps, scopes, action_id reference, how to interpret the audit trail

Keep the existing `/docs` page as the index. Add a sub-nav.

### 9.5 Acceptance

- `tests/api/risk-records-filter.test.ts` — `?source=api` filter returns only records with `metadata.source === "api"`
- `tests/components/risk-records-table.test.ts` (or equivalent) — the "Source: API" badge renders for API-created records and not for dashboard-created records
- All new pages render with the existing dashboard or marketing shell as appropriate
- Settings pages persist correctly via service calls (do not write raw to `getStore()` from the page; go through a service module)
- Docs are accurate against the actual code — no drift

---

## 10. Environment variables

Update `.env.example`:

```
DATABASE_URL=postgresql://trustaccept:trustaccept@localhost:5432/trustaccept?schema=public
TRUSTACCEPT_API_KEY_PEPPER=                # required in prod, dev default ok
TRUSTACCEPT_WEBHOOK_DEFAULT_SECRET=        # for orgs that don't override
TRUSTACCEPT_RECEIPT_SIGNING_SECRET=        # required for receipt verification AND OAuth state signing (§8.1)
TRUSTACCEPT_WEBHOOKS_LIVE=0                # set to 1 to enable real HTTP delivery
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000  # REQUIRED in every environment — used by §6.3 to build reviewUrl
```

Update `src/lib/env.ts` (create if missing) to validate these at boot. Throw with a clear message if any required-in-prod var is missing. `NEXT_PUBLIC_APP_URL` is required in all environments — the v1 API uses it to construct `reviewUrl` and will throw at boot if it's unset.

---

## 11. Updates to existing files

Files that must be touched:

- `src/server/riskRecords.ts` — emit webhooks on decision changes (async, per §7.2); trigger Slack card send on pending creation; create receipts at the right lifecycle points
- `src/server/evidencePackets.ts` — add `createReceipt`; keep `createEvidencePacket` as a backward-compat wrapper (§5.1); add hash + signature; add receipt versioning and `recordSnapshot`
- `src/server/store.ts` — add new collections (§2.3)
- `src/server/auth.ts` — add `verifyApiKey`-backed session for v1 routes (`getCurrentApiCaller`)
- `src/lib/validation.ts` — add DecisionRequestApiInput schema; add `metadata` field to RiskRecordCreateInput
- `prisma/schema.prisma` — see §2
- `middleware.ts` — leave `/api/v1/*` and `/api/slack/*` outside the demo-auth wrapper so route handlers can run their own verification
- `.env.example` — see §10
- `lib/types.ts` — add `metadata?: Record<string, unknown>` to `RiskRecord`
- `app/api/risk-records/route.ts` — read `?source=` query param (§9.1)
- `README.md` — add a "Phase 2: Developer API + Slack + Receipts" section with the new routes, env vars, and verification commands

Files that must **not** be touched without explicit reason:

- Existing marketing pages under `app/(marketing)/` — keep the language and positioning intact (new demo pages under `app/(marketing)/demo/` are additive)
- Existing `lib/seed-data.ts` records — additive only; don't change existing records
- Existing hosted approval page `/approve/[id]` — keep the UX exactly as is
- Existing module pages (Access Accept, Vulnerability Accept) — keep all module-specific UI
- Existing decision label resolver in `lib/access.ts` — Slack must use this, not reinvent it
- Existing `app/api/evidence-packets/[id]/export.pdf/route.ts` — works as-is via the backward-compat wrapper in §5.1

---

## 12. Build sequence (do it in this order)

Each step ends with `npm run prisma:generate && npm run typecheck && npm test && npm run build` passing.

1. **Schema + store** (§2) — Prisma + in-memory store extended, existing tests still green
2. **Security primitives** (§3) — all five modules + tests
3. **Policy engine** (§4) — pure logic, fully tested
4. **Metadata field on RiskRecord** (§6.4) — small but unblocks API
5. **Receipt hash + signature with backward-compat wrapper** (§5.1, §5.2, §5.3) — receipts now verifiable; existing PDF route still works
6. **v1 decision-requests endpoint** (§6.1, §6.2, §6.3) — POST and GET only; create records, run policy, return mapped response with `reviewUrl` built from env
7. **Webhook engine with fire-and-forget contract** (§7) — wire into existing `updateRiskRecordDecision`; tests must assert async behavior
8. **Remaining v1 endpoints** — cancel, audit-events, receipts/verify, receipts/export.json
9. **Public verify page** (§5.4) — `/verify/[receiptId]`
10. **Risk Records source filter + API badge** (§9.1) — small extension to existing page
11. **Slack OAuth install** (§8.1) — installation row persisted
12. **Slack approval card + send** (§8.2, §8.3) — fire on pending records
13. **Slack interaction handler** (§8.4) — full decision flow from Slack
14. **Dashboard settings pages** (§9.2) — API keys, webhooks, Slack
15. **Demo + docs pages** (§9.3, §9.4)
16. **Final verification pass** — full test run, build, manual smoke test of each surface

Aim for one commit per step. Do not bundle steps. If any step grows beyond ~600 lines diff, split it.

---

## 13. Acceptance criteria (final)

All of the following must be true at the end:

### Build + tests
- [ ] `npm install` succeeds against live registry
- [ ] `npm run prisma:generate` succeeds
- [ ] `npm run typecheck` passes with no errors
- [ ] `npm test` passes — all existing tests AND all new tests
- [ ] `npm run build` succeeds for production

### Behavior
- [ ] `POST /api/v1/decision-requests` with a valid API key creates a RiskRecord visible at `/dashboard/risk-records` and `/dashboard/inbox`
- [ ] The same call creates a receipt with verifiable hash + signature
- [ ] The `reviewUrl` in the response uses the `NEXT_PUBLIC_APP_URL` env value, not a hardcoded host
- [ ] Every API-created record has `metadata.source === "api"` and shows the "Source: API" badge in the dashboard
- [ ] `/dashboard/risk-records?source=api` filters to API-created records
- [ ] `GET /api/v1/receipts/:id/verify` returns `{ valid: true }` for a fresh receipt
- [ ] Tampering with the stored receipt body causes `verify` to return `{ valid: false }`
- [ ] After a decision is recorded, the original `decision_request_created` receipt still verifies (append-only behavior)
- [ ] `/verify/[receiptId]` renders publicly and shows hash + signature status (without exposing sensitive narrative fields)
- [ ] The decision endpoint response returns before webhook delivery completes (assertable in a test with a slow mocked endpoint)
- [ ] A test webhook can be sent from `/dashboard/settings/webhooks` and shows up in delivery history with a valid signature
- [ ] Slack OAuth install completes end-to-end against a real test workspace OR a recorded mock if no workspace is available
- [ ] An approval card sent to Slack, clicked "Approve", flips the RiskRecord to accepted, appends an audit entry, emits a webhook, and updates the Slack message
- [ ] Suspicious-login Access Accept records sent to Slack show "Accept Login Risk / Escalate Login / Reject", not generic labels
- [ ] Release-blocking Vulnerability Accept records sent to Slack show "Accept for Release / Block Release / Require Fix"
- [ ] The existing `app/api/evidence-packets/[id]/export.pdf` route still produces a valid PDF (backward-compat wrapper is working)
- [ ] Existing marketing pages, intake forms, hosted approval pages, evidence PDF export, and CSV export all still work unchanged

### Security
- [ ] No test, log, or response ever contains a full API key
- [ ] Card-number-shaped payload to `/api/v1/decision-requests` returns 400 `payload_unsafe` and creates no record
- [ ] Stale Slack timestamp (>5 min) is rejected
- [ ] Cross-tenant access via API returns 403, not 404 (don't leak existence)
- [ ] Idempotency-key collisions with different bodies return 409
- [ ] Idempotency keys with the same `userKey` on different endpoints do NOT collide (composite includes endpoint)
- [ ] CSP, HSTS, X-Frame-Options headers from existing `next.config.js` are preserved

### Documentation
- [ ] README has a "Phase 2" section listing every new route, env var, and verification command
- [ ] `/docs/decision-api`, `/docs/evidence-api`, `/docs/slack-app` are accurate against the running code
- [ ] Demo pages work end-to-end

### Language guardrails (unchanged from existing constraint)
- [ ] No new copy says "NIST certified", "CISA approved", "guaranteed compliant", "eliminates risk", or "auditor approved"
- [ ] New copy can say "NIST-aligned", "CISA KEV-aware", "designed to support audit evidence", "framework-informed", "evidence-ready"

---

## 14. Out of scope for this phase

Do not build any of the following without explicit follow-up:

- Real payment integration (Visa TAP, Stripe, Cybersource) — TrustAccept is the decision layer, not a payment processor. Card-data tripwire is the only payment-adjacent code.
- Outbound webhook retry scheduler — manual retry only for v1
- Rate limiting — leave for a later phase, just plumb 429 into the error model
- A separate `Policy` admin UI — hard-code defaults, expose via env tuning for now
- Slack slash command modal — listed as optional in §8.5, cut by default
- Real email / SMS / WhatsApp delivery via SequenceNow — keep the mock notifier
- Multi-region deployment, sharding, read replicas — out of scope
- A migration from in-memory store to Prisma at runtime — the Prisma schema is the target shape; the in-memory store mirrors it; swapping the adapter is its own phase

---

## 15. Open questions to flag back

If you (Claude Code) hit any of these, stop and ask before guessing:

1. The existing repo seeds 20+ RiskRecords. Should v1 API-created records be visually distinguishable from manually-created records in the dashboard? **Recommendation:** §9.1 already commits to the "Source: API" badge + `?source=api` filter approach. Proceed unless you see a reason not to.
2. The Slack approval card includes the record `title` and a snippet of the description. Some titles include customer names. Is there a redaction policy? **Recommendation:** truncate description to 280 chars and never include `accessContext.userOrServiceAccount` or `vulnerabilityContext.affectedAsset` if they look like PII (heuristic: contains `@`, looks like a UUID, or matches an email regex).
3. When a record is auto-approved by policy, should we still send a Slack card "FYI: auto-approved"? **Recommendation:** no by default, add an org-level setting `slackNotifyAutoDecisions` on `SlackInstallation` defaulted to `false`.
4. The new `metadata` field on RiskRecord could leak through CSV export. Should the existing CSV exporter include or exclude it? **Recommendation:** exclude by default, add `?include=metadata` query param.

Report back on these before merging the final commit.
