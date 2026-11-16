import { describe, expect, test } from "bun:test";
import { base64urlToBytes, bytesToBase64url, concatBytes } from "./base64url";
import { encryptWebPushPayload } from "./encryption";
import { createVapidJwt } from "./vapid";

const RFC_SERVER_PRIVATE = "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw";
const RFC_SERVER_PUBLIC =
  "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
const RFC_RECEIVER_PUBLIC =
  "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4";
const RFC_AUTH = "BTBZMqHH6r4Tts7J_aSIgg";
const RFC_SALT = "DGv6ra1nlYgDCS1FRnbzlw";
const RFC_HEADER =
  "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
const RFC_CIPHERTEXT =
  "8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ";

test("matches RFC 8291 Appendix A byte-for-byte", async () => {
  const plaintext = new TextEncoder().encode(
    "When I grow up, I want to be a watermelon",
  );
  const encrypted = await encryptWebPushPayload(
    { p256dh: RFC_RECEIVER_PUBLIC, auth: RFC_AUTH },
    plaintext,
    {
      salt: base64urlToBytes(RFC_SALT),
      serverKeyPair: {
        privateKey: base64urlToBytes(RFC_SERVER_PRIVATE),
        publicKey: base64urlToBytes(RFC_SERVER_PUBLIC),
      },
    },
  );
  expect(bytesToBase64url(encrypted)).toBe(
    bytesToBase64url(
      concatBytes(
        base64urlToBytes(RFC_HEADER),
        base64urlToBytes(RFC_CIPHERTEXT),
      ),
    ),
  );
});

test("produces a VAPID JWT with a WebCrypto-verifiable JOSE signature", async () => {
  const pair = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const publicKey = new Uint8Array([
    4,
    ...Buffer.from(publicJwk.x!, "base64url"),
    ...Buffer.from(publicJwk.y!, "base64url"),
  ]);
  const jwt = await createVapidJwt(
    {
      publicKey: bytesToBase64url(publicKey),
      privateKey: privateJwk.d!,
      subject: "mailto:test@nthumods.com",
    },
    "https://push.example.test",
    1_700_000_000_000,
  );
  const [header, claims, encodedSignature] = jwt.token.split(".");
  expect(
    JSON.parse(new TextDecoder().decode(base64urlToBytes(header))),
  ).toEqual({
    typ: "JWT",
    alg: "ES256",
  });
  expect(
    JSON.parse(new TextDecoder().decode(base64urlToBytes(claims))),
  ).toEqual({
    aud: "https://push.example.test",
    exp: 1700043200,
    sub: "mailto:test@nthumods.com",
  });
  const verifyKey = await crypto.subtle.importKey(
    "raw",
    publicKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  expect(
    await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      verifyKey,
      base64urlToBytes(encodedSignature),
      new TextEncoder().encode(`${header}.${claims}`),
    ),
  ).toBe(true);
});
