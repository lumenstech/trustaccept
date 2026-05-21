# POLICY_RULES.md

The TrustAccept MVP ships with **seven** built-in policy rules, evaluated in the listed order, **first match wins**. The engine is deterministic and rule-based — no LLM inference at decision time. Source: [`src/server/policies.ts`](../../src/server/policies.ts). Tests covering every rule, ordering invariants, and boundaries: [`tests/policies.test.ts`](../../tests/policies.test.ts) (15 tests).

## Default expirations by risk level

Every rule's `expires_at_seconds` is derived from its `risk_level` unless the rule overrides explicitly (no rule does so today):

| Risk level | Default expiration |
|---|---|
| `critical` | 300 s (5 min) |
| `high` | 600 s (10 min) |
| `medium` | 3600 s (1 hour) |
| `low` | no expiration |

The wrapper turns `expires_at_seconds` into an absolute ISO timestamp at request time and stores it on the underlying `RiskRecord.expirationDate`. The approval-page expiry check is computed at presentation time (no background sweep).

## Rule registry

### 1. `production-deploys-require-human-approval`

| | |
|---|---|
| **Trigger** | `action.type === "production_deploy"` |
| **Decision** | `require_approval` |
| **Risk level** | `high` |
| **Default expiry** | 600 s |
| **Reason text** | Production deploys require a documented human approval before execution. |

### 2. `customer-data-export-requires-approval`

| | |
|---|---|
| **Trigger** | `action.type === "customer_data_export"` |
| **Decision** | `require_approval` |
| **Risk level** | `critical` |
| **Default expiry** | 300 s |
| **Reason text** | Customer data exports must be reviewed by a human approver before release. |

### 3. `secret-issuance-requires-admin-approval`

| | |
|---|---|
| **Trigger** | `action.type` matches `^(api_key_|secret_)` (e.g. `api_key_create`, `secret_rotate`) |
| **Decision** | `require_approval` |
| **Risk level** | `critical` |
| **Default expiry** | 300 s |
| **Reason text** | Issuing API keys or secrets requires admin review; secrets cannot be auto-allowed. |

### 4. `high-dollar-payment-requires-approval`

| | |
|---|---|
| **Trigger** | `action.type === "payment"` AND `context.amount > 5000` (strict `>`, not `≥`) |
| **Decision** | `require_approval` |
| **Risk level** | `high` |
| **Default expiry** | 600 s |
| **Reason text** | Payments above $5,000 require human approval. |

### 5. `infrastructure-access-requires-approval`

| | |
|---|---|
| **Trigger** | `action.type` matches `^infrastructure_` (e.g. `infrastructure_provision`, `infrastructure_modify_iam`) |
| **Decision** | `require_approval` |
| **Risk level** | `high` |
| **Default expiry** | 600 s |
| **Reason text** | Infrastructure-modifying actions require human approval. |

### 6. `read-only-low-risk-auto-allow`

| | |
|---|---|
| **Trigger** | `action.type` matches `^(read_|report_)` AND `context.amount` is absent |
| **Decision** | `allow` (auto-allowed by policy; no human prompt) |
| **Risk level** | `low` |
| **Default expiry** | no expiration |
| **Reason text** | Read-only or report actions with no monetary impact are auto-allowed. |

When a `read_*` or `report_*` action carries `context.amount`, this rule does **not** match and evaluation falls through to the default rule. This guards against an agent disguising a money-moving operation as a read.

### 7. `default-require-human-approval` (catch-all)

| | |
|---|---|
| **Trigger** | nothing above matched |
| **Decision** | `require_approval` |
| **Risk level** | `medium` |
| **Default expiry** | 3600 s |
| **Reason text** | No matching policy; defaulting to human approval. |

The catch-all is intentionally `require_approval`, not `allow`. The MVP fails safe: an unrecognized action type means a human looks at it.

## Boundary behaviors worth knowing

- **Strict `>` on payment threshold.** A payment of exactly $5,000 does **not** match rule 4 and falls through to the default (`medium`, `require_approval`). This is covered by an explicit boundary test.
- **`api_key_read` matches the secret rule, not the read rule.** Because rules are first-match-wins and rule 3 is evaluated before rule 6, any action type starting with `api_key_` is treated as a secret-issuance event regardless of the verb. Covered by an explicit ordering test.
- **Risk level drives expiration.** A rule cannot independently set a low risk and a long expiration; expiry is a property of the risk band. This makes the timeline behavior predictable for compliance reviewers.

## Where the policy_id surfaces

The matched rule's `policy_id` is bound everywhere the decision is observable:

- Stored on the `RiskRecord` as `sourceReferences[label="Policy"].externalId`
- Returned in the locked MCP output as `approval.policy_id`
- Displayed on the hosted approval page in the "Policy decision" panel
- Embedded in the signed receipt JWT as the `policy_id` claim
- Used as the synthetic actor's `decisionBy` for auto-decisions (`"policy:{policy_id}"`)

## Adding or changing rules (post-MVP)

For the MVP, rule changes require a code edit and release — the plan explicitly defers a DB-backed policy store and a policy editing UI. To add a rule:

1. Append a new `Rule` to `RULES[]` in `src/server/policies.ts`, **before** the default and **after** any narrower rules that should still take precedence.
2. Add a unit test in `tests/policies.test.ts` covering the new rule and at least one ordering-invariant test if there is overlap with an existing rule.
3. Update this document.
