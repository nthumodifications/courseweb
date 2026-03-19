/**
 * Server-side credential storage with AES-256-GCM encryption.
 *
 * Key rotation is automatic via HKDF key derivation:
 * - NTHU_HEADLESS_AIS_ENCRYPTION_KEY is a master key (set once, never rotated)
 * - Actual encryption keys are derived: HKDF(masterKey, "nthumods-proxy-v{version}")
 * - Version = floor(daysSinceEpoch / 90) — auto-increments every 90 days
 * - Credentials expire after 30 days, so max version gap for valid records is 1
 * - On retrieval, old-version records are lazily re-encrypted with the current key
 */
import { PrismaClient } from "../generated/client";

const EXPIRY_DAYS = 30;
const ROTATION_PERIOD_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Deterministic version number based on current time. Increments every 90 days. */
export function getCurrentKeyVersion(): number {
  return Math.floor(Date.now() / (ROTATION_PERIOD_DAYS * MS_PER_DAY));
}

function validateHex(hex: string, label: string): Uint8Array {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`Invalid hex value for ${label}`);
  }
  return new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
}

/**
 * Derive a versioned AES-256-GCM key from the master key using HKDF.
 * Same master key + same version = same derived key (deterministic).
 */
async function deriveKey(
  masterHex: string,
  version: number,
): Promise<CryptoKey> {
  const masterBytes = validateHex(masterHex, "master key");
  if (masterBytes.length !== 32) {
    throw new Error("Master key must be 32 bytes (64 hex chars)");
  }

  const masterKey = await crypto.subtle.importKey(
    "raw",
    masterBytes,
    "HKDF",
    false,
    ["deriveKey"],
  );

  const salt = new TextEncoder().encode(`nthumods-proxy-v${version}`);
  const info = new TextEncoder().encode("aes-gcm-credential-key");

  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info },
    masterKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPassword(
  password: string,
  masterHex: string,
  version: number,
): Promise<{ encrypted: string; iv: string; authTag: string }> {
  const key = await deriveKey(masterHex, version);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(password);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  const cipherBytes = new Uint8Array(cipherBuffer);
  const ciphertext = cipherBytes.slice(0, -16);
  const authTag = cipherBytes.slice(-16);

  return {
    encrypted: Buffer.from(ciphertext).toString("hex"),
    iv: Buffer.from(iv).toString("hex"),
    authTag: Buffer.from(authTag).toString("hex"),
  };
}

export async function decryptPassword(
  encrypted: string,
  iv: string,
  authTag: string,
  masterHex: string,
  version: number,
): Promise<string> {
  const key = await deriveKey(masterHex, version);
  const ivBytes = validateHex(iv, "IV");
  const cipherBytes = validateHex(encrypted, "ciphertext");
  const authTagBytes = validateHex(authTag, "auth tag");

  const combined = new Uint8Array(cipherBytes.length + authTagBytes.length);
  combined.set(cipherBytes);
  combined.set(authTagBytes, cipherBytes.length);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    combined,
  );

  return new TextDecoder().decode(plainBuffer);
}

export async function storeCredential(
  prisma: PrismaClient,
  studentId: string,
  password: string,
  masterHex: string,
): Promise<string> {
  const version = getCurrentKeyVersion();
  const { encrypted, iv, authTag } = await encryptPassword(
    password,
    masterHex,
    version,
  );
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * MS_PER_DAY);

  const record = await prisma.proxyCredential.upsert({
    where: { studentId },
    create: {
      studentId,
      encryptedPassword: encrypted,
      iv,
      authTag,
      keyVersion: version,
      expiresAt,
    },
    update: {
      encryptedPassword: encrypted,
      iv,
      authTag,
      keyVersion: version,
      expiresAt,
    },
  });

  return record.id;
}

export async function retrieveCredential(
  prisma: PrismaClient,
  credentialToken: string,
  masterHex: string,
): Promise<{ studentId: string; password: string } | null> {
  const record = await prisma.proxyCredential.findUnique({
    where: { id: credentialToken },
  });

  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.proxyCredential.delete({ where: { id: credentialToken } });
    }
    return null;
  }

  // Decrypt with the version the record was encrypted with
  const password = await decryptPassword(
    record.encryptedPassword,
    record.iv,
    record.authTag,
    masterHex,
    record.keyVersion,
  );

  // Lazy re-encryption: if stored with an old key version, re-encrypt with current
  const currentVersion = getCurrentKeyVersion();
  if (record.keyVersion < currentVersion) {
    const { encrypted, iv, authTag } = await encryptPassword(
      password,
      masterHex,
      currentVersion,
    );
    await prisma.proxyCredential.update({
      where: { id: credentialToken },
      data: {
        encryptedPassword: encrypted,
        iv,
        authTag,
        keyVersion: currentVersion,
      },
    });
  }

  return { studentId: record.studentId, password };
}

export async function revokeCredential(
  prisma: PrismaClient,
  credentialToken: string,
): Promise<void> {
  await prisma.proxyCredential.deleteMany({
    where: { id: credentialToken },
  });
}

/** Purge all expired credential records from the database. */
export async function cleanupExpired(prisma: PrismaClient): Promise<number> {
  const result = await prisma.proxyCredential.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
