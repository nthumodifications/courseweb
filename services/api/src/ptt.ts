export const parsePttPostedAt = (value: string | null): string | null => {
  if (!value?.trim()) return null;
  const normalized = value.trim();
  const isIso = /^\d{4}-\d{2}-\d{2}T/u.test(normalized);
  const isPttDate =
    /^[A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4}$/u.test(
      normalized,
    );
  if (!isIso && !isPttDate) return null;
  const parsed = new Date(isIso ? normalized : `${normalized} GMT+0800`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
