# verify-receipt

Standalone verifier for TrustAccept receipt JWTs.

This script proves that a receipt can be verified **without contacting TrustAccept**. It only needs the receipt JWT and the public key. No database, no HTTP server, no TrustAccept code in `node_modules`.

## Usage

```bash
# Public key from a local PEM file
node verify.mjs <jwt> --public-key ./trustaccept-receipt-public.pem

# Or via JWKS (fetches /.well-known/jwks.json and picks the matching kid)
node verify.mjs <jwt> --jwks-url http://localhost:3000/.well-known/jwks.json

# Or via env var
export TRUSTACCEPT_RECEIPT_PUBLIC_KEY_PEM_PATH=/path/to/public.pem
node verify.mjs <jwt>
```

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Signature verified, claims printed |
| 1 | Signature invalid or fetch failed |
| 2 | Usage error |

## Sample output

```
VERIFIED
  approval_id:         ra-mpez1by1-1
  action_hash:         sha256:da7209e53ae0b5bc...
  policy_id:           production-deploys-require-human-approval
  status:              approved
  decided_by:          Alex Greene
  decision_actor_type: human
  decided_at:          2026-05-21T03:44:54.897Z
  expires_at:          2026-05-21T03:54:54.897Z
  tenant_id:           demo-org
  audit_log_ref:       ra-mpez1by1-1:2026-05-21T03:44:54.897Z
  iss:                 trustaccept
  kid:                 trustaccept-receipt-rs256-1
```

## What this proves

After this script prints `VERIFIED`, the verifier can assert:

- The receipt was signed by the holder of the private key whose public counterpart is `--public-key` or `--jwks-url`.
- The receipt's `action_hash` is identical to whatever was hashed at request time. If the verifier independently computes the SHA-256 of the action payload an agent attempted, and it matches `action_hash`, the receipt covers that specific action.
- `decided_by` and `decision_actor_type` tell the verifier whether a human approved or a policy auto-decided.

No TrustAccept service can revoke a receipt after the fact — verification is purely cryptographic. To revoke an approval's authority, an enterprise should not rely on TrustAccept; they should enforce expiry at the agent's execution boundary.
