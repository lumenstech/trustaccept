import crypto from "crypto";
import type { TapVerificationResult } from "@/src/lib/agent-commerce/types";

const knownKeyId = process.env.TAP_DEMO_KEY_ID || "tap_demo_key_1";
const sharedSecret = process.env.TRUSTACCEPT_DEMO_API_KEY || "trustaccept_demo_key";

export async function verifyTapHeaders(headers: Headers, body: unknown, storeNonce?: (agentId:string, nonce:string, expiresAt:Date)=>Promise<boolean>): Promise<TapVerificationResult> {
  const errors: string[] = [];
  const nonce = headers.get("x-agent-nonce") || "";
  const created = Number(headers.get("x-agent-created") || Date.now());
  const expires = Number(headers.get("x-agent-expires") || Date.now() + 60_000);
  const keyId = headers.get("x-agent-key-id") || "";
  const signature = headers.get("signature") || headers.get("x-mock-signature") || "";
  const now = Date.now();
  const validTimestamp = created <= now + 5 * 60_000 && expires >= now;
  if (!validTimestamp) errors.push("Timestamp is invalid or expired.");
  const knownAgent = keyId === knownKeyId; if (!knownAgent) errors.push("Unknown key ID.");
  const expected = crypto.createHmac("sha256", sharedSecret).update(`${nonce}.${created}.${expires}.${JSON.stringify(body)}`).digest("hex");
  const validSignature = signature.length > 0 && signature === expected; if (!validSignature) errors.push("Invalid signature.");
  let validNonce = Boolean(nonce);
  if (validNonce && storeNonce) validNonce = await storeNonce(keyId || "unknown", nonce, new Date(expires));
  if (!validNonce) errors.push("Nonce is missing or already used.");
  return { valid: errors.length === 0, validSignature, validTimestamp, validNonce, knownAgent, errors, keyId };
}
