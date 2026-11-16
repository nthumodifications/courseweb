import type { VapidConfig } from "../config/push";
import { base64urlToBytes, bytesToBase64url } from "./base64url";

const encoder = new TextEncoder();

const derToJose = (signature: Uint8Array): Uint8Array => {
  if (signature.byteLength === 64) return signature;
  if (signature[0] !== 0x30)
    throw new Error("Unexpected ECDSA signature format");
  let offset = 2;
  if (signature[1] & 0x80) offset += signature[1] & 0x7f;
  if (signature[offset] !== 0x02) throw new Error("Invalid ECDSA r value");
  const rLength = signature[offset + 1];
  const rStart = offset + 2;
  const r = signature.slice(rStart, rStart + rLength);
  offset = rStart + rLength;
  if (signature[offset] !== 0x02) throw new Error("Invalid ECDSA s value");
  const sLength = signature[offset + 1];
  const s = signature.slice(offset + 2, offset + 2 + sLength);
  const result = new Uint8Array(64);
  result.set(r.slice(-32), 32 - Math.min(32, r.length));
  result.set(s.slice(-32), 64 - Math.min(32, s.length));
  return result;
};

export type VapidJwt = {
  token: string;
  signingInput: string;
  signature: Uint8Array;
};

export const createVapidJwt = async (
  config: VapidConfig,
  audience: string,
  now = Date.now(),
): Promise<VapidJwt> => {
  const publicKey = base64urlToBytes(config.publicKey);
  const privateKey = base64urlToBytes(config.privateKey);
  if (publicKey.byteLength !== 65 || privateKey.byteLength !== 32) {
    throw new Error("Invalid VAPID key lengths");
  }
  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: bytesToBase64url(publicKey.slice(1, 33)),
      y: bytesToBase64url(publicKey.slice(33, 65)),
      d: bytesToBase64url(privateKey),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const encodeJson = (value: unknown) =>
    bytesToBase64url(encoder.encode(JSON.stringify(value)));
  const signingInput = `${encodeJson({ typ: "JWT", alg: "ES256" })}.${encodeJson(
    {
      aud: audience,
      exp: Math.floor(now / 1000) + 12 * 60 * 60,
      sub: config.subject,
    },
  )}`;
  const signature = derToJose(
    new Uint8Array(
      await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        key,
        encoder.encode(signingInput),
      ),
    ),
  );
  return {
    token: `${signingInput}.${bytesToBase64url(signature)}`,
    signingInput,
    signature,
  };
};
