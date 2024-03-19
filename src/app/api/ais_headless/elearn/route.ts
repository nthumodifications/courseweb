// Due to the problem of running puppeteer package on AWS server, the e-learn platform supports had been temporarily shut down.

/*
import {NextRequest, NextResponse} from "next/server";
import puppeteer from "puppeteer";
import jsdom from "jsdom";
import {LoginError} from "@/types/headless_ais";

export const POST = async (req: NextRequest) => {
    const form = await req.formData();
    const studentid = form.get('studentid');
    const password = form.get('password');

    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.goto("https://elearn.nthu.edu.tw/login/index.php", {waitUntil: "domcontentloaded"})

    const loginElement = await page.waitForSelector("::-p-xpath(/html/body/div[4]/header/div[1]/div/div[2]/form/a)")
    const loginUrl = await loginElement?.getProperty("href").then((href) => href.toString().substring(9))
    if (loginUrl === undefined) {
        return new Response("undefined")
    }

    const cookieMap = new Map(await page.cookies("https://elearn.nthu.edu.tw/login/index.php").then((cookies) => cookies.map((cookie) => [cookie.name, cookie.value])))
    const cookies = Array.from(cookieMap).map(([key, value]) => `${key}=${value}`).join(";")
    const SESSKEY = loginUrl.substring(loginUrl.length-10)

    await browser.close()
    await fetch(loginUrl as string, {
        "headers": {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*\/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9",
            "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Microsoft Edge\";v=\"121\", \"Chromium\";v=\"121\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-site",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "cookie": cookies
        },
        "referrer": `https://elearn.nthu.edu.tw/`,
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "same-origin",
        "cache": "no-cache",
    });
    const oauthLogin: (_try?:number) => Promise<NextResponse> = async (_try = 0) => {
        if(_try == 3) {
            return NextResponse.json({ success: false, body: { error: "登入出錯，但不知道爲什麽 :( Something wrong, idk why.", code: LoginError.Unknown }});
        }

        const res = await fetch(`
https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?client_id=elearn&response_type=code&redirect_uri=https%3A%2F%2Felearn.nthu.edu.tw%2Fadmin%2Foauth2callback.php&state=%2Fauth%2Foauth2%2Flogin.php%3Fwantsurl%3Dhttps%253A%252F%252Felearn.nthu.edu.tw%252F%26sesskey%3D${SESSKEY}%26id%3D5&scope=userid+name+email+lmsid&ui_locales=en-US`, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*\/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
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
            "referrer": `https://elearn.nthu.edu.tw/`,
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "same-origin",
            "cache": "no-cache",
        });

        const PHPSESSID = res.headers.getSetCookie().find((cookie: string) => cookie.startsWith("PHPSESSID="))?.split(";")[0].split("=")[1] as string

        const html = await res.text();
        const dom = new jsdom.JSDOM(html);
        const doc = dom.window.document;

        const audio = doc.querySelector('source[id="captcha_image_source_wav"]') as HTMLSourceElement;
        const captchaUrl = audio.src

        const captcha = await (await fetch(`https://sr.nthumods.com/?url=${'https://oauth.ccxp.nthu.edu.tw/v1.1/' + captchaUrl}&id=${PHPSESSID}`)).text()

        const resLogin = await fetch(`https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?client_id=elearn&response_type=code&redirect_uri=https%3A%2F%2Felearn.nthu.edu.tw%2Fadmin%2Foauth2callback.php&state=%2Fauth%2Foauth2%2Flogin.php%3Fwantsurl%3Dhttps%253A%252F%252Felearn.nthu.edu.tw%252F%26sesskey%3D${SESSKEY}%26id%3D5&scope=userid+name+email+lmsid&ui_locales=en-US`, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*\/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                "sec-ch-ua": "\"NotA(Brand\";v=\"99\", \"Microsoft Edge\";v=\"121\", \"Chromium\";v=\"121\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                "cookie": `PHPSESSID=${PHPSESSID}`
            },
            "keepalive": true,
            "redirect": "manual",
            "referrer": `https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?client_id=elearn&response_type=code&redirect_uri=https%3A%2F%2Felearn.nthu.edu.tw%2Fadmin%2Foauth2callback.php&state=%2Fauth%2Foauth2%2Flogin.php%3Fwantsurl%3Dhttps%253A%252F%252Felearn.nthu.edu.tw%252F%26sesskey%3D${SESSKEY}%26id%3D5&scope=userid+name+email+lmsid&ui_locales=en-US`,
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": `id=${studentid}&password=${password}&school=&cid=&captcha_id=${captchaUrl.substring('captchaplay.php?id='.length)}&captcha=${captcha}&action=login`,
            "method": "POST",
            "mode": "cors",
            "credentials": "same-origin",
            "cache": "no-cache",
        });

        const resLoginHTML = await resLogin.text()
        if(resLoginHTML.match('Wrong captcha')) {
            return await oauthLogin(_try++);
        }
        else if(resLoginHTML.match('Incorrect account or password')) {
            return NextResponse.json({ success: false, body: { error: "帳號或密碼錯誤 Incorrect Login Credentials", code: LoginError.IncorrectCredentials }});
        }
        if (!resLogin.headers.has("Location") || !resLogin.headers.get("Location")?.includes("admin/oauth2callback")) {
            return NextResponse.json({ success: false, body: { error: "未知錯誤 Unknown Login Error", code: LoginError.Unknown }});
        }

        const resToken = await fetch(resLogin.headers.get("Location") as string, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*\/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                "sec-ch-ua": "\"NotA(Brand\";v=\"99\", \"Microsoft Edge\";v=\"121\", \"Chromium\";v=\"121\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                "cookie": cookies
            },
            "keepalive": true,
            "redirect": "manual",
            "referrer": `https://oauth.ccxp.nthu.edu.tw/`,
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "same-origin",
            "cache": "no-cache",
        });

        const resMoodle = await fetch(resToken.headers.get("Location") as string, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*\/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                "sec-ch-ua": "\"NotA(Brand\";v=\"99\", \"Microsoft Edge\";v=\"121\", \"Chromium\";v=\"121\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                "cookie": cookies
            },
            "keepalive": true,
            "redirect": "manual",
            "referrer": `https://oauth.ccxp.nthu.edu.tw/`,
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "same-origin",
            "cache": "no-cache",
        });
        cookieMap.set("MoodleSessionM35", resMoodle.headers.getSetCookie().find((cookie: string) => cookie.startsWith("MoodleSessionM35="))?.split(";")[0].split("=")[1] as string)
        await fetch("http://elearn.nthu.edu.tw/", {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*\/*;q=0.8,application/signed-exchange;v=b3;q=0.7",/*
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                "sec-ch-ua": "\"NotA(Brand\";v=\"99\", \"Microsoft Edge\";v=\"121\", \"Chromium\";v=\"121\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                "cookie": Array.from(cookieMap).map(([key, value]) => `${key}=${value}`).join(";")*/
            /*},
            "keepalive": true,
            "referrer": `https://oauth.ccxp.nthu.edu.tw/`,
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "same-origin",
            "cache": "no-cache",
        });
        return NextResponse.json({success: true, cookie: `MoodleSessionM35=${cookieMap.get("MoodleSessionM35")};TSPD_101=${cookieMap.get("TSPD_101")}`, body: {MoodleSessionM35: cookieMap.get("MoodleSessionM35"), TSPD_101: cookieMap.get("TSPD_101")}})
    }

    return await oauthLogin()
}

// Example of using elearn oauth api
/*
export const GET = async (req: NextRequest) => {
    const form = new FormData();
    form.append("studentid", "111062171");
    form.append("password", process.env.DEV_PASSWORD as string);
    const k = await fetch("http://localhost:3000/api/ais_headless/elearn", {
        method: "POST",
        body: form
    })
    const keys = (await k.json())["cookie"]
    const elearn_dashboard = await fetch("https://elearn.nthu.edu.tw/course/view.php?id=32102", {
        "headers": {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*\/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "max-age=0",
            "content-type": "application/x-www-form-urlencoded",
            "sec-ch-ua": "\"NotA(Brand\";v=\"99\", \"Microsoft Edge\";v=\"121\", \"Chromium\";v=\"121\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "cookie": keys
        },
        "method": "GET",
        "referrer": "https://elearn.nthu.edu.tw/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "mode": "cors",
        "credentials": "same-origin",
        "cache": "no-cache"
    })

    return new Response(elearn_dashboard.body)
}*/