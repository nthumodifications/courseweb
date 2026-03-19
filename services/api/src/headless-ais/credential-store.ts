/**
 * Server-side credential storage with AES-256-GCM encryption.
 * Passwords are encrypted before storage in D1 and never returned in plaintext.
 */
import { PrismaClient } from "../generated/client";

const EXPIRY_DAYS = 30;
const CURRENT_KEY_VERSION = 1;

function validateHex(hex: string, label: string): Uint8Array {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`Invalid hex value for ${label}`);
  }
  return new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
}

function keyFromHex(hex: string): Promise<CryptoKey> {
  const raw = validateHex(hex, "encryption key");
  if (raw.length !== 32) {
    throw new Error("Encryption key must be 32 bytes (64 hex chars)");
  }
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptPassword(
  password: string,
  keyHex: string,
): Promise<{ encrypted: string; iv: string; authTag: string }> {
  const key = await keyFromHex(keyHex);
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
  keyHex: string,
): Promise<string> {
  const key = await keyFromHex(keyHex);
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
  keyHex: string,
): Promise<string> {
  const { encrypted, iv, authTag } = await encryptPassword(password, keyHex);
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const record = await prisma.proxyCredential.upsert({
    where: { studentId },
    create: {
      studentId,
      encryptedPassword: encrypted,
      iv,
      authTag,
      keyVersion: CURRENT_KEY_VERSION,
      expiresAt,
    },
    update: {
      encryptedPassword: encrypted,
      iv,
      authTag,
      keyVersion: CURRENT_KEY_VERSION,
      expiresAt,
    },
  });

  return record.id;
}

export async function retrieveCredential(
  prisma: PrismaClient,
  credentialToken: string,
  keyHex: string,
): Promise<{ studentId: string; password: string } | null> {
  const record = await prisma.proxyCredential.findUnique({
    where: { id: credentialToken },
  });

  if (!record || record.expiresAt < new Date()) {
    // Clean up expired record if found
    if (record) {
      await prisma.proxyCredential.delete({ where: { id: credentialToken } });
    }
    return null;
  }

  if (record.keyVersion !== CURRENT_KEY_VERSION) {
    // Record was encrypted with an old key — cannot decrypt
    return null;
  }

  const password = await decryptPassword(
    record.encryptedPassword,
    record.iv,
    record.authTag,
    keyHex,
  );

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
