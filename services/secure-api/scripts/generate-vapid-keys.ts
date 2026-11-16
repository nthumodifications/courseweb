import { bytesToBase64url } from "../src/push/base64url";

const pair = (await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
)) as CryptoKeyPair;
const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
if (!publicJwk.x || !publicJwk.y || !privateJwk.d) {
  throw new Error("Generated VAPID key did not contain EC coordinates");
}

const publicKey = new Uint8Array([
  4,
  ...Buffer.from(publicJwk.x, "base64url"),
  ...Buffer.from(publicJwk.y, "base64url"),
]);

console.log(`VAPID_PUBLIC_KEY=${bytesToBase64url(publicKey)}`);
console.log(`VAPID_PRIVATE_KEY=${privateJwk.d}`);
console.log("VAPID_SUBJECT=mailto:maintainers@nthumods.com");
