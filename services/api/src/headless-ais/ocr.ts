/**
 * OCR client for solving CCXP CAPTCHA images.
 * Calls the external OCR service to get a 6-character answer.
 */
export async function solveCaptcha(
  ocrBaseUrl: string,
  pwdstr: string,
  maxAttempts = 3,
): Promise<string | null> {
  const captchaUrl = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/auth_img.php?pwdstr=${pwdstr}`;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const img = await fetch(captchaUrl).then((res) => res.blob());
      if (img.type !== "image/png") {
        console.error("OCR: CAPTCHA image is not PNG, retrying");
        continue;
      }

      const answer = await fetch(
        `${ocrBaseUrl}/?url=${encodeURIComponent(captchaUrl)}`,
      ).then((res) => res.text());

      const trimmed = answer.trim();
      if (trimmed.length === 6) return trimmed;
      console.error(
        `OCR: Got invalid answer length ${answer.length}, retrying`,
      );
    } catch (err) {
      console.error("OCR: fetch error", err);
    }
  }

  return null;
}
