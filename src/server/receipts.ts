import {
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  generateKeyPairSync,
  type KeyObject,
} from "node:crypto";

/**
 * RS256 compact JWS signing for decision receipts.
 *
 * Production: inject `TRUSTACCEPT_SIGNING_KEY_PEM` (RSA private key,
 * 2048+ bit) and a stable `TRUSTACCEPT_SIGNING_KEY_ID` via env. The
 * key is never written to disk by this module.
 *
 * Demo / dev: a 2048-bit RSA key is generated once per process and
 * cached on `globalThis` so signatures verify within the run.
 */

interface SigningKey {
  kid: string;
  privateKey: KeyObject;
  publicKey: KeyObject;
}

declare global {
  // eslint-disable-next-line no-var
  var __TRUSTACCEPT_SIGNING_KEY__: SigningKey | undefined;
}

function loadKeyFromEnv(): SigningKey | null {
  const pem = process.env.TRUSTACCEPT_SIGNING_KEY_PEM;
  const kid = process.env.TRUSTACCEPT_SIGNING_KEY_ID;
  if (!pem || !kid) return null;
  const privateKey = createPrivateKey({ key: pem, format: "pem" });
  const publicKey = createPublicKey(privateKey);
  return { kid, privateKey, publicKey };
}

function generateEphemeralKey(): SigningKey {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const kid = `dev-${Date.now().toString(36)}`;
  return { kid, privateKey, publicKey };
}

export function getSigningKey(): SigningKey {
  if (globalThis.__TRUSTACCEPT_SIGNING_KEY__) {
    return globalThis.__TRUSTACCEPT_SIGNING_KEY__;
  }
  const key = loadKeyFromEnv() ?? generateEphemeralKey();
  globalThis.__TRUSTACCEPT_SIGNING_KEY__ = key;
  return key;
}

/** Test-only: rotate the signing key (useful for tamper / verify-failure tests). */
export function __rotateSigningKeyForTests(): SigningKey {
  globalThis.__TRUSTACCEPT_SIGNING_KEY__ = generateEphemeralKey();
  return globalThis.__TRUSTACCEPT_SIGNING_KEY__;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(input: string): Buffer {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export interface JwsHeader {
  alg: "RS256";
  typ: "JWT";
  kid: string;
}

export interface SignedReceipt {
  jws: string;
  kid: string;
  alg: "RS256";
}

export function signCompactJws(
  payload: Record<string, unknown>,
  key: SigningKey = getSigningKey(),
): SignedReceipt {
  const header: JwsHeader = { alg: "RS256", typ: "JWT", kid: key.kid };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(key.privateKey);
  const signatureB64 = base64url(signature);

  return {
    jws: `${signingInput}.${signatureB64}`,
    kid: key.kid,
    alg: "RS256",
  };
}

export interface VerifiedReceipt {
  valid: boolean;
  header?: JwsHeader;
  payload?: Record<string, unknown>;
  reason?: string;
}

export function verifyCompactJws(
  jws: string,
  key: SigningKey = getSigningKey(),
): VerifiedReceipt {
  const parts = jws.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "malformed_jws" };
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: JwsHeader;
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(base64urlDecode(headerB64).toString("utf8"));
    payload = JSON.parse(base64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return { valid: false, reason: "invalid_encoding" };
  }
  if (header.alg !== "RS256") {
    return { valid: false, reason: "unsupported_alg" };
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();

  const ok = verifier.verify(key.publicKey, base64urlDecode(signatureB64));
  if (!ok) return { valid: false, header, payload, reason: "signature_invalid" };
  return { valid: true, header, payload };
}
