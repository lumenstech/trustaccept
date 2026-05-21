# SAMPLE_JWT.md

Captured 2026-05-21 from a freshly-started Next.js dev server (`npm run dev` with `TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM` set to a 2048-bit RSA private key generated via `openssl genpkey`).

The receipt was produced by running `examples/production-deploy-gatekeeper/index.mjs` end-to-end and accepting the approval through the existing dashboard decision endpoint. Verification was performed by `examples/verify-receipt/verify.mjs` against the matching public key on disk — **no contact with TrustAccept's API**.

## Raw JWT (RS256, three dot-separated base64url segments)

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InRydXN0YWNjZXB0LXJlY2VpcHQtcnMyNTYtMSJ9.eyJhcHByb3ZhbF9pZCI6InJhLW1wZjA3ZHpvLTEiLCJhZ2VudCI6InJlbGVhc2UtYm90IiwiYWN0aW9uX2hhc2giOiJzaGEyNTY6MDI1NTY2MzJlOWUyNGNjZWVjZGJhODJlNDgyMDUwM2NiM2E4MWI0NGE4NGJjYjg1MzE1NWQxNDIyOTIzZDRkNCIsInBvbGljeV9pZCI6InByb2R1Y3Rpb24tZGVwbG95cy1yZXF1aXJlLWh1bWFuLWFwcHJvdmFsIiwic3RhdHVzIjoiYXBwcm92ZWQiLCJkZWNpZGVkX2J5IjoiQWxleCBHcmVlbmUiLCJkZWNpc2lvbl9hY3Rvcl90eXBlIjoiaHVtYW4iLCJkZWNpZGVkX2F0IjoiMjAyNi0wNS0yMVQwNDo0MTo1MC4xMjdaIiwiZXhwaXJlc19hdCI6IjIwMjYtMDUtMjFUMDQ6NTE6NDUuODc2WiIsInRlbmFudF9pZCI6ImRlbW8tb3JnIiwiYXVkaXRfbG9nX3JlZiI6InJhLW1wZjA3ZHpvLTE6MjAyNi0wNS0yMVQwNDo0MTo1MC4xMjdaIiwiaXNzIjoidHJ1c3RhY2NlcHQiLCJpYXQiOjE3NzkzMzg1MTJ9.b76I9QE-MlJ355sK8SMVIJSB3HRzmKej5U5ZI5WXSKLhip0B1teLTw3Z3lNrY03WailNZoB3kWhU1W0eH_e6UeGVV6wlPJ1-rVz3zpH4PYYHF-tfMYtwcrgThkUMuHyRTE9xrGKtRtSfO77zYdTuyYYkSWygIlbNbN0HD817kcY2-i47ar6fyJGrDmsxvKrkWUUV4PirFLWhehK5STEQU7g7QcXyV9xzATQASS_hzCxgrx5rn1SBF7vaws_tx67HFNNbgRO9SYm1QtInreVo5Ruei0IheJK4Y4nzQYURE-CxlyhYJMikXBF5Z0NMlhi4jTfTsHjszm6ChP10tFuyhw
```

Token length: 1056 characters.

## Decoded header

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "trustaccept-receipt-rs256-1"
}
```

## Decoded payload

```json
{
  "approval_id": "ra-mpf07dzo-1",
  "agent": "release-bot",
  "action_hash": "sha256:02556632e9e24cceecdba82e4820503cb3a81b44a84bcb853155d1422923d4d4",
  "policy_id": "production-deploys-require-human-approval",
  "status": "approved",
  "decided_by": "Alex Greene",
  "decision_actor_type": "human",
  "decided_at": "2026-05-21T04:41:50.127Z",
  "expires_at": "2026-05-21T04:51:45.876Z",
  "tenant_id": "demo-org",
  "audit_log_ref": "ra-mpf07dzo-1:2026-05-21T04:41:50.127Z",
  "iss": "trustaccept",
  "iat": 1779338512
}
```

## verify-receipt output (external verification)

Command:

```bash
node examples/verify-receipt/verify.mjs <jwt> --public-key .demo-keys/public.pem
```

Output:

```
VERIFIED
  approval_id:         ra-mpf07dzo-1
  action_hash:         sha256:02556632e9e24cceecdba82e4820503cb3a81b44a84bcb853155d1422923d4d4
  policy_id:           production-deploys-require-human-approval
  status:              approved
  decided_by:          Alex Greene
  decision_actor_type: human
  decided_at:          2026-05-21T04:41:50.127Z
  expires_at:          2026-05-21T04:51:45.876Z
  tenant_id:           demo-org
  audit_log_ref:       ra-mpf07dzo-1:2026-05-21T04:41:50.127Z
  iss:                 trustaccept
  kid:                 trustaccept-receipt-rs256-1
```

## What this JWT proves

- The signature is valid against the published RSA public key (kid `trustaccept-receipt-rs256-1`).
- The action that was approved hashes to `sha256:02556632e9e24cce…`. If an auditor independently computes the canonical SHA-256 of the agent's intended action payload and gets the same digest, the receipt is bound to that exact action.
- A named human (Alex Greene) decided — `decision_actor_type: "human"`. The decider field is `RiskRecord.decisionBy` verbatim, not a post-hoc email lookup.
- The decision happened at `2026-05-21T04:41:50.127Z` and its authorization window expires at `2026-05-21T04:51:45.876Z` (10 minutes for `risk_level: "high"`, per the policy engine's default expirations).
- `audit_log_ref` lets an enterprise cross-check against their internal audit log: the record id and decision timestamp form a deterministic composite key.

## Reproducing this artifact

```bash
# 1. Generate keys
mkdir -p .demo-keys
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out .demo-keys/private.pem
openssl rsa -in .demo-keys/private.pem -pubout -out .demo-keys/public.pem

# 2. Start the server with the signing key
TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM="$(cat .demo-keys/private.pem)" npm run dev

# 3. Run the demo (in another shell)
TRUSTACCEPT_RECEIPT_PUBLIC_KEY_PEM_PATH="$(pwd)/.demo-keys/public.pem" \
node examples/production-deploy-gatekeeper/index.mjs
# → prints the approval URL, click Accept in the browser, then watch
#   the JWT and the VERIFIED claims block stream out.
```
