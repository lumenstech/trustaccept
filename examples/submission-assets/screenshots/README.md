# Screenshots needed for the IBM Agent Connect submission

Drop captured PNG files in this directory. The submission listing and recording will reference them by filename. **I (the assistant) cannot drive a browser, so a human needs to take these.** Setup steps are in `examples/production-deploy-gatekeeper/README.md`.

Recommended capture: 1920×1080 or 1440×900, light or dark mode, PNG. Crop tightly so the surrounding chrome doesn't dominate.

## Required (5 screenshots)

### 1. `approval-page-policy-panel.png`
Browser at `http://localhost:3000/approve/<id>` for an MCP-created `production_deploy` approval. Frame the page so the "Policy decision" card is fully visible, showing:
- "Action type" → `production_deploy`
- "Policy" → `production-deploys-require-human-approval`
- "Action hash" → `sha256:…` (the truncated first 16 hex chars + ellipsis)
- The policy reason sentence underneath
- The risk-level badge ("HIGH") at the top of the header

This is **the** money shot. Make sure the action hash and policy id are legible.

### 2. `approval-page-full.png`
Same page as #1 but capture the whole screen so a reviewer sees: header, title, policy panel, Decide buttons, supporting cards (compensating controls / evidence / business justification), source references, and the right-hand "Decision facts" sidebar. Scrolled-to-top.

### 3. `jwks-endpoint.png`
Browser at `http://localhost:3000/.well-known/jwks.json`. The response is JSON, so use a browser with JSON pretty-printing (Firefox renders JSON nicely by default; Chrome needs an extension or `view-source:`). Make sure the entire JWK is visible, including `kty`, `n`, `e`, `kid`, `use`, `alg`.

### 4. `demo-script-terminal.png`
Terminal with the output of:

```bash
TRUSTACCEPT_API_URL=http://localhost:3000 \
TRUSTACCEPT_RECEIPT_PUBLIC_KEY_PEM_PATH="$(pwd)/.demo-keys/public.pem" \
node examples/production-deploy-gatekeeper/index.mjs
```

Frame from the `[1/6] release-bot requesting approval …` line through the end of `[5/6] Signed receipt (JWT, RS256):` so the JWT is visible. The terminal width should let the JWT wrap, not get truncated.

### 5. `verify-receipt-terminal.png`
Either continue the same terminal session as #4 (showing `[6/6] Verifying receipt EXTERNALLY (no TrustAccept calls) …` followed by `VERIFIED` and the claims block), or run `verify-receipt` standalone:

```bash
node examples/verify-receipt/verify.mjs <jwt> --public-key .demo-keys/public.pem
```

Frame so the entire `VERIFIED` block plus all 13 claim lines fit. **Visually highlight (post-edit or via terminal selection) the `action_hash` and `decided_by` lines** — these are the "proof" lines for the listing.

## Optional (nice-to-have)

### 6. `mcp-stdio-handshake.png`
Terminal showing `apps/mcp-server/scripts/stdio-smoke.mjs` output. Captures the initialize / tools/list / tools/call traffic. Useful for showing the MCP-native angle to a technical reviewer.

### 7. `inbox-pending.png`
`http://localhost:3000/dashboard/inbox` showing the approval before resolution. Demonstrates the dashboard surface.

## Naming and submission

- Use the filenames above verbatim so the listing's image refs don't break.
- Commit the PNGs to this directory.
- If you compress for upload, keep an `originals/` subfolder with the lossless captures.
