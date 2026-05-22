#!/usr/bin/env node
// Standalone TrustAccept receipt verifier.
//
// Verifies an RS256-signed receipt JWT against a public key. Prints
// VERIFIED + the cryptographically-bound claims, or FAILED with a
// diagnostic. No dependencies, no HTTP, no TrustAccept code — this
// script can run on any machine with Node 20.19+ and a copy of the
// public key.
//
// Usage:
//   node verify.mjs <jwt> --public-key <path-to-public-key.pem>
//   node verify.mjs <jwt> --jwks-url <https://trustaccept.example/.well-known/jwks.json>
//
// Exit codes:
//   0  signature verified
//   1  signature invalid OR claim sanity check failed
//   2  usage error

import { createPublicKey, createVerify } from "node:crypto";
import { readFileSync } from "node:fs";

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith("--")) {
      flags[a.slice(2)] = argv[++i];
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function usage(msg) {
  if (msg) console.error(`error: ${msg}`);
  console.error(
    "usage: verify.mjs <jwt> --public-key <pem-path>",
  );
  console.error(
    "       verify.mjs <jwt> --jwks-url <url>           # fetches the JWKS, picks matching kid",
  );
  process.exit(2);
}

function b64urlToBuffer(s) {
  const padded =
    s.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function decodeJwtSegments(jwt) {
  const parts = jwt.split(".");
  if (parts.length !== 3) usage("malformed JWT (expected 3 dot-separated segments)");
  const header = JSON.parse(b64urlToBuffer(parts[0]).toString("utf8"));
  const claims = JSON.parse(b64urlToBuffer(parts[1]).toString("utf8"));
  return { headerB64: parts[0], claimsB64: parts[1], sigB64: parts[2], header, claims };
}

async function fetchPublicKeyFromJwks(jwksUrl, kid) {
  const res = await fetch(jwksUrl);
  if (!res.ok) {
    console.error(`FAILED — could not fetch JWKS at ${jwksUrl} (HTTP ${res.status})`);
    process.exit(1);
  }
  const body = await res.json();
  const keys = body.keys ?? [];
  const match = keys.find((k) => k.kid === kid) ?? keys[0];
  if (!match) {
    console.error(`FAILED — no matching key in JWKS (kid=${kid})`);
    process.exit(1);
  }
  return createPublicKey({ key: match, format: "jwk" });
}

function loadPublicKeyFromFile(path) {
  const pem = readFileSync(path, "utf8");
  return createPublicKey({ key: pem, format: "pem" });
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const jwt = positional[0];
  if (!jwt) usage("missing JWT");

  const { headerB64, claimsB64, sigB64, header, claims } = decodeJwtSegments(jwt);

  let publicKey;
  if (flags["public-key"]) {
    publicKey = loadPublicKeyFromFile(flags["public-key"]);
  } else if (flags["jwks-url"]) {
    publicKey = await fetchPublicKeyFromJwks(flags["jwks-url"], header.kid);
  } else if (process.env.TRUSTACCEPT_RECEIPT_PUBLIC_KEY_PEM_PATH) {
    publicKey = loadPublicKeyFromFile(process.env.TRUSTACCEPT_RECEIPT_PUBLIC_KEY_PEM_PATH);
  } else {
    usage("must supply --public-key <path>, --jwks-url <url>, or TRUSTACCEPT_RECEIPT_PUBLIC_KEY_PEM_PATH");
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${claimsB64}`);
  verifier.end();
  const ok = verifier.verify(publicKey, b64urlToBuffer(sigB64));

  if (!ok) {
    console.error("FAILED — signature does not verify against the supplied public key");
    process.exit(1);
  }

  console.log("VERIFIED");
  console.log(`  approval_id:         ${claims.approval_id}`);
  console.log(`  action_hash:         ${claims.action_hash}`);
  console.log(`  policy_id:           ${claims.policy_id}`);
  console.log(`  status:              ${claims.status}`);
  console.log(`  decided_by:          ${claims.decided_by}`);
  console.log(`  decision_actor_type: ${claims.decision_actor_type}`);
  console.log(`  decided_at:          ${claims.decided_at}`);
  console.log(`  expires_at:          ${claims.expires_at ?? "null"}`);
  console.log(`  tenant_id:           ${claims.tenant_id}`);
  console.log(`  audit_log_ref:       ${claims.audit_log_ref}`);
  console.log(`  iss:                 ${claims.iss}`);
  console.log(`  kid:                 ${header.kid}`);
}

main().catch((err) => {
  console.error(`FAILED — ${err.message ?? String(err)}`);
  process.exit(1);
});
