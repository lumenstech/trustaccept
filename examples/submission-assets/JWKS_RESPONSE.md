# JWKS_RESPONSE.md

The public key used to verify TrustAccept receipt JWTs is published at the conventional well-known path. Captured 2026-05-21 from `http://localhost:3000` after starting the dev server with `TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM` set.

## Request

```bash
curl -i http://localhost:3000/.well-known/jwks.json
```

## Response

```
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch
content-type: application/json
Date: Thu, 21 May 2026 04:42:03 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"keys":[{"kty":"RSA","n":"qtoRCTjyEremveArFTpipAGmnQX0I4R5SGUYWuZfJ_rbX_e9s3gUCsLC34kJGQDyTQDtGM5jPRVmJL1fVTJ319vQnpg3LzUz5iIddhcF8C9mcZ6Sk7nWheRUtke_DNUeMJ2jRE4VxQPy9HZbfd6vKYk4oMCp2C6NhfubE9iqm5ir6xP05ZHN0fbMKBrHfeiBiPhph-Bp1kNb4COZUKT1gaK91JV8irk_kgJucq7wlh4nufHltksqPii4ALTRghDM_s8CaKs7FAeEoI5TcxOUpquS1WRAal1elYWS7uu-rzZspOjF5_R-jlxegMRpUGGIb43I74UhgPWrkrejcCDolw","e":"AQAB","kid":"trustaccept-receipt-rs256-1","use":"sig","alg":"RS256"}]}
```

## Response body (pretty-printed)

```json
{
  "keys": [
    {
      "kty": "RSA",
      "n": "qtoRCTjyEremveArFTpipAGmnQX0I4R5SGUYWuZfJ_rbX_e9s3gUCsLC34kJGQDyTQDtGM5jPRVmJL1fVTJ319vQnpg3LzUz5iIddhcF8C9mcZ6Sk7nWheRUtke_DNUeMJ2jRE4VxQPy9HZbfd6vKYk4oMCp2C6NhfubE9iqm5ir6xP05ZHN0fbMKBrHfeiBiPhph-Bp1kNb4COZUKT1gaK91JV8irk_kgJucq7wlh4nufHltksqPii4ALTRghDM_s8CaKs7FAeEoI5TcxOUpquS1WRAal1elYWS7uu-rzZspOjF5_R-jlxegMRpUGGIb43I74UhgPWrkrejcCDolw",
      "e": "AQAB",
      "kid": "trustaccept-receipt-rs256-1",
      "use": "sig",
      "alg": "RS256"
    }
  ]
}
```

## Field reference

| JWK field | Value | Meaning |
|---|---|---|
| `kty` | `"RSA"` | RSA key type |
| `n` | base64url RSA modulus | 2048 bits in this MVP build |
| `e` | `"AQAB"` | Public exponent (65537), the conventional default |
| `kid` | `"trustaccept-receipt-rs256-1"` | Key id; matches the `kid` in every receipt JWT header |
| `use` | `"sig"` | Key is for signature verification only |
| `alg` | `"RS256"` | RSA-SHA256 |

## Notes

- **Header `content-type: application/json`** — confirms the endpoint is correctly serving JSON, not the HTML 404 page. The other security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy`, `Content-Security-Policy`) come from the existing Next.js middleware and are appropriate for a public endpoint.
- **Path** — exposed at the IANA-conventional `/.well-known/jwks.json` via a Next.js rewrite (`next.config.js`); served from `app/api/jwks/route.ts` internally because Next.js's App Router doesn't accept a literal `.well-known` segment in the file tree.
- **No auth** — the JWKS endpoint is public by design. Middleware does not protect it because the public key is, by definition, public.
- **No CORS configured yet** — fine for the IBM Agent Connect demo. Production-grade verifiers running in browsers would need a `Access-Control-Allow-Origin: *` header; out of scope for the MVP.
- **Rotation** — a single key today. Post-MVP, multiple keys can coexist in the `keys[]` array during rotation, and verifiers must match by `kid`.
- **503 fallback** — when no signing key is configured (`TRUSTACCEPT_RECEIPT_PRIVATE_KEY_PEM` unset), the endpoint returns HTTP 503 with `{"keys":[], "error": "receipt signing key not configured"}` rather than 200 with an empty key set. This makes misconfiguration visible to monitoring.
