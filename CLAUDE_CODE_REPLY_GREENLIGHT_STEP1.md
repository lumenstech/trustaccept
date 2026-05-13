# Reply to Claude Code — greenlight step 1 with three amendments

Good first-action reply. The three sentences you picked are exactly the right three, and the catch on `/api/v1/*` already being outside the middleware matcher is the kind of defensive reading I want throughout this build.

## Repo state

I've committed the following at the repo root before you start step 1:

- `TRUSTACCEPT_PHASE2_PLAN.md` (v2, 868 lines — authoritative; the inline copy you read matches this)
- `CLAUDE.md`
- `TRUSTACCEPT_PRODUCT_STRATEGY.md`
- `TRUSTACCEPT_EXECUTION_RULES.md`
- `TRUSTACCEPT_COMPETITIVE_VALIDATION.md`
- `TRUSTACCEPT_SOURCE_NOTES.md`
- `TRUSTACCEPT_WEBSITE_UPDATE_PROMPT.md`

Treat the plan file on disk as the source of truth from this point. If your inline copy and the disk copy ever differ, stop and ask.

## Three amendments before you commit step 1

**1. Q2 tightening — accepted, but defer to step 8.**

Your idea to consolidate Slack card redaction and webhook payload redaction into a single `src/lib/security/redaction.ts` is better than what the plan specifies. Do it. But not in step 1 — add it in step 8 (Slack approval card + send), since that's when redaction first becomes user-visible. When you write `buildApprovalCard()`, route the description and any context fields through this module. Then in §6.2's webhook payload construction (which lives in `src/server/webhooks.ts`, landing in step 7), also call this module before signing. One redaction surface, one set of tests, no drift between channels.

The function surface I want:

```ts
// src/lib/security/redaction.ts
export function redactForExternalSurface(value: string): string;
export function redactRecordForSlack(record: RiskRecord): RedactedRecordView;
export function redactRecordForWebhook(record: RiskRecord): RedactedRecordView;
```

The two record-shaped functions can share an internal implementation; the names are split so callsites read clearly. Internally, both apply: description truncation to 280 chars, email/UUID redaction on `accessContext.userOrServiceAccount` and `vulnerabilityContext.affectedAsset`, and the payload-guard heuristics (card/CVV/routing patterns) on every string field. Tests live at `tests/security/redaction.test.ts`.

**2. 5-line fixture-fix rule.**

If `evidence.test.ts` (or any existing test) breaks during step 1 by more than ~5 lines of fixture updates, stop and surface it rather than absorbing the fix into the commit. Adding optional fields with default values should be additive and shouldn't break anything; if it does, the failure is signal that one of the existing tests is asserting on the exact shape of the record object (e.g. `expect(packet).toEqual({...})` with no `objectContaining`), and that's worth a separate small commit to switch those assertions to `objectContaining` first. Don't bundle.

**3. Two schema confirmations before you write the Prisma diff.**

Confirm both of these in your next reply, before any code:

- `Organization` back-relations: `apiKeys ApiKey[]`, `webhookEndpoints WebhookEndpoint[]`, and `slackInstallation SlackInstallation?` — the Slack one is **singular and optional**, not a list, because `SlackInstallation.organizationId` is `@unique` (one install per org). If you're tempted to write `slackInstallations SlackInstallation[]`, stop.
- `WebhookDelivery.riskRecordId` stays `String?` (nullable). `receipt.created` events reference a receipt, not a record directly, so this column has to allow null. Don't tighten it to `String`.

## Go condition

Confirm those two schema points in a one-paragraph reply, then proceed with step 1 exactly as you scoped it:

- `prisma/schema.prisma` diff (new models + EvidencePacket extension + RiskRecord `metadata` field + Organization back-relations)
- `src/server/store.ts` diff (new collections, new `*Record` types, extended `EvidencePacketRecord`)
- `lib/types.ts` diff (one line: `metadata?: Record<string, unknown>` on `RiskRecord`)
- Five verification commands (`npm install`, `npm run prisma:generate`, `npm run typecheck`, `npm test`, `npm run build`) all exit 0
- Commit message you drafted is fine

After step 1 lands, send me the full diff and the verification output. I'll review before you start step 2.
