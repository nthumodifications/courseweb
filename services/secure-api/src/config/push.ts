import { base64urlToBytes } from "../push/base64url";

export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export const readVapidConfig = (
  values: Record<string, string | undefined> = process.env,
): VapidConfig | undefined => {
  const publicKey = values["VAPID_PUBLIC_KEY"]?.trim();
  const privateKey = values["VAPID_PRIVATE_KEY"]?.trim();
  const subject = values["VAPID_SUBJECT"]?.trim();
  if (!publicKey || !privateKey || !subject) return undefined;

  try {
    if (base64urlToBytes(publicKey).byteLength !== 65) return undefined;
    if (base64urlToBytes(privateKey).byteLength !== 32) return undefined;
  } catch {
    return undefined;
  }

  return { publicKey, privateKey, subject };
};

export const getVapidConfig = () => readVapidConfig();
