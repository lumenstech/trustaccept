import crypto from "crypto";

export function signWebhookPayload(payload: unknown, secret: string) {
  const raw = JSON.stringify(payload);
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}
