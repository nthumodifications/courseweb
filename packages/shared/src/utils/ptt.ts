export type PttRating = 1 | 2 | 3 | 4 | 5;

/** Parse only the rating forms accepted by the native PTT importer contract. */
export const parsePttRating = (value: string | null): PttRating | null => {
  if (!value) return null;
  const normalized = value.trim();
  const numeric = /^(?:([1-5])\s*\/\s*5|([1-5]))$/u.exec(normalized);
  if (numeric) return Number(numeric[1] ?? numeric[2]) as PttRating;

  const filled = (normalized.match(/★/gu) ?? []).length;
  const empty = (normalized.match(/☆/gu) ?? []).length;
  const total = filled + empty;
  if (total >= 3) {
    return Math.min(
      5,
      Math.max(1, Math.round((filled / total) * 5)),
    ) as PttRating;
  }
  if (filled > 0 && empty === 0 && filled <= 5) return filled as PttRating;
  return null;
};

export const parsePttPostedAt = (value: string | null): string | null => {
  if (!value?.trim()) return null;
  const normalized = value.trim();
  const isIso = /^\d{4}-\d{2}-\d{2}T/u.test(normalized);
  const isPttDate =
    /^[A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4}$/u.test(
      normalized,
    );
  if (!isIso && !isPttDate) return null;
  const date = new Date(isIso ? normalized : `${normalized} GMT+0800`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const normalizePttUrl = (value: string | null): string | null => {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim(), "https://www.ptt.cc");
    if (url.hostname === "ptt.cc" || url.hostname === "www.ptt.cc") {
      url.protocol = "https:";
      url.hostname = "www.ptt.cc";
      url.search = "";
      url.hash = "";
      return url.toString();
    }
  } catch {
    // Keep malformed legacy values out of the de-duplication key.
  }
  return value.trim();
};
