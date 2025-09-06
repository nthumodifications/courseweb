/**
 * Helper function to base64url-encode an ArrayBuffer.
 */
function base64UrlEncode(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function generateAtHash(accessToken: string) {
  // Compute SHA-256 hash of the access token
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(accessToken),
  );

  // Take the left-most half of the hash (first 16 bytes)
  const leftHalfBuffer = hashBuffer.slice(0, hashBuffer.byteLength / 2);

  // Base64url-encode the left half
  return base64UrlEncode(leftHalfBuffer);
}
