import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { parseHTML } from "linkedom/worker";
import { z } from "zod";

enum LoginError {
  IncorrectCredentials = "IncorrectCredentials",
  CaptchaError = "CaptchaError",
  Unknown = "Unknown",
}

type UserJWTDetails = {
  studentid: string;
  name_zh: string;
  name_en: string;
  department: string;
  grade: string;
  email: string;
};

type SignInToCCXPResponse = Promise<
  | {
      ACIXSTORE: string;
      passwordExpired: boolean;
      data: UserJWTDetails;
    }
  | { error: { message: string } }
>;

const app = new Hono().post(
  "/login",
  zValidator(
    "form",
    z.object({
      studentid: z.string().nonempty(),
      password: z.string().nonempty(),
    }),
  ),
  async (c) => {
    const { studentid, password } = c.req.valid("form");

    const connectionHeaders = {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "max-age=0",
      "upgrade-insecure-requests": "1",
      Referer: "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/index.php",
    };

    let startTime = Date.now();
    const ocrAndLogin: (
      _try?: number,
    ) => Promise<{ ACIXSTORE: string; passwordExpired: boolean }> = async (
      _try = 0,
    ) => {
      if (_try == 3) {
        throw new Error(LoginError.Unknown);
      }
      let tries = 0,
        pwdstr = "",
        answer = "";
      do {
        tries++;
        try {
          console.log("Fetching login page");
          const res = await fetch(
            "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/",
            {
              headers: connectionHeaders,
              body: null,
              method: "GET",
            },
          );

          const resHTML = await res.arrayBuffer().then((buffer) => {
            const decoder = new TextDecoder("big5");
            const text = decoder.decode(buffer);
            return text;
          });

          // check if title is correct "國立清華大學 -- 校務資訊系統 - "
          if (!resHTML.includes("國立清華大學 -- 校務資訊系統")) {
            console.error("Title not found");
            continue;
          }
          pwdstr = resHTML.match(
            /auth_img\.php\?pwdstr=([a-zA-Z0-9_-]+)/,
          )?.[1]!;
          if (!pwdstr) {
            console.error("pwdstr not found");
            continue;
          }
          console.log("pwdstr: ", pwdstr);
          console.log("Time taken", Date.now() - startTime);

          startTime = Date.now();
          //fetch the image and check if its a image/png
          const img = await fetch(
            `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/auth_img.php?pwdstr=${pwdstr}`,
          ).then((res) => res.blob());
          if (img.type != "image/png") {
            console.error("Image is not PNG");
            continue;
          }
          console.error("Valid PNG");

          //fetch the image from the url and send as base64
          console.log("Fetching CAPTCHA");
          answer = await fetch(
            `${process.env.NTHUMODS_OCR_BASE_URL}/?url=https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/auth_img.php?pwdstr=${pwdstr}`,
          ).then((res) => res.text());
          console.log("Time taken", Date.now() - startTime);

          if (answer.length == 6) break;
        } catch (err) {
          console.error("fetch login err", err);
          // throw new Error(LoginError.Unknown);
          continue;
        }
      } while (tries < 3);
      if (tries == 3 || answer.length != 6) {
        throw new Error("OCR Failed Utterly");
      }
      console.log("Attempt Login");
      const response = await fetch(
        "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/pre_select_entry.php",
        {
          headers: {
            ...connectionHeaders,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: `account=${encodeURIComponent(studentid)}&passwd=${encodeURIComponent(password)}&passwd2=${answer}&Submit=%B5n%A4J&fnstr=${pwdstr}`,
          method: "POST",
        },
      );

      const resHTML = await response.arrayBuffer().then((buffer) => {
        const decoder = new TextDecoder("big5");
        const text = decoder.decode(buffer);
        return text;
      });

      if (resHTML.includes("System Error!")) {
        console.error("System Error!");
        return await ocrAndLogin(_try++);
      }

      const redirectMatch = resHTML.match(
        /(select_entry\.php\?ACIXSTORE=[a-zA-Z0-9_-]+&hint=[0-9]+)/,
      );
      if (!redirectMatch) {
        console.log(resHTML);
        console.error("Redirect URL not found");
        return await ocrAndLogin(_try++);
      }
      //Check if login credentials are correct
      const newHTML = await fetch(
        "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/" + redirectMatch?.[1],
        {
          headers: connectionHeaders,
          body: null,
          method: "GET",
        },
      )
        .then((response) => response.arrayBuffer())
        .then((buffer) => {
          const decoder = new TextDecoder("big5");
          const text = decoder.decode(buffer);
          return text;
        });
      console.log("Time taken", Date.now() - startTime);
      startTime = Date.now();

      const passwordExpired = !!newHTML.match("個人密碼修改");
      if (resHTML.match("驗證碼輸入錯誤!")) {
        console.error("CAPTCHA is incorrect");
        return await ocrAndLogin(_try++);
      } else if (resHTML.match("15分鐘內登錄錯誤")) {
        console.error("too many login attempts");
        throw new Error(LoginError.CaptchaError);
      }
      //CAPTCHA IS CORRECT: check if select_entry.php is correct  (if not, then login credentials are wrong)
      else if (newHTML.match("帳號或密碼錯誤")) {
        console.error("Login credentials are incorrect");
        throw new Error(LoginError.IncorrectCredentials);
      } else if (resHTML.match(/ACIXSTORE=([a-zA-Z0-9_-]+)/)?.length == 0) {
        console.error("ACIXSTORE not found");
        return await ocrAndLogin(_try++);
      } else {
        const ACIXSTORE = resHTML.match(/ACIXSTORE=([a-zA-Z0-9_-]+)/)?.[1];
        if (!ACIXSTORE) {
          console.error("ACIXSTORE not found after login", resHTML);
          return await ocrAndLogin(_try++);
        }
        return { ACIXSTORE, passwordExpired };
      }
    };
    const result = await ocrAndLogin();

    const isExchangeStudent =
      studentid.startsWith("X") || studentid.startsWith("x");

    const data = await (async () => {
      if (!isExchangeStudent) {
        console.log("Fetching user details");
        const html = await fetch(
          `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/4/4.19/JH4j002.php?ACIXSTORE=${result.ACIXSTORE}&user_lang=`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
              Accept: "application/json",
              "Accept-Encoding": "gzip, deflate, br",
            },
            body: null,
            method: "GET",
          },
        )
          .then((res) => res.arrayBuffer())
          .then((arrayBuffer) =>
            new TextDecoder("big5").decode(new Uint8Array(arrayBuffer)),
          );
        const { document: doc } = parseHTML(html, "text/html");

        const form = doc.querySelector('form[name="register"]');
        if (form == null) {
          throw new Error(LoginError.Unknown);
        }

        console.log("Time taken", Date.now() - startTime);
        startTime = Date.now();

        const firstRow = form.querySelector("tr:nth-child(1)")!;
        const secondRow = form.querySelector("tr:nth-child(2)")!;

        const data = {
          studentid:
            firstRow
              .querySelector(".class3:nth-child(2)")
              ?.textContent?.trim() ?? "",
          name_zh:
            firstRow
              .querySelector(".class3:nth-child(4)")
              ?.textContent?.trim() ?? "",
          name_en:
            firstRow
              .querySelector(".class3:nth-child(6)")
              ?.textContent?.trim() ?? "",
          department:
            secondRow
              .querySelector(".class3:nth-child(2)")
              ?.textContent?.trim() ?? "",
          grade:
            secondRow
              .querySelector(".class3:nth-child(4)")
              ?.textContent?.trim() ?? "",
          email:
            form.querySelector('input[name="email"]')?.getAttribute("value") ??
            "",
        } as UserJWTDetails;

        if (
          form
            .querySelector('input[name="ACIXSTORE"]')
            ?.getAttribute("value") != result.ACIXSTORE
        ) {
          throw new Error(LoginError.Unknown);
        }
        return { ...result, data };
      } else {
        // Exchange students don't have details page, so we just fill the data with blanks
        const data = {
          studentid: studentid,
          name_zh: "交換生",
          name_en: "Exchange Student",
          department: "Have fun!",
          grade: "9",
          email: "-",
        } as UserJWTDetails;
        return { ...result, data };
      }
    })();

    return c.json(data);
  },
);

export default app;
