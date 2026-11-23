import { z } from "zod";

/**
 * URL rules for OAuth client registration.
 *
 * `z.string().url()` accepts anything `new URL()` can parse, which includes
 * `javascript:` and `data:`. These values are rendered as links on the consent
 * screen, so a script URL registered here would run on the auth origin when a
 * user clicks it.
 */

const protocolOf = (value: string) => {
  try {
    return new URL(value).protocol.toLowerCase();
  } catch {
    return null;
  }
};

/** Schemes a browser will execute or read locally when followed as a link. */
const UNSAFE_REDIRECT_PROTOCOLS = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
]);

/** A client's homepage: a normal web address and nothing else. */
export const clientUriSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const protocol = protocolOf(value);
    return protocol === "https:" || protocol === "http:";
  }, "Must be an http(s) URL");

/**
 * A redirect or post-logout URI. Native apps register their own schemes
 * (`com.example.app:/callback`), so this cannot be limited to http(s); it
 * refuses the schemes that are never a legitimate redirect target instead.
 */
export const redirectUriSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const protocol = protocolOf(value);
    return protocol !== null && !UNSAFE_REDIRECT_PROTOCOLS.has(protocol);
  }, "This URL scheme cannot be used as a redirect URI");
