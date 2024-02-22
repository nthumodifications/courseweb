import { NextRequest } from "next/server";
import jsdom from 'jsdom';
import { writeFile } from "fs/promises";

export const GET = async (req: NextRequest) => {
    const res = await fetch("https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?response_type=code&client_id=eeclass&redirect_uri=https%3A%2F%2Feeclass.nthu.edu.tw%2Fservice%2Foauth%2F&scope=lmsid+userid&state=&ui_locales=en-US", {
        "headers": {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "en-US,en;q=0.9",
          "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Microsoft Edge\";v=\"121\", \"Chromium\";v=\"121\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-site",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
        },
        "referrer": "https://eeclass.nthu.edu.tw/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include",
        "cache": "no-cache",
      });
    const html = await res.text();
    const dom = new jsdom.JSDOM(html);
    const doc = dom.window.document;
    //get set-cookie header
    const setCookie = res.headers.getSetCookie();
    //get PHPSESSID={value}
    const PHPSESSID = setCookie.find((cookie: string) => cookie.startsWith("PHPSESSID="))?.split(";")[0].split("=")[1];

    console.log("PHPSESSID", PHPSESSID)

    const img = doc.querySelector('img[id="captcha_image"]') as HTMLImageElement;
    const audio = doc.querySelector('source[id="captcha_image_source_wav"]') as HTMLSourceElement;
    const captcha = audio.src;
    const baseURL = "https://oauth.ccxp.nthu.edu.tw/v1.1/";
    console.log(captcha)

    //download the image captcha to file
    const imgRes = await fetch(baseURL + img.src, {
        "headers": {
            "cookie": `PHPSESSID=${PHPSESSID}`
        },
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include",
        "cache": "no-cache",
      });
    const imgBlob = await imgRes.blob();
    const imgArrayBuffer = await imgBlob.arrayBuffer();
    const imgUint8Array = new Uint8Array(imgArrayBuffer);
    await writeFile("captcha.png", imgUint8Array);

    //download the audio captcha to file
    const audioRes = await fetch(baseURL + captcha, {
        "headers": {
            "cookie": `PHPSESSID=${PHPSESSID}`
        },
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include",
        "cache": "no-cache",
      });
    const audioBlob = await audioRes.blob();
    const audioArrayBuffer = await audioBlob.arrayBuffer();
    const audioUint8Array = new Uint8Array(audioArrayBuffer);
    
    await writeFile("captcha.wav", audioUint8Array);
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    const res_final = await fetch("https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?response_type=code&client_id=eeclass&redirect_uri=https%3A%2F%2Feeclass.nthu.edu.tw%2Fservice%2Foauth%2F&scope=lmsid+userid&state=&ui_locales=en-US", {
        "headers": {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "max-age=0",
            "content-type": "application/x-www-form-urlencoded",
            "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Microsoft Edge\";v=\"121\", \"Chromium\";v=\"121\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "cookie": `PHPSESSID=${PHPSESSID}`
        },
        "referrer": "https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?response_type=code&client_id=eeclass&redirect_uri=https%3A%2F%2Feeclass.nthu.edu.tw%2Fservice%2Foauth%2F&scope=lmsid+userid&state=&ui_locales=en-US",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": "id=<studentid>&password=<password>&school=&cid=&captcha_id=40df17fb787fc36cfdc2397272c4c7e1f96863e3&captcha=2597&action=login",
        "method": "POST",
        "mode": "cors",
        "credentials": "include",
        "cache": "no-cache",
    });

    //get final redirect url
    const redirectURL = res_final.url;
    console.log(redirectURL);
    return new Response("ok");

}