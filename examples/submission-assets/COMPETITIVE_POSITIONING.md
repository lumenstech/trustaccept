# COMPETITIVE_POSITIONING.md

How TrustAccept differs from the products and patterns enterprises already have in their stack.

## Capability matrix

| Capability | watsonx Orchestrate | watsonx.governance | ServiceNow | Okta / Auth0 | Microsoft Agent 365 | Basic approval table | TrustAccept |
|---|---|---|---|---|---|---|---|
| Agent orchestration | Yes | No | No | No | Yes | No | No |
| AI governance / compliance reporting | Partial | Yes | No | No | Partial | No | No |
| Identity / access management | No | No | No | Yes | Yes | No | No |
| Generic workflow approvals | No | No | Yes | No | No | Yes | No |
| MCP-native approval tool | No | No | No | No | No | No | Yes |
| Action hash binding (SHA-256 of payload) | No | No | No | No | No | No | Yes |
| Signed receipt JWT (RS256, JWKS-published key) | No | No | No | No | No | No | Yes |
| Vendor-neutral | No | No | Partial | Partial | No | Yes | Yes |
| Built for pre-execution gating of agent actions | No | No | No | No | No | Partial | Yes |

"Partial" reflects products that touch the capability tangentially (e.g. ServiceNow can broker approvals across systems, but it is not designed for per-agent-action gating at machine latency) or that meet the capability only in a constrained way (a basic approval table is technically pre-execution but supplies no cryptographic binding to the action).

## Where each wedge lands

### vs. watsonx Orchestrate
Orchestrate runs agents. TrustAccept gates the consequential action. The two are complementary: an Orchestrate-deployed agent calls TrustAccept's `request_approval` MCP tool before it touches production, money, or customer data, and the receipt JWT lands in the enterprise's audit chain regardless of which orchestrator the agent is running under.

### vs. watsonx.governance
Governance reports policy. TrustAccept enforces it at execution time. A governance platform tells you, after the fact, what agents have been doing and whether that aligns with your AI policy posture. TrustAccept stops a specific action that does not align before it executes — and emits a signed artifact proving every decision.

### vs. ServiceNow
ServiceNow is a workflow engine designed for change-management cycles measured in hours or days. TrustAccept is the millisecond gate before tool execution. An agent cannot wait for a ticket to route through a CAB; it can wait for a sub-second policy decision plus an optional human checkpoint surfaced on a hosted approval page.

### vs. Okta / Auth0
Identity providers prove **who** an agent is. TrustAccept proves **what was approved**. Identity tells the agent's operator that the principal is authenticated; it cannot answer whether a specific deploy, payment, or data export was approved by a named human against a specific policy at a specific time. That is the receipt JWT's job.

### vs. Microsoft Agent 365
Microsoft Agent 365 is Microsoft-bound. TrustAccept is neutral across MCP clients. An enterprise that runs agents across Microsoft, watsonx, AWS Bedrock, Anthropic, and an in-house Python framework still has one approval layer with one receipt format.

### vs. a basic approval table
A click is not evidence. The action-bound signed receipt is. Anyone can build a table that lists pending decisions and surfaces an Accept button — and any vendor that wants to compete on TrustAccept's territory will try. The differentiator is that the receipt JWT is RS256-signed, embeds the SHA-256 of the exact action payload, names the deciding human verbatim, and verifies offline against the published JWKS. A table does not produce that artifact.

---

**The hardest-to-replace artifact is the action-bound signed JWT. A basic approval table cannot produce one.**
