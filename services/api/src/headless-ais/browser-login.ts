/**
 * Puppeteer-based CCXP login to bypass bot protection.
 * This is the only module that touches student passwords and browser sessions.
 */
import puppeteer from "@cloudflare/puppeteer";
import { parseHTML } from "linkedom/worker";
import { solveCaptcha } from "./ocr";
import type { Fetcher } from "@cloudflare/workers-types";

export type UserJWTDetails = {
  studentid: string;
  name_zh: string;
  name_en: string;
  department: string;
  grade: string;
  email: string;
};

export type LoginResult = {
  ACIXSTORE: string;
  passwordExpired: boolean;
  data: UserJWTDetails;
};

export type LoginError =
  | "IncorrectCredentials"
  | "CaptchaError"
  | "Unknown"
  | "OCRFailed";

export class CCXPLoginError extends Error {
  constructor(public code: LoginError) {
    super(code);
  }
}

const CCXP_LOGIN_URL = "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/";

async function attemptLogin(
  browserBinding: Fetcher,
  ocrBaseUrl: string,
  studentid: string,
  password: string,
  retries = 0,
): Promise<{ ACIXSTORE: string; passwordExpired: boolean }> {
  if (retries >= 3) throw new CCXPLoginError("Unknown");

  const browser = await puppeteer.launch(browserBinding as any);
  const page = await browser.newPage();

  try {
    await page.goto(CCXP_LOGIN_URL, { waitUntil: "domcontentloaded" });

    const pageContent: string = await page.evaluate(
      () => document.documentElement.innerHTML,
    );

    if (!pageContent.includes("國立清華大學 -- 校務資訊系統")) {
      console.error("browser-login: login page title not found");
      return attemptLogin(
        browserBinding,
        ocrBaseUrl,
        studentid,
        password,
        retries + 1,
      );
    }

    const pwdstr = pageContent.match(
      /auth_img\.php\?pwdstr=([a-zA-Z0-9_-]+)/,
    )?.[1];
    if (!pwdstr) {
      console.error("browser-login: pwdstr not found");
      return attemptLogin(
        browserBinding,
        ocrBaseUrl,
        studentid,
        password,
        retries + 1,
      );
    }

    const answer = await solveCaptcha(ocrBaseUrl, pwdstr);
    if (!answer) throw new CCXPLoginError("OCRFailed");

    // Fill and submit form
    const postResult: string = await page.evaluate(
      async (data: {
        studentid: string;
        password: string;
        answer: string;
        pwdstr: string;
      }) => {
        const formData = new URLSearchParams({
          account: data.studentid,
          passwd: data.password,
          passwd2: data.answer,
          Submit: "登入",
          fnstr: data.pwdstr,
        });
        const res = await fetch(
          "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/pre_select_entry.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
          },
        );
        const buffer = await res.arrayBuffer();
        const decoder = new TextDecoder("big5");
        return decoder.decode(buffer);
      },
      { studentid, password, answer, pwdstr },
    );

    if (postResult.includes("驗證碼輸入錯誤!")) {
      console.error("browser-login: CAPTCHA incorrect");
      return attemptLogin(
        browserBinding,
        ocrBaseUrl,
        studentid,
        password,
        retries + 1,
      );
    }
    if (postResult.includes("15分鐘內登錄錯誤")) {
      throw new CCXPLoginError("CaptchaError");
    }
    if (postResult.includes("System Error!")) {
      return attemptLogin(
        browserBinding,
        ocrBaseUrl,
        studentid,
        password,
        retries + 1,
      );
    }

    const redirectMatch = postResult.match(
      /(select_entry\.php\?ACIXSTORE=[a-zA-Z0-9_-]+&hint=[0-9]+)/,
    );
    if (!redirectMatch) {
      console.error("browser-login: redirect URL not found");
      return attemptLogin(
        browserBinding,
        ocrBaseUrl,
        studentid,
        password,
        retries + 1,
      );
    }

    // Verify credentials by fetching select_entry page
    const verifyHtml: string = await page.evaluate(async (url: string) => {
      const res = await fetch(
        "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/" + url,
      );
      const buffer = await res.arrayBuffer();
      const decoder = new TextDecoder("big5");
      return decoder.decode(buffer);
    }, redirectMatch[1]);

    if (verifyHtml.includes("帳號或密碼錯誤")) {
      throw new CCXPLoginError("IncorrectCredentials");
    }

    const ACIXSTORE = postResult.match(/ACIXSTORE=([a-zA-Z0-9_-]+)/)?.[1];
    if (!ACIXSTORE) {
      return attemptLogin(
        browserBinding,
        ocrBaseUrl,
        studentid,
        password,
        retries + 1,
      );
    }

    const passwordExpired = verifyHtml.includes("個人密碼修改");
    return { ACIXSTORE, passwordExpired };
  } finally {
    await page.close();
    await browser.close();
  }
}

export async function loginToCCXP(
  browserBinding: Fetcher,
  ocrBaseUrl: string,
  studentid: string,
  password: string,
): Promise<LoginResult> {
  const { ACIXSTORE, passwordExpired } = await attemptLogin(
    browserBinding,
    ocrBaseUrl,
    studentid,
    password,
  );

  const isExchangeStudent =
    studentid.startsWith("X") || studentid.startsWith("x");

  if (isExchangeStudent) {
    return {
      ACIXSTORE,
      passwordExpired,
      data: {
        studentid,
        name_zh: "交換生",
        name_en: "Exchange Student",
        department: "Have fun!",
        grade: "9",
        email: "-",
      },
    };
  }

  const profileHtml = await fetch(
    `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/4/4.19/JH4j002.php?ACIXSTORE=${ACIXSTORE}&user_lang=`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
      },
    },
  )
    .then((res) => res.arrayBuffer())
    .then((buf) => new TextDecoder("big5").decode(new Uint8Array(buf)));

  const { document: doc } = parseHTML(profileHtml, "text/html");
  const form = doc.querySelector('form[name="register"]');
  if (!form) throw new CCXPLoginError("Unknown");

  const firstRow = form.querySelector("tr:nth-child(1)")!;
  const secondRow = form.querySelector("tr:nth-child(2)")!;

  return {
    ACIXSTORE,
    passwordExpired,
    data: {
      studentid:
        firstRow.querySelector(".class3:nth-child(2)")?.textContent?.trim() ??
        "",
      name_zh:
        firstRow.querySelector(".class3:nth-child(4)")?.textContent?.trim() ??
        "",
      name_en:
        firstRow.querySelector(".class3:nth-child(6)")?.textContent?.trim() ??
        "",
      department:
        secondRow.querySelector(".class3:nth-child(2)")?.textContent?.trim() ??
        "",
      grade:
        secondRow.querySelector(".class3:nth-child(4)")?.textContent?.trim() ??
        "",
      email:
        form.querySelector('input[name="email"]')?.getAttribute("value") ?? "",
    },
  };
}
