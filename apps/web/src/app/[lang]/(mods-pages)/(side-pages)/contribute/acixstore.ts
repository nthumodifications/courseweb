const ACIXSTORE_VALUE = /^[A-Za-z0-9_-]{16,64}$/;
const ACIXSTORE_QUERY = /(?:^|[?&#])ACIXSTORE=([A-Za-z0-9_-]{16,64})(?=&|$)/;

/** Extracts a valid ACIXSTORE value from the value or URL the user pasted. */
export const extractAcixstore = (input: string): string | null => {
  const value = input.trim();
  if (ACIXSTORE_VALUE.test(value)) return value;

  return value.match(ACIXSTORE_QUERY)?.[1] ?? null;
};
