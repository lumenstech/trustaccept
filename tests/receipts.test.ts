import { describe, expect, it } from "vitest";
import {
  __rotateSigningKeyForTests,
  getSigningKey,
  signCompactJws,
  verifyCompactJws,
} from "@/src/server/receipts";

describe("RS256 compact JWS", () => {
  it("signs and verifies a payload round-trip", () => {
    const key = getSigningKey();
    const receipt = signCompactJws({ sub: "dec-1", action: "wire" }, key);
    expect(receipt.alg).toBe("RS256");
    expect(receipt.kid).toBe(key.kid);
    expect(receipt.jws.split(".").length).toBe(3);

    const verified = verifyCompactJws(receipt.jws, key);
    expect(verified.valid).toBe(true);
    expect(verified.header?.alg).toBe("RS256");
    expect(verified.header?.kid).toBe(key.kid);
    expect(verified.payload?.sub).toBe("dec-1");
    expect(verified.payload?.action).toBe("wire");
  });

  it("fails verification when the payload is tampered", () => {
    const key = getSigningKey();
    const receipt = signCompactJws({ sub: "dec-2", amount: 100 }, key);
    const [h, _p, s] = receipt.jws.split(".");
    const tamperedPayload = Buffer.from('{"sub":"dec-2","amount":999}', "utf8")
      .toString("base64")
      .replace(/=+$/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const tampered = `${h}.${tamperedPayload}.${s}`;
    const verified = verifyCompactJws(tampered, key);
    expect(verified.valid).toBe(false);
    expect(verified.reason).toBe("signature_invalid");
  });

  it("rejects malformed JWS strings", () => {
    expect(verifyCompactJws("not.valid").valid).toBe(false);
    expect(verifyCompactJws("a.b.c.d").valid).toBe(false);
  });

  it("fails verification under a different signing key", () => {
    const original = getSigningKey();
    const receipt = signCompactJws({ sub: "dec-3" }, original);
    const rotated = __rotateSigningKeyForTests();
    expect(rotated.kid).not.toBe(original.kid);
    const verified = verifyCompactJws(receipt.jws, rotated);
    expect(verified.valid).toBe(false);
  });
});
