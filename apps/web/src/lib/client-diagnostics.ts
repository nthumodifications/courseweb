export const CLIENT_ERROR_NAMES = [
  "TypeError",
  "ReferenceError",
  "RangeError",
  "SyntaxError",
  "ChunkLoadError",
  "NetworkError",
  "AbortError",
  "Other",
] as const;

export type ClientErrorName = (typeof CLIENT_ERROR_NAMES)[number];

export const MAX_CLIENT_ERROR_NAMES = CLIENT_ERROR_NAMES.length;
export const MAX_DIAGNOSTIC_TEXT_LENGTH = 160;

let clientErrorCount = 0;
const clientErrorNames = new Set<ClientErrorName>();

const getErrorName = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" ? name : undefined;
  }
  return undefined;
};

export const normalizeClientErrorName = (value: unknown): ClientErrorName => {
  const name = getErrorName(value);
  return CLIENT_ERROR_NAMES.includes(name as ClientErrorName)
    ? (name as ClientErrorName)
    : "Other";
};

export const recordClientError = (value: unknown) => {
  clientErrorCount += 1;
  clientErrorNames.add(normalizeClientErrorName(value));
};

export const getClientErrorDiagnostics = () => ({
  count: clientErrorCount,
  names: [...clientErrorNames].slice(0, MAX_CLIENT_ERROR_NAMES),
});

export const sanitizeDiagnosticText = (value: string) =>
  value
    .replaceAll("`", "'")
    .replaceAll("@", "[at]")
    .slice(0, MAX_DIAGNOSTIC_TEXT_LENGTH);
