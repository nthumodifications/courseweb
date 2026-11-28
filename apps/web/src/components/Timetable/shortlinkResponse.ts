export const parseShortlinkResponse = (
  ok: boolean,
  body: string,
): string | null => {
  if (!ok) return null;

  const trimmed = body.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  } catch {
    return null;
  }

  return trimmed;
};
