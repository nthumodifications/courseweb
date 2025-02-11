"use server";
import { decrypt } from "@/lib/headless_ais";
import { parseHTML } from "linkedom";

type EEClassOauthReturn = {
  url: string;
};

export const signInEeclassOauth = async (
  studentid: string,
  encryptedPassword: string,
) => {
  try {
    const password = await decrypt(encryptedPassword);

    const oauthLogin = async (_try = 0): Promise<EEClassOauthReturn> => {
      if (_try == 3) {
        throw new Error(
          "登入出錯，但不知道爲什麽 :( Something wrong, idk why.",
        );
      }

      let tries = 0,
        captchaUrl = "",
        captcha = "",
        PHPSESSID = "";
      do {
        const res = await fetch(
          `https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?response_type=code&client_id=eeclass&redirect_uri=https%3A%2F%2Feeclass.nthu.edu.tw%2Fservice%2Foauth%2F&scope=lmsid+userid&state=&ui_locales=en-US`,
          {
            headers: {
              accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
              "accept-language": "en-US,en;q=0.9",
              "sec-ch-ua":
                '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
              "sec-ch-ua-mobile": "?0",
              "sec-ch-ua-platform": '"Windows"',
              "sec-fetch-dest": "document",
              "sec-fetch-mode": "navigate",
              "sec-fetch-site": "same-site",
              "sec-fetch-user": "?1",
              "upgrade-insecure-requests": "1",
            },
            referrer: `https://eeclass.nthu.edu.tw/`,
            referrerPolicy: "strict-origin-when-cross-origin",
            body: null,
            method: "GET",
            mode: "cors",
            credentials: "same-origin",
            cache: "no-cache",
          },
        );

        const html = await res.arrayBuffer().then((buffer) => {
          const decoder = new TextDecoder("big5");
          const text = decoder.decode(buffer);
          return text;
        });
        const { document: doc } = parseHTML(html, "text/html");
        const setCookie = res.headers.getSetCookie();

        PHPSESSID = setCookie
          .find((cookie: string) => cookie.startsWith("PHPSESSID="))
          ?.split(";")[0]
          .split("=")[1] as string;

        const audio = doc.querySelector(
          'source[id="captcha_image_source_wav"]',
        ) as HTMLSourceElement;
        captchaUrl = audio.src;

        captcha = await (
          await fetch(
            `https://sr.nthumods.com/?url=${"https://oauth.ccxp.nthu.edu.tw/v1.1/" + captchaUrl}&id=${PHPSESSID}`,
          )
        ).text();
        if (captcha.length == 4) break;
      } while (tries <= 5);

      process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
      const resLogin = await fetch(
        `https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?response_type=code&client_id=eeclass&redirect_uri=https%3A%2F%2Feeclass.nthu.edu.tw%2Fservice%2Foauth%2F&scope=lmsid+userid&state=&ui_locales=en-US`,
        {
          headers: {
            accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "max-age=0",
            "content-type": "application/x-www-form-urlencoded",
            "sec-ch-ua":
              '"NotA(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            cookie: `PHPSESSID=${PHPSESSID}`,
          },
          keepalive: true,
          redirect: "manual",
          referrer: `https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?response_type=code&client_id=eeclass&redirect_uri=https%3A%2F%2Feeclass.nthu.edu.tw%2Fservice%2Foauth%2F&scope=lmsid+userid&state=&ui_locales=en-US`,
          referrerPolicy: "strict-origin-when-cross-origin",
          body: `id=${studentid}&password=${password}&school=&cid=&captcha_id=${captchaUrl.substring("captchaplay.php?id=".length)}&captcha=${captcha}&action=login`,
          method: "POST",
          mode: "cors",
          credentials: "same-origin",
          cache: "no-cache",
        },
      );

      const resLoginHTML = await resLogin.text();
      if (resLoginHTML.match("Wrong captcha")) {
        return await oauthLogin(_try++);
      } else if (resLoginHTML.match("Incorrect account or password")) {
        throw new Error("帳號或密碼錯誤 Incorrect Login Credentials");
      } else if (
        !resLogin.headers.has("Location") ||
        !resLogin.headers.get("Location")?.includes("service/oauth")
      ) {
        throw new Error("未知錯誤 Unknown Login Error");
      }
      return {
        url: resLogin.headers.get("Location") as string,
      };
    };
    return await oauthLogin();
  } catch (error) {
    console.error(error);
    if (error instanceof Error) return { error: { message: error.message } };
    return { error: { message: "Unknown Error" } };
  }
};

type ELearnOauthReturn = {
  cookie: string;
  MoodleSessionM35: string;
};
