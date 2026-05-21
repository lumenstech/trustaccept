# SUBMISSION_FORM.md

Pre-filled values for the IBM Agent Connect listing submission. Each field is sourced from a file in this directory; the source is noted in italics for traceability. Treat this as a copy-paste source for whatever form the submission portal presents.

---

## Product name

**TrustAccept**

_Source: [`POSITIONING_ONE_LINER.md`](POSITIONING_ONE_LINER.md)_

## Tagline

Verified human approval for AI agent actions, with cryptographic evidence.

_Source: [`LISTING_TILE.md`](LISTING_TILE.md) (90-char tagline, 74 chars used)_

## Short description

Pre-execution authorization layer that gates AI agent actions through a human checkpoint before they touch production or sensitive data. Every approval ships with an RS256-signed receipt JWT bound to the exact action_hash — externally verifiable without TrustAccept access.

_Source: [`LISTING_TILE.md`](LISTING_TILE.md) (≤300 chars, 272 chars used)_

## Long description

Paste the full body of [`LISTING_LONG_DESCRIPTION.md`](LISTING_LONG_DESCRIPTION.md) — 447 words across the lead positioning line, "What it does", "How it works" (two paragraphs), "The cryptographic guarantees", and the closing position-against-alternatives sentence.

## Category and subcategory

