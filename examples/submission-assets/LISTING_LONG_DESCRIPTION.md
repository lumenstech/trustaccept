# TrustAccept

**TrustAccept is the pre-execution authorization and evidence layer for AI agents.**

## What it does

TrustAccept gives enterprises a human checkpoint before AI agents touch production, money, customer data, privileged access, or regulated workflows. When an agent attempts a consequential action — `production_deploy`, `customer_data_export`, `api_key_*` or `secret_*` issuance, `payment`, or `infrastructure_*` — the agent first calls TrustAccept's `request_approval` tool over MCP. TrustAccept evaluates a deterministic policy, captures a cryptographic hash of the exact action payload, presents the request to a named human approver, and on resolution issues a signed receipt that binds the approval to the action.

## How it works

TrustAccept exposes three MCP tools — `request_approval`, `get_approval_status`, and `list_pending_approvals` — that proxy onto a Next.js API at `/api/v1/approvals`. On every request, a deterministic policy engine in `src/server/policies.ts` evaluates seven ordered rules to decide between `allow`, `require_approval`, and `deny`. Auto-allow and auto-deny decisions are finalized synchronously by a synthetic `policy:{policy_id}` actor with full audit logging. A `require_approval` decision leaves the record PENDING and the agent receives an approval URL. Before the record is created, `src/server/action-hash.ts` computes the SHA-256 of the canonical-JSON serialization of the action — type, summary, and payload, with sorted keys at every depth — and stores it on the record.

A human approver opens the hosted page at `/approve/[id]`, sees the policy decision panel (policy id, risk level, action hash prefix, policy reason), and clicks Accept or Deny. On resolution, the next call to `get_approval_status` triggers `src/server/receipts.ts` to issue an RS256-signed JWT carrying every claim that ties the decision to the action: `approval_id`, `action_hash`, `policy_id`, `decided_by`, `decision_actor_type`, `decided_at`, `audit_log_ref`, and `tenant_id`. The receipt is generated on demand and never persisted. The public key is published at `/.well-known/jwks.json` so external systems can verify offline.

## The cryptographic guarantees

Every receipt cryptographically binds four facts: the exact action payload (via `action_hash`), the exact policy that fired (via `policy_id`), the exact human or policy that decided (via `decided_by` and `decision_actor_type`), and the exact decision time (via `decided_at`). Any change to the action after approval — a different deployment target, a larger payment amount, an extra payload field — produces a different canonical hash and the receipt no longer matches. This is the "approve one thing, execute another" attack class that a basic approval table cannot prevent. Verification is performed by `examples/verify-receipt/verify.mjs`, a standalone Node script that reads only the JWT and the public key. It contains zero TrustAccept code and makes no calls into TrustAccept's API.

TrustAccept is not an agent orchestrator, not a governance platform, not a workflow engine, and not an identity provider. It is the pre-execution authorization and evidence layer that sits between agents and the actions they want to take.
