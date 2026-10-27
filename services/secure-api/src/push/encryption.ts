import { base64urlToBytes, bytesToBase64url, concatBytes } from "./base64url";

const encoder = new TextEncoder();
const CURVE = { name: "ECDH", namedCurve: "P-256" } as const;
const HMAC = { name: "HMAC", hash: "SHA-256" } as const;
const RECORD_SIZE = 4096;

export type PushEncryptionSubscription = {
  p256dh: string;
  auth: string;
};

export type EcdhKeyPairBytes = {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
};

export type EncryptWebPushOptions = {
  salt?: Uint8Array;
  serverKeyPair?: EcdhKeyPairBytes;
};

const assertPoint = (value: Uint8Array, name: string) => {
  if (value.byteLength !== 65 || value[0] !== 4) {
    throw new Error(`${name} must be an uncompressed P-256 point`);
  }
};

const hmac = async (keyBytes: Uint8Array, data: Uint8Array) => {
  const key = await crypto.subtle.importKey("raw", keyBytes, HMAC, false, [
    "sign",
  ]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
};

const hkdfExtract = (salt: Uint8Array, inputKeyMaterial: Uint8Array) =>
  hmac(salt, inputKeyMaterial);

const hkdfExpand = async (
  pseudorandomKey: Uint8Array,
  info: Uint8Array,
  length: number,
) => {
  const blocks: Uint8Array[] = [];
  let previous = new Uint8Array();
  for (
    let index = 1;
    blocks.reduce((total, block) => total + block.length, 0) < length;
    index += 1
  ) {
    previous = await hmac(
      pseudorandomKey,
      concatBytes(previous, info, new Uint8Array([index])),
    );
    blocks.push(previous);
  }
  return concatBytes(...blocks).slice(0, length);
};

const publicCoordinates = (publicKey: Uint8Array) => ({
  x: bytesToBase64url(publicKey.slice(1, 33)),
  y: bytesToBase64url(publicKey.slice(33, 65)),
});

const importEcdhPrivateKey = async (pair: EcdhKeyPairBytes) => {
  assertPoint(pair.publicKey, "server public key");
  if (pair.privateKey.byteLength !== 32) {
    throw new Error("server private key must be 32 bytes");
  }
  return crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      ...publicCoordinates(pair.publicKey),
      d: bytesToBase64url(pair.privateKey),
    },
    CURVE,
    false,
    ["deriveBits"],
  );
};

const generateServerKeyPair = async (): Promise<EcdhKeyPairBytes> => {
  const generated = (await crypto.subtle.generateKey(CURVE, true, [
    "deriveBits",
  ])) as CryptoKeyPair;
  const privateJwk = await crypto.subtle.exportKey("jwk", generated.privateKey);
  const publicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", generated.publicKey),
  );
  if (!privateJwk.d) throw new Error("Generated ECDH key has no private value");
  return {
    privateKey: base64urlToBytes(privateJwk.d),
    publicKey,
  };
};

export const encryptWebPushPayload = async (
  subscription: PushEncryptionSubscription,
  plaintext: Uint8Array,
  options: EncryptWebPushOptions = {},
): Promise<Uint8Array> => {
  const userAgentPublicKey = base64urlToBytes(subscription.p256dh);
  const authSecret = base64urlToBytes(subscription.auth);
  assertPoint(userAgentPublicKey, "user agent public key");
  if (authSecret.byteLength !== 16)
    throw new Error("auth secret must be 16 bytes");
  if (plaintext.byteLength + 1 + 16 > RECORD_SIZE - 86) {
    throw new Error("Web Push payload is too large");
  }

  const serverKeyPair =
    options.serverKeyPair ?? (await generateServerKeyPair());
  const serverPrivateKey = await importEcdhPrivateKey(serverKeyPair);
  const userAgentKey = await crypto.subtle.importKey(
    "raw",
    userAgentPublicKey,
    CURVE,
    false,
    [],
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: userAgentKey },
      serverPrivateKey,
      256,
    ),
  );

  const keyInfo = concatBytes(
    encoder.encode("WebPush: info"),
    new Uint8Array([0]),
    userAgentPublicKey,
    serverKeyPair.publicKey,
  );
  const prkKey = await hkdfExtract(authSecret, ecdhSecret);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);
  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(16));
  if (salt.byteLength !== 16) throw new Error("salt must be 16 bytes");
  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(
    prk,
    concatBytes(
      encoder.encode("Content-Encoding: aes128gcm"),
      new Uint8Array([0]),
    ),
    16,
  );
  const nonce = await hkdfExpand(
    prk,
    concatBytes(encoder.encode("Content-Encoding: nonce"), new Uint8Array([0])),
    12,
  );
  const contentKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, tagLength: 128 },
      contentKey,
      concatBytes(plaintext, new Uint8Array([2])),
    ),
  );
  const recordSize = new Uint8Array([0, 0, 16, 0]);
  return concatBytes(
    salt,
    recordSize,
    new Uint8Array([serverKeyPair.publicKey.byteLength]),
    serverKeyPair.publicKey,
    ciphertext,
  );
};
