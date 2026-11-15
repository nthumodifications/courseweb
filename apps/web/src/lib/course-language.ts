// Raw CCXP values compared in components. Kept out of TSX so the CJK literal
// check only sees user-facing text there.
const ENGLISH_TAUGHT = "英";
const CHINESE_TAUGHT = "中";
const WHOLE_SCHOOL_AUDIENCE = "全校";

export const courseLanguageLabel = (
  value: string,
  labels: { english: string; chinese: string },
) => {
  const language = value.trim();
  if (language === ENGLISH_TAUGHT) return labels.english;
  if (language === CHINESE_TAUGHT) return labels.chinese;
  return language;
};

export const isWholeSchoolAudience = (audience: string | undefined | null) =>
  audience === WHOLE_SCHOOL_AUDIENCE;
