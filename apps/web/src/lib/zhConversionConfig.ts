export type TextConverter = (value: string) => string;

export const PROTECTED_PHRASES = [
  "國立清華大學",
  "校務資訊系統",
  "核心團隊",
  "簡報室",
  "詳細資料",
  "申請資料",
  "資訊島",
  "NTHUMods",
  "清華",
  "清大",
  "校車",
  "行程",
  "程序",
  "複製",
  "啟用",
  "登出",
  "離線",
  "查詢",
].sort((left, right) => right.length - left.length);

// These are site-specific wording fixes, kept separate from OpenCC's
// character conversion so API/proper-name data can use the character-only
// converter below.
export const POST_PHRASE_OVERRIDES = {
  透過: "通過",
} as const;

export const createAuthoredTextConverter = (
  phraseConverter: TextConverter,
  characterConverter: TextConverter,
): TextConverter => {
  const protectPhrases = (value: string) => {
    const replacements: Array<[string, string]> = [];
    let protectedValue = value;

    PROTECTED_PHRASES.forEach((phrase, index) => {
      const token = `__NTHUMODS_PROTECTED_${index}__`;
      if (!protectedValue.includes(phrase)) return;
      protectedValue = protectedValue.split(phrase).join(token);
      replacements.push([token, characterConverter(phrase)]);
    });

    return [protectedValue, replacements] as const;
  };

  return (value) => {
    const [protectedValue, replacements] = protectPhrases(value);
    const phraseConverted = phraseConverter(protectedValue);
    const overridden = Object.entries(POST_PHRASE_OVERRIDES).reduce(
      (result, [taiwanPhrase, mainlandPhrase]) =>
        result
          .split(taiwanPhrase)
          .join(mainlandPhrase)
          .split(characterConverter(taiwanPhrase))
          .join(mainlandPhrase),
      phraseConverted,
    );
    const converted = characterConverter(overridden).replaceAll(
      "繁体中文",
      "繁體中文",
    );
    return replacements.reduce(
      (result, [token, phrase]) => result.split(token).join(phrase),
      converted,
    );
  };
};