- **Category**: Security and Governance
- **Subcategory candidates** (pick whichever IBM's catalog supports): AI Governance, Identity / Access / Security, Developer Tools / Authorization

_Source: [`LISTING_TILE.md`](LISTING_TILE.md)_

## Integration type

MCP tool server (Anthropic Model Context Protocol). Ships with stdio transport in the MVP. Streamable HTTP transport is on the roadmap and is not represented in this submission.

_Source: [`LISTING_TILE.md`](LISTING_TILE.md)_

## Frameworks supported

Any MCP client. Specifically tested with the stdio transport against `apps/mcp-server/scripts/stdio-smoke.mjs` (initialize → tools/list → tools/call for all three tools, full JSON-RPC transcripts captured). Streamable HTTP transport is roadmap.

_Source: [`LISTING_TILE.md`](LISTING_TILE.md)_

## Keywords / tags

`approval`, `authorization`, `governance`, `audit`, `evidence`, `MCP`, `AI agents`, `policy`

_Source: [`LISTING_TILE.md`](LISTING_TILE.md)_

## Pricing tiers

| Tier | Price | Main feature |
|---|---|---|
| Starter | $149 / month | Three MCP tools, hosted approval page, default policy ruleset, RS256 receipt signing with JWKS, one demo template, 500 approvals/month |
| Team | $499 / month | All Starter features, 5,000 approvals/month, production-deploy gatekeeper template (additional templates for customer-data-export, api-key-issuance, payment, infrastructure-access are roadmap, mapped 1:1 to the policy engine's five non-default rule categories), exportable audit logs, priority support |
| Enterprise | Custom | All Team features plus SSO/SAML, private deployment, tenant-scoped signing keys, custom policy rules, SIEM export, ServiceNow/Jira integration, procurement and security review support (SSO/SAML, tenant-scoped keys, SIEM export, ServiceNow/Jira are roadmap) |

_Source: [`PRICING.md`](PRICING.md)_

## Demo URL / video link

_Placeholder. To be filled when the 90-second screen recording is uploaded._

Recording storyboard: [`examples/production-deploy-gatekeeper/RECORDING_PLAN.md`](../production-deploy-gatekeeper/RECORDING_PLAN.md).
Captured live transcript backup: [`examples/production-deploy-gatekeeper/SAMPLE_RUN.md`](../production-deploy-gatekeeper/SAMPLE_RUN.md).

## GitHub repository link

- **Repository**: https://github.com/lumenstech/trustaccept
- **Branch**: `ibmflavor/marketplace-submission`
- **Engineering-freeze commit**: `371a165`
- **Submission snapshot tag**: `submission-2026-05-21` (annotated, points at commit `5d6180d`)
  - Browse the submission package at the tag: https://github.com/lumenstech/trustaccept/tree/submission-2026-05-21/examples/submission-assets
  - Tag landing page (with annotation message): https://github.com/lumenstech/trustaccept/releases/tag/submission-2026-05-21

## Documentation URL

[`examples/submission-assets/SUBMISSION_README.md`](SUBMISSION_README.md) — the reviewer landing document. Tagged permalink: https://github.com/lumenstech/trustaccept/blob/submission-2026-05-21/examples/submission-assets/SUBMISSION_README.md

## Security and compliance posture

TrustAccept ships an RS256-signed JWT receipt service ([`src/server/receipts.ts`](../../src/server/receipts.ts)) using Node's built-in `node:crypto`, with the public key published at the IANA-conventional `/.well-known/jwks.json` endpoint ([`app/api/jwks/route.ts`](../../app/api/jwks/route.ts)). Every approval is gated by a deterministic pre-execution policy engine ([`src/server/policies.ts`](../../src/server/policies.ts); seven ordered rules, first match wins, full test coverage in [`tests/policies.test.ts`](../../tests/policies.test.ts)) and recorded in an append-only audit log ([`src/server/auditLogs.ts`](../../src/server/auditLogs.ts)). The MVP runs on a single env-configured RSA key, demo-mode permissive auth, and in-memory storage; production-grade tenant-scoped keys, SSO/SAML integration, and Postgres backing are roadmap items. **Status: not yet certified for SOC 2, ISO 27001, FedRAMP, or HIPAA.** Full details in [`SECURITY_ONE_PAGER.md`](SECURITY_ONE_PAGER.md).

## Patent and IP posture

Sequence Now Corp has filed a provisional patent on **Channel-Bound Origin-Verified OTP Delivery**, which is a separate primitive **not included in this MVP**. No patent claims are made on the policy engine, the receipt format, the MCP server, or the action hash — anyone is free to implement a similar approach. TrustAccept's defensibility comes from the integrated, code-resident implementation and the action-bound signed receipt artifact, not from patent protection.

_Source: [`SECURITY_ONE_PAGER.md`](SECURITY_ONE_PAGER.md)_

## Roadmap items called out as post-MVP

The following capabilities are explicitly **not** in the submission package and are flagged across the collateral as roadmap rather than implied or omitted: Postgres migration (the Prisma schema is in place, runtime is in-memory Maps); tenant-scoped signing keys with kid-based JWKS rotation (single key today); full identity provider integration (SSO/SAML/OIDC); signed approval URLs with HMAC tokens (the URL is the capability in the MVP); nonce-based replay protection for receipts (only `iat` + approval `expires_at` today); MCP Streamable HTTP transport (stdio only today); tool allowlist enforcement (the `tool_id` field is reserved on the input shape but not gated); SIEM bridges, ServiceNow / Jira webhooks, policy-editing UI, DB-backed policies, additional demo templates beyond `production-deploy-gatekeeper`. The MVP is scoped to prove the IBM value end-to-end with the smallest credible surface; each roadmap item maps to a real follow-on PR rather than a research effort.

---

## If the submission path is email rather than a self-serve form

### Subject

`TrustAccept — Agent Connect listing submission`

### Recipients

- **To**: Ria Pai <ria.pai@ibm.com> (IBM AI Specialist)
- **Cc**: Marco Sesay <marco.sesay@ibm.com> (IBM Client Engineering) — _verify this address against the current IBM directory before sending; address may be stale_

### Body

```
Ria,

TrustAccept is the pre-execution authorization and evidence layer for AI
agents. It gives enterprises a human checkpoint before agents touch
production, money, customer data, privileged access, or regulated
workflows — and produces a cryptographic artifact for every decision.

The submission package is at:
  https://github.com/lumenstech/trustaccept/tree/ibmflavor/marketplace-submission/examples/submission-assets

Three things to look at first:

  - SUBMISSION_README.md — the reviewer landing doc, with a paste-runnable
    60-second receipt-verification script that requires zero TrustAccept
    access.
  - The action-bound signed receipt JWT (SAMPLE_JWT.md) plus the
    standalone external verifier (examples/verify-receipt/). The receipt
    binds approval to the exact action payload via SHA-256; it cannot be
    detached from the action it approved.
  - The production-deploy-gatekeeper demo
    (examples/production-deploy-gatekeeper/) — end-to-end agent → human
    → receipt flow in about 90 seconds.

Could we book a 30-minute technical review call to walk through the demo
and answer any questions on the security posture? I am happy to work
around your schedule.

Best,
Danny Ramroop
Lumens Technologies Corp (brand: TrustAccept, entity: Sequence Now Corp)
```

(149 words in the body, engineer-to-engineer tone matching the rest of the package.)
