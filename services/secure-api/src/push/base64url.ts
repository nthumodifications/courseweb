export const bytesToBase64url = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("base64url");

export const base64urlToBytes = (value: string): Uint8Array => {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new Error("Invalid base64url value");
  }
  return new Uint8Array(Buffer.from(value, "base64url"));
};

export const concatBytes = (...parts: Uint8Array[]): Uint8Array => {
  const result = new Uint8Array(
    parts.reduce((total, part) => total + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
};
