# POSITIONING_ONE_LINER.md

Single source of truth for product positioning across the entire submission package. If any other document drifts from these versions, that document gets fixed — these do not.

## 30-character version (Twitter bio / one-word brand)

**Signed approvals for AI agents** *(30 chars)*

## 90-character version (LISTING_TILE.md tagline)

**Verified human approval for AI agent actions, with cryptographic evidence.** *(74 chars)*

## 280-character version (elevator pitch for IBM reviewers)

**Pre-execution authorization and evidence layer for AI agents. TrustAccept gates agent actions through a policy engine and a human checkpoint, then issues an RS256-signed receipt JWT bound to the exact action payload — externally verifiable, no TrustAccept access required.** *(274 chars)*

## 600-character version (lead paragraph of LISTING_LONG_DESCRIPTION.md)

**TrustAccept gives enterprises a human checkpoint before AI agents touch production, money, customer data, privileged access, or regulated workflows. When an agent attempts a consequential action — `production_deploy`, `customer_data_export`, `api_key_*` or `secret_*` issuance, `payment`, or `infrastructure_*` — the agent first calls TrustAccept's `request_approval` tool over MCP. TrustAccept evaluates a deterministic policy, captures a cryptographic hash of the exact action payload, presents the request to a named human approver, and on resolution issues a signed receipt that binds the approval to the action.** *(594 chars)*

## Locked phrasing rules

These phrases appear identically across every document in `examples/submission-assets/`. If you change one, change them all.

| Phrase | Where it must match |
|---|---|
| "pre-execution authorization and evidence layer for AI agents" | LISTING_LONG_DESCRIPTION lead, LISTING_TILE category framing, SUBMISSION_README opener, SUBMISSION_FORM long description, POSITIONING_ONE_LINER 280-char version |
| "RS256-signed receipt JWT" or "RS256-signed JWT receipts" | SECURITY_ONE_PAGER, LISTING_TILE bullets, LISTING_LONG_DESCRIPTION, SUBMISSION_FORM, ARCHITECTURE |
| "action_hash" (lowercase, underscored) | Everywhere it appears as a claim or field name |
| "externally verifiable, no TrustAccept access required" (or close paraphrase: "no TrustAccept calls", "without TrustAccept API access") | Everywhere the verifier story is told |
| "seven ordered rules, first match wins" | POLICY_RULES, SECURITY_ONE_PAGER, LISTING_LONG_DESCRIPTION, ARCHITECTURE |

## Forbidden phrasing

These framings are inaccurate or overclaim and must not appear anywhere in the submission package.

| Forbidden | Why |
|---|---|
| "Patented receipt format" / "Patented policy engine" | Receipts, policy, MCP, and action hash carry no patent claims. The provisional patent covers Channel-Bound Origin-Verified OTP Delivery only, which is NOT in this MVP. |
| "SOC 2 compliant", "ISO 27001 certified", "FedRAMP authorized", "HIPAA-ready" | Not yet certified. SECURITY_ONE_PAGER says "status: not yet certified" — every other doc must match. |
| "IBM partner" / "Anthropic partner" / "Microsoft partner" / "Auth0-reviewed" | No active partnership review claim is made anywhere in the package. |
| "Slack / Teams / WhatsApp / SMS / email channel" | Channels are explicitly deferred per the marketplace plan. The hosted approval URL is the delivery surface. |
| "Real-time notification" / "Push notification" | Same reason as above. |
| "Multi-tenant key isolation" | One env-configured signing key in the MVP. Tenant-scoped keys are roadmap. |
| "Production-grade authentication" | The MVP runs demo auth; full identity provider integration is roadmap. |
