import {
  base64urlToBytes,
  bytesToBase64url,
} from "../push/base64url";

export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

const invalidConfiguration = (): undefined => {
  console.error("Invalid VAPID configuration; push disabled");
  return undefined;
};

const validSubject = (subject: string) => {
  if (!subject.startsWith("mailto:") && !subject.startsWith("https:")) {
    return false;
  }
  try {
    const parsed = new URL(subject);
    return (
      (parsed.protocol === "mailto:" || parsed.protocol === "https:") &&
      !/\s/.test(subject) &&
      Boolean(parsed.pathname || parsed.hostname)
    );
  } catch {
    return false;
  }
};

export const readVapidConfig = async (
  values: Record<string, string | undefined> = process.env,
): Promise<VapidConfig | undefined> => {
  const publicKey = values["VAPID_PUBLIC_KEY"]?.trim();
  const privateKey = values["VAPID_PRIVATE_KEY"]?.trim();
  const subject = values["VAPID_SUBJECT"]?.trim();
  if (!publicKey || !privateKey || !subject) return undefined;

  try {
    const publicBytes = base64urlToBytes(publicKey);
    const privateBytes = base64urlToBytes(privateKey);
    if (publicBytes.byteLength !== 65 || publicBytes[0] !== 4) {
      return invalidConfiguration();
    }
    if (privateBytes.byteLength !== 32 || !validSubject(subject)) {
      return invalidConfiguration();
    }
    const jwk = {
      kty: "EC" as const,
      crv: "P-256" as const,
      x: bytesToBase64url(publicBytes.slice(1, 33)),
      y: bytesToBase64url(publicBytes.slice(33, 65)),
      d: bytesToBase64url(privateBytes),
    };
    const privateCryptoKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
    const publicCryptoKey = await crypto.subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const challenge = new TextEncoder().encode("nthumods-vapid-config-check");
    const signature = new Uint8Array(
      await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        privateCryptoKey,
        challenge,
      ),
    );
    if (
      !(await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        publicCryptoKey,
        signature,
        challenge,
      ))
    ) {
      return invalidConfiguration();
    }
  } catch {
    return invalidConfiguration();
  }

  return { publicKey, privateKey, subject };
};

const loadedVapidConfig = await readVapidConfig();

export const getVapidConfig = () => loadedVapidConfig;
