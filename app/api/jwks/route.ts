import { NextResponse } from "next/server";
import { loadPublicJwk } from "@/src/server/receipts";

/**
 * Public JWKS endpoint. Exposed under /.well-known/jwks.json via a
 * Next.js rewrite (see next.config.js). Returns the receipt-signing
 * public key in JWK form so verifiers can fetch and cache it.
 *
 * The verify-receipt example deliberately reads the public key from a
 * file rather than fetching JWKS, to prove that signature verification
 * does not require contacting TrustAccept at all. JWKS is the
 * convenience surface for systems that prefer rotation-aware fetching.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const jwk = loadPublicJwk();
  if (!jwk) {
    return NextResponse.json(
      {
        keys: [],
        error: "receipt signing key not configured",
      },
      { status: 503 },
    );
  }
  return NextResponse.json({ keys: [jwk] });
}
