# SUBMISSION_README.md

**TrustAccept — IBM Agent Connect listing submission package.**

## What this is

This directory (`examples/submission-assets/`) is the IBM Agent Connect listing submission package for TrustAccept, the pre-execution authorization and evidence layer for AI agents. The package is dated 2026-05-21 and corresponds to the engineering freeze on commit [`371a165`](https://github.com/lumenstech/trustaccept/commit/371a165) (the final Block 5 commit) on branch `ibmflavor/marketplace-submission` of `lumenstech/trustaccept`. Every commit on the branch after `371a165` touches only files inside `examples/submission-assets/` — no production-code changes were made during the submission-collateral phase.

## Where to start

Pick the reading order that matches your role.

### Engineering reviewer
1. [`ARCHITECTURE.md`](ARCHITECTURE.md) — end-to-end flow plus receipt-verification sequence diagram
2. [`src/server/policies.ts`](../../src/server/policies.ts) — the 7-rule policy engine
3. [`src/server/action-hash.ts`](../../src/server/action-hash.ts) — canonical-JSON SHA-256
4. [`src/server/receipts.ts`](../../src/server/receipts.ts) — RS256 JWT issuance
5. [`examples/verify-receipt/`](../verify-receipt/) — standalone external verifier

### Security reviewer
1. [`SECURITY_ONE_PAGER.md`](SECURITY_ONE_PAGER.md) — crypto primitives, auth model, audit, MVP scope, patent posture
2. [`SAMPLE_JWT.md`](SAMPLE_JWT.md) — captured real receipt + decoded claims
3. [`JWKS_RESPONSE.md`](JWKS_RESPONSE.md) — live JWKS endpoint capture with headers
4. [`examples/verify-receipt/verify.mjs`](../verify-receipt/verify.mjs) — the verifier code itself

### Product reviewer
1. [`LISTING_LONG_DESCRIPTION.md`](LISTING_LONG_DESCRIPTION.md) — what it does, how it works, cryptographic guarantees
2. [`LISTING_TILE.md`](LISTING_TILE.md) — catalog tile copy
3. [`COMPETITIVE_POSITIONING.md`](COMPETITIVE_POSITIONING.md) — capability matrix vs. 6 alternatives
4. [`PRICING.md`](PRICING.md) — three tiers, shipped-vs-roadmap explicit

### Demo reviewer
1. [`examples/production-deploy-gatekeeper/README.md`](../production-deploy-gatekeeper/README.md) — setup + run
2. [`examples/production-deploy-gatekeeper/SAMPLE_RUN.md`](../production-deploy-gatekeeper/SAMPLE_RUN.md) — captured live transcript
3. [`examples/production-deploy-gatekeeper/RECORDING_PLAN.md`](../production-deploy-gatekeeper/RECORDING_PLAN.md) — shot-by-shot storyboard for the 90-second screen recording

## The 60-second verification

Confirm a real TrustAccept receipt is cryptographically valid without touching TrustAccept's database, HTTP server, or any TrustAccept code beyond the verifier script. Three steps, ~60 seconds wall time:

```bash
# 1. Clone the repo
git clone https://github.com/lumenstech/trustaccept.git
cd trustaccept

# 2. Extract the canned sample JWT and verify it against the committed public key
JWT="$(grep -oE 'eyJ[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+' examples/submission-assets/SAMPLE_JWT.md | head -1)"
node examples/verify-receipt/verify.mjs "$JWT" --public-key examples/submission-assets/sample-public-key.pem
```

Expected output:

```
VERIFIED
  approval_id:         ra-mpf07dzo-1
  action_hash:         sha256:02556632e9e24cceecdba82e4820503cb3a81b44a84bcb853155d1422923d4d4
  policy_id:           production-deploys-require-human-approval
  status:              approved
  decided_by:          Alex Greene
  decision_actor_type: human
  ...
```

This runs entirely offline. The verifier script (`examples/verify-receipt/verify.mjs`) is zero-dependency Node 18+, and `examples/submission-assets/sample-public-key.pem` is the RSA public key for the demo signing key pair used to produce the captured receipt. **No contact with TrustAccept is required for verification.**

For an end-to-end live flow (agent → human → receipt → verify), follow [`examples/production-deploy-gatekeeper/README.md`](../production-deploy-gatekeeper/README.md). That path requires ~2 minutes of one-time setup (generate keys, start dev server) and ~30 seconds of active verification time.

## Index of artifacts

| File | One-line description |
|---|---|
| [`SUBMISSION_README.md`](SUBMISSION_README.md) | This file — reviewer landing doc |
| [`SUBMISSION_FORM.md`](SUBMISSION_FORM.md) | Pre-filled IBM Agent Connect listing fields + draft email |
| [`POSITIONING_ONE_LINER.md`](POSITIONING_ONE_LINER.md) | 30 / 90 / 280 / 600-character positioning, single source of truth |
| [`LISTING_TILE.md`](LISTING_TILE.md) | Catalog tile copy with char-budget verification |
| [`LISTING_LONG_DESCRIPTION.md`](LISTING_LONG_DESCRIPTION.md) | ~450-word product description |
| [`COMPETITIVE_POSITIONING.md`](COMPETITIVE_POSITIONING.md) | Capability matrix + competitor wedge paragraphs |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | End-to-end flow + receipt-verification sequence + threat model |
| [`SECURITY_ONE_PAGER.md`](SECURITY_ONE_PAGER.md) | Evidence-backed security posture; explicit MVP-scope limitations |
| [`POLICY_RULES.md`](POLICY_RULES.md) | All 7 policy rules in human-readable form |
| [`JWKS_RESPONSE.md`](JWKS_RESPONSE.md) | Live JWKS endpoint capture (HTTP headers + body) |
| [`SAMPLE_JWT.md`](SAMPLE_JWT.md) | Captured real receipt JWT + decoded header/payload + verify output |
| [`PRICING.md`](PRICING.md) | Three tiers; shipped vs. roadmap explicit |
| [`REVIEW_PASS.md`](REVIEW_PASS.md) | Final pre-submission review checklist (a–f per doc) + go/no-go |
| [`sample-public-key.pem`](sample-public-key.pem) | RSA public key matching the JWT in `SAMPLE_JWT.md` for the offline verification |
| [`screenshots/README.md`](screenshots/README.md) | Inventory of screenshots a human needs to capture (browser screenshots; the assistant cannot drive a browser) |

## Contact

| Field | Value |
|---|---|
| Company | Lumens Technologies Corp |
| Brand | TrustAccept |
| Legal entity | Sequence Now Corp |
| Repository | https://github.com/lumenstech/trustaccept |
| Submission branch | `ibmflavor/marketplace-submission` |
| Engineering-freeze commit | `371a165` |
| Point of contact | _(to be filled in by Danny before submission — name, email, phone)_ |

## Engineering freeze

The final production-code commit is **`371a165`** ("Block 5: signed receipts + external verify + production-deploy demo"). Every commit since then on `ibmflavor/marketplace-submission` touches only `examples/submission-assets/`:

| Commit | Message | Files touched |
|---|---|---|
| `d99fee1` | Submission artifacts (Hour 1: SAMPLE_JWT, JWKS_RESPONSE, POLICY_RULES, ARCHITECTURE, screenshots/README) | `examples/submission-assets/*` |
| `b705545` | Listing collateral (Hour 2: LISTING_LONG_DESCRIPTION, SECURITY_ONE_PAGER, COMPETITIVE_POSITIONING, PRICING) | `examples/submission-assets/*` |
| `89b4e96` | PRICING fixup (Team-tier template claim) | `examples/submission-assets/PRICING.md` |
| `63d6f4c` | LISTING_TILE + improved ARCHITECTURE (Hour 3) | `examples/submission-assets/*` |
| _Hour 4 commit_ | SUBMISSION_README, SUBMISSION_FORM, POSITIONING_ONE_LINER, REVIEW_PASS, sample-public-key.pem | `examples/submission-assets/*` |

No `src/`, `app/`, `apps/`, `prisma/`, `tests/`, `lib/`, `components/`, or build config was modified during the submission phase. Engineering freeze holds.
