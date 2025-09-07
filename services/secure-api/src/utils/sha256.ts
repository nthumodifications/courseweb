export const sha256hash = async (key: string) => {
  // Web Crypto API is available in modern browsers
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  return crypto.subtle.digest("SHA-256", data).then((hashBuffer) => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  });
};
