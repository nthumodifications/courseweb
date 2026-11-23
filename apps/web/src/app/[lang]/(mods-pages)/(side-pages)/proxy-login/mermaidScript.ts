/**
 * Mermaid is only used to draw the two diagrams on this page, so it is loaded
 * from a CDN rather than bundled. That makes the CDN part of what runs on our
 * origin, so the load is tied to one exact file:
 *
 * - the version is pinned, so a new or tampered release is never picked up;
 * - `integrity` makes the browser refuse the file unless it matches this hash.
 *
 * To upgrade, change the version and replace the hash with
 * `openssl dgst -sha384 -binary mermaid.min.js | openssl base64 -A`
 * computed over that release's `dist/mermaid.min.js`.
 */
const MERMAID_VERSION = "11.17.2";
const MERMAID_SRC = `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js`;
const MERMAID_INTEGRITY =
  "sha384-EOXBFmc3gx5mb+vn0vPvvGqACToJD24hhacX5Yx+8NUUQrHIle/Qi5Bg9o3zKwW2";

export const appendMermaidScript = (
  doc: Document,
  onLoad: () => void,
): HTMLScriptElement => {
  const script = doc.createElement("script");
  script.src = MERMAID_SRC;
  script.integrity = MERMAID_INTEGRITY;
  script.crossOrigin = "anonymous";
  script.onload = onLoad;
  doc.body.appendChild(script);
  return script;
};
