# REVIEW_PASS.md

Final pre-submission review of the 12 documents in `examples/submission-assets/`. Read as an IBM reviewer would, in the order specified by the Hour 4 brief.

Each document is checked against six criteria:

- **a. Positioning consistency** — uses "pre-execution authorization and evidence layer for AI agents" or a non-contradicting variant
- **b. No prohibited claims** — SOC 2 / ISO 27001 / FedRAMP / CISA / IBM partnership / Anthropic partnership / Microsoft partnership / Auth0 AM-499
- **c. No prohibited mentions** — WhatsApp / Slack / Teams / SMS / email channels / push notifications, *unless* the mention is an explicit non-claim ("status: not yet certified", "deferred per the plan", "forbidden phrasing")
- **d. No patent overclaiming** — provisional patent covers Channel-Bound Origin-Verified OTP Delivery only; no claim on receipts / policy / MCP / action hash
- **e. File-path references resolve** — every `src/...`, `app/...`, `apps/...`, `examples/...`, `tests/...` path points to a real file in this commit's tree
- **f. Pricing claims match PRICING.md**

Notation: ✓ pass, ✓† pass-with-note (acceptable framing of a sensitive topic), — not applicable (the doc doesn't make that kind of claim).

## Per-document review

### 1. SUBMISSION_README.md

| Criterion | Result | Note |
|---|---|---|
| a. Positioning | ✓ | Opens with "TrustAccept, the pre-execution authorization and evidence layer for AI agents." |
| b. Claims | ✓ | No certification or partnership claims. |
| c. Mentions | ✓ | No channel mentions. |
| d. Patent | ✓ | No patent reference at all. |
| e. File paths | ✓ | All 14 path references resolve. Verified with `find`/`ls`. |
| f. Pricing | — | Does not restate prices. |

### 2. SUBMISSION_FORM.md

| Criterion | Result | Note |
|---|---|---|
| a. Positioning | ✓ | Tagline + short description + long description sourced from the canonical positioning docs. |
| b. Claims | ✓† | Mentions SOC 2 / ISO 27001 / FedRAMP / HIPAA only in the explicit "Status: not yet certified for ..." line. Acceptable. |
| c. Mentions | ✓ | No channel mentions. |
| d. Patent | ✓ | Patent paragraph correctly scoped to Channel-Bound Origin-Verified OTP Delivery and explicitly excludes receipts/policy/MCP/action hash. |
| e. File paths | ✓ | All references resolve. |
| f. Pricing | ✓ | After the Team-tier wording fix in this same commit, matches PRICING.md exactly (see "Findings" below). |

### 3. POSITIONING_ONE_LINER.md

| Criterion | Result | Note |
|---|---|---|
| a. Positioning | ✓ | Source of truth for positioning. 30 / 90 / 280 / 600-char versions, all char-counted. |
| b. Claims | ✓† | Lists SOC 2 / ISO 27001 / FedRAMP / HIPAA / IBM partner / Anthropic partner / Microsoft partner / Auth0 in the **forbidden-phrasing table**. Inclusion as a ban is correct. |
| c. Mentions | ✓† | Lists Slack / Teams / WhatsApp / SMS / email channel / push notification in the forbidden-phrasing table. Inclusion as a ban is correct. |
| d. Patent | ✓ | Forbidden-phrasing table bans "Patented receipt format" / "Patented policy engine". |
| e. File paths | — | No file-path claims. |
| f. Pricing | — | No pricing claims. |

### 4. LISTING_TILE.md

| Criterion | Result | Note |
|---|---|---|
| a. Positioning | ✓ | Tagline is the 90-char canonical version (74 chars actual). |
| b. Claims | ✓ | None. |
| c. Mentions | ✓ | None. |
| d. Patent | ✓ | No patent reference. |
| e. File paths | ✓ | References `apps/mcp-server/scripts/stdio-smoke.mjs` and `/examples/verify-receipt`; both resolve. |
| f. Pricing | — | No pricing claims. |

### 5. LISTING_LONG_DESCRIPTION.md

| Criterion | Result | Note |
|---|---|---|
| a. Positioning | ✓ | Lead is the 600-char canonical version. Closing sentence reiterates the positioning. |
| b. Claims | ✓ | No certification claims. |
| c. Mentions | ✓ | No channel mentions. |
| d. Patent | ✓ | No patent reference. |
| e. File paths | ✓ | References `src/server/policies.ts`, `src/server/action-hash.ts`, `src/server/receipts.ts`, `app/approve/[id]`, `/api/v1/approvals`, `examples/verify-receipt/verify.mjs`, `/.well-known/jwks.json`. All resolve. |
| f. Pricing | — | No pricing claims. |

### 6. COMPETITIVE_POSITIONING.md

| Criterion | Result | Note |
|---|---|---|
| a. Positioning | ✓ | Capability matrix puts TrustAccept against 6 alternatives without naming partnerships. |
| b. Claims | ✓ | No partnership or certification claims. |
| c. Mentions | ✓ | No channel mentions. |
| d. Patent | ✓ | Closes with "the hardest-to-replace artifact is the action-bound signed JWT" — defensibility, not patent claim. |
| e. File paths | — | No file-path claims. |
| f. Pricing | — | No pricing claims. |

### 7. ARCHITECTURE.md

| Criterion | Result | Note |
|---|---|---|
| a. Positioning | ✓ | Opens with end-to-end view consistent with positioning. |
| b. Claims | ✓ | None. |
| c. Mentions | ✓† | "What's deliberately NOT in the diagram" lists "WhatsApp / Slack / email / SMS are deferred per the plan" — explicit non-claim, correct. |
| d. Patent | ✓ | No patent reference. |
| e. File paths | ✓ | All paths in the flowchart and component descriptions resolve. The `[id]` notation in `app/approve/[id]/page.tsx` is the literal directory name. |
| f. Pricing | — | No pricing claims. |

### 8. SECURITY_ONE_PAGER.md

| Criterion | Result | Note |
|---|---|---|
| a. Positioning | ✓† | Doesn't restate positioning, but security posture is consistent with it. |
| b. Claims | ✓† | "Status: not yet certified for SOC 2, ISO 27001, FedRAMP, HIPAA" — explicit non-claim. |
| c. Mentions | ✓ | No channel mentions. |
| d. Patent | ✓ | Patent posture section correctly scoped: Channel-Bound Origin-Verified OTP Delivery is provisional and NOT in this MVP; no claims on receipts / policy / MCP / action hash. |
| e. File paths | ✓ | All references resolve. |
| f. Pricing | — | No pricing claims. |

### 9. POLICY_RULES.md

| Criterion | Result | Note |
|---|---|---|
| a. Positioning | ✓ | Doesn't restate positioning; describes the policy engine consistent with it. |
| b. Claims | ✓ | None. |
| c. Mentions | ✓ | None. |
| d. Patent | ✓ | No patent reference. |
| e. File paths | ✓ | References `src/server/policies.ts` and `tests/policies.test.ts`; both resolve. |
| f. Pricing | — | No pricing claims. |

### 10. JWKS_RESPONSE.md

| Criterion | Result | Note |
|---|---|---|
| a. Positioning | — | Pure artifact capture; no positioning claim. |
| b. Claims | ✓ | None. |
| c. Mentions | ✓ | None. |
| d. Patent | ✓ | No patent reference. |
| e. File paths | ✓ | References `app/api/jwks/route.ts` and `next.config.js`; both resolve. |
| f. Pricing | — | No pricing claims. |

### 11. SAMPLE_JWT.md

| Criterion | Result | Note |
|---|---|---|
| a. Positioning | — | Pure artifact capture. |
| b. Claims | ✓ | None. |
| c. Mentions | ✓ | None. |
| d. Patent | ✓ | No patent reference. |
| e. File paths | ✓ | References `examples/verify-receipt/verify.mjs` and `examples/production-deploy-gatekeeper/index.mjs`; both resolve. |
| f. Pricing | — | No pricing claims. |

### 12. PRICING.md

| Criterion | Result | Note |
|---|---|---|
| a. Positioning | ✓ | Bottom line ("Value is risk reduction and verifiable evidence, not approval volume") reinforces positioning. |
| b. Claims | ✓ | No certifications. Enterprise tier items flagged "(roadmap)" individually. |
| c. Mentions | ✓ | No channel mentions. |
| d. Patent | ✓ | No patent reference. |
| e. File paths | ✓ | All references resolve. |
| f. Pricing | ✓ | Source of truth for prices. |

## Findings

### Finding 1 (fixed in this commit) — SUBMISSION_FORM.md Team-tier wording was looser than PRICING.md

The pricing-tier table in SUBMISSION_FORM.md previously read "action coverage across all 5 built-in policy categories" for the Team tier. That phrasing could be misread to mean "5 demo templates ship" rather than the more precise "1 demo template ships today, 4 more are roadmap, all 5 categories handled by the policy engine" — the wording the user landed on for PRICING.md in the Hour 2 fixup.

**Fix applied** in the same commit as this REVIEW_PASS.md: SUBMISSION_FORM.md Team-tier row now reads "production-deploy gatekeeper template (additional templates for customer-data-export, api-key-issuance, payment, infrastructure-access are roadmap, mapped 1:1 to the policy engine's five non-default rule categories)". This matches the PRICING.md framing exactly.

### Finding 2 (no action) — Mentions of forbidden terms appear in three docs

The terms SOC 2 / ISO 27001 / FedRAMP / HIPAA / IBM partner / Anthropic partner / Microsoft partner / WhatsApp / Slack / Teams / SMS / email channel / push notification each appear somewhere in the package. A grep audit confirmed every appearance is in one of three contexts:

- **Explicit non-claim** ("Status: not yet certified for SOC 2 ...") in SECURITY_ONE_PAGER.md and SUBMISSION_FORM.md
- **Forbidden-phrasing tables** in POSITIONING_ONE_LINER.md (a documentation discipline that bans the terms from being claimed)
- **Scope-cut sections** ("WhatsApp / Slack / email / SMS are deferred per the plan") in ARCHITECTURE.md

All three contexts are correct framings. No fix.

### Finding 3 (no action) — `Auth0 AM-499` and `CISA Secure` do not appear anywhere

Zero hits across all docs. The prohibitions from the brief are honored by absence.

## Cross-document consistency spot checks

- **"Seven ordered rules, first match wins"** — appears identically in POLICY_RULES.md, SECURITY_ONE_PAGER.md, LISTING_LONG_DESCRIPTION.md, ARCHITECTURE.md, SUBMISSION_FORM.md, LISTING_TILE.md. No drift.
- **"RS256-signed receipt JWT" / "RS256-signed JWT receipts"** — appears in SECURITY_ONE_PAGER.md, LISTING_LONG_DESCRIPTION.md, LISTING_TILE.md bullets, SUBMISSION_FORM.md, ARCHITECTURE.md, SAMPLE_JWT.md, JWKS_RESPONSE.md (header context), POSITIONING_ONE_LINER.md. No drift.
- **`action_hash`** — lowercase underscore in every claim/field context.
- **Engineering-freeze commit `371a165`** — referenced as the final code-touching commit in SUBMISSION_README.md and SUBMISSION_FORM.md.
- **Three MCP tool names** (`request_approval`, `get_approval_status`, `list_pending_approvals`) — appear identically in apps/mcp-server/src/tools.ts (verified) and in LISTING_TILE.md, LISTING_LONG_DESCRIPTION.md, ARCHITECTURE.md, SUBMISSION_FORM.md, POSITIONING_ONE_LINER.md.

## File-path resolution audit

I ran a programmatic check (via `for f in <paths>; do [ -e "$f" ] || echo MISSING; done`) against every code-file path referenced by the submission docs. **All references resolve.** No `MISSING` lines.

## Go / no-go recommendation

**GO** — submit the package.

The one substantive finding (the SUBMISSION_FORM.md Team-tier wording) has been fixed in this same commit. The remaining flagged-term appearances are all in correct non-claim contexts and reflect documentation discipline rather than overclaiming. Every code-resident claim is backed by a file that exists in the engineering-freeze tree. Positioning is consistent across all 12 documents.

## Two items requiring a human before submission, not code

These are not bugs in the package; they are real-world steps that only the submitter can complete.

1. **Screenshots** — five required PNGs listed in `screenshots/README.md`. The assistant cannot drive a browser; a human needs to capture them.
2. **Demo recording** — 90-second screen capture per `examples/production-deploy-gatekeeper/RECORDING_PLAN.md`. The `SAMPLE_RUN.md` transcript provides a static backup if the recording is awkward.

If neither is ready at submission time, both are deferrable: SUBMISSION_FORM.md uses placeholders for the demo URL field, and the IBM listing surface usually accepts a follow-up upload.
