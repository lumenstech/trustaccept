# PRICING.md

Three tiers. Every feature listed under Starter and Team ships today in the repository as of Block 5. Features marked **(roadmap)** in Enterprise are explicitly post-MVP.

## Starter — $149 / month

- One tenant
- Three MCP tools: `request_approval`, `get_approval_status`, `list_pending_approvals`
  ([`apps/mcp-server/src/tools.ts`](../../apps/mcp-server/src/tools.ts))
- Hosted approval page at `/approve/[id]` with the policy decision panel
  ([`app/approve/[id]/page.tsx`](../../app/approve/[id]/page.tsx))
- Up to 500 approval requests per month
- Append-only audit log
  ([`src/server/auditLogs.ts`](../../src/server/auditLogs.ts))
- Default policy ruleset — seven ordered rules
  ([`src/server/policies.ts`](../../src/server/policies.ts); full registry in [`POLICY_RULES.md`](POLICY_RULES.md))
- RS256 receipt signing with a single configurable key from `TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM`
  ([`src/server/receipts.ts`](../../src/server/receipts.ts))
- JWKS endpoint at `/.well-known/jwks.json`
  ([`app/api/jwks/route.ts`](../../app/api/jwks/route.ts))
- One demo template: `production-deploy-gatekeeper`
  ([`examples/production-deploy-gatekeeper/`](../../examples/production-deploy-gatekeeper))
- Standalone external receipt verifier
  ([`examples/verify-receipt/`](../../examples/verify-receipt))

## Team — $499 / month

Everything in Starter, plus:

- Up to 5,000 approval requests per month
- Action coverage across all five built-in policy categories: `production_deploy`, `customer_data_export`, `api_key_*` / `secret_*`, `payment`, `infrastructure_*` (all handled by the shipped policy engine; the `production-deploy-gatekeeper` demo today, additional demo scripts available on request)
- Exportable audit logs (downloadable JSON / CSV; today via `src/server/auditLogs.ts` read helpers)
- Priority support

## Enterprise — Custom

Everything in Team, plus:

- SSO / SAML integration **(roadmap)**
- Private deployment
- Tenant-scoped signing keys **(roadmap)**
- Custom policy rules
- SIEM export **(roadmap)**
- ServiceNow / Jira integration **(roadmap)**
- Procurement and security review support

---

**Value is risk reduction and verifiable evidence, not approval volume.**
