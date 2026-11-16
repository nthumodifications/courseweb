export const safeExternalUrl = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
};
