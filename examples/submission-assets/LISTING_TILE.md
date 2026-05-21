# LISTING_TILE.md

Copy and character budgets for the IBM Agent Connect catalog tile. Every field below has been hand-counted to fit the budget noted in parentheses.

---

## Product name

**TrustAccept**

## Tagline (≤ 90 chars)

**Verified human approval for AI agent actions, with cryptographic evidence.**

(75 / 90 chars)

## Category

**Security and Governance**

Alternatives in case the IBM catalog uses a different taxonomy: "AI Governance", "Identity, Access, and Security", "Developer Tools / Authorization". Pick whichever IBM's catalog list (slide 48 of their partner deck, if available) maps closest to a pre-execution authorization primitive — TrustAccept is not in the AI Models or Workflow Automation lanes.

## Three bullet points (≤ 120 chars each)

- MCP-native: agents call request_approval, get_approval_status, list_pending_approvals over stdio
- Pre-execution policy: 7-rule deterministic engine decides allow / require_approval / deny before the human sees anything
- Cryptographic receipts: RS256-signed JWTs bind every decision to the exact action_hash, externally verifiable via JWKS

(96, 120, 118 chars respectively)

## Short description (≤ 300 chars)

Pre-execution authorization layer that gates AI agent actions through a human checkpoint before they touch production or sensitive data. Every approval ships with an RS256-signed receipt JWT bound to the exact action_hash — externally verifiable without TrustAccept access.

(272 / 300 chars)

## Integration type

**MCP tool server (Anthropic Model Context Protocol).** Ships with stdio transport in the MVP; Streamable HTTP transport is on the roadmap.

## Frameworks supported

Any MCP client. Specifically tested with the stdio transport against `apps/mcp-server/scripts/stdio-smoke.mjs` (initialize → tools/list → tools/call for all three tools, full JSON-RPC transcripts captured). Streamable HTTP transport is roadmap.

## Keywords / tags (5–8)

`approval`, `authorization`, `governance`, `audit`, `evidence`, `MCP`, `AI agents`, `policy`

(8 keywords)

## Call to action

**Verify a TrustAccept receipt at `/examples/verify-receipt` — runs in 60 seconds with zero TrustAccept access.**
