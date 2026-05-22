# production-deploy-gatekeeper — TrustAccept end-to-end demo

A small Node 20.19+ script that performs the IBM demo flow:

1. An agent (`release-bot`) requests approval for a `production_deploy`.
2. The TrustAccept policy engine evaluates → `require_approval`, `high` risk → record stays PENDING.
3. The script prints the hosted approval URL. In production this is the signed `approval_url` returned by TrustAccept; in local demo mode it falls back to `/approve/:id`.
4. The script polls `get_approval_status` until it resolves.
5. The script fetches the signed RS256 receipt JWT.
6. The script invokes `examples/verify-receipt/` against the JWT, which verifies the signature with a local public key — **no contact with TrustAccept**.

## Setup (one-time)

```bash
# 1) Generate a demo key pair
mkdir -p .demo-keys
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 \
  -out .demo-keys/private.pem
openssl rsa -in .demo-keys/private.pem -pubout -out .demo-keys/public.pem

# 2) Export the private key as the receipt signing key
export TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM="$(cat .demo-keys/private.pem)"

# 3) Start the TrustAccept dev server with that env var
npm run dev
```

## Run the demo

In a second terminal:

```bash
# (Optional) Override the public-key path or API URL
export TRUSTACCEPT_RECEIPT_PUBLIC_KEY_PEM_PATH="$(pwd)/.demo-keys/public.pem"
export TRUSTACCEPT_API_URL=http://localhost:3000

node examples/production-deploy-gatekeeper/index.mjs
```

The script prints the approval URL returned by the API. In local demo mode it looks like `http://localhost:3000/approve/ra-...`; in production it includes the signed approval token. Open it, click **Accept**, then watch the script print the signed receipt JWT and the `VERIFIED` output from `verify-receipt`.

## What this proves to a buyer

- **Pre-execution gating works.** The agent does not deploy until a named human (or auto-allow policy) decides.
- **The exact action is bound to the decision.** `action_hash` is the SHA-256 of the action payload at request time, and it is embedded in the receipt's claims and the receipt's signature.
- **The receipt is independently verifiable.** `verify-receipt` does not import any TrustAccept code or make any HTTP call into TrustAccept — it only needs the JWT and the public key. An auditor or downstream CI system can verify months later, even if TrustAccept is offline.
- **Receipt cannot impersonate.** `decided_by` is `RiskRecord.decisionBy` verbatim (the name the existing decision service stored, or `policy:{policy_id}` for auto-decisions). The system never invents an email at issuance time.

## Files

- `index.mjs` — the demo script
- `package.json` — declares Node 20.19+; no dependencies
- `RECORDING_PLAN.md` — shot-by-shot transcript for the 90-second screen capture

## Operational note

In a real deployment, the agent would invoke `request_approval` through the TrustAccept MCP server (`apps/mcp-server`) via stdio. This script calls the HTTP wrapper directly because that is what the MCP server proxies to — the observable behaviour is identical, and the script stays small enough to fit on one screen.
