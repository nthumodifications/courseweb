import {NextRequest, NextResponse} from "next/server";
import jsdom from 'jsdom';
import {LoginError} from "@/types/headless_ais";

export const POST = async (req: NextRequest) => {
    const form = await req.formData();
    const studentid = form.get('studentid');
    const password = form.get('password');

    const oauthLogin: (_try?:number) => Promise<NextResponse> = async (_try = 0) => {
        if(_try == 3) {
            return NextResponse.json({ success: false, body: { error: "登入出錯，但不知道爲什麽 :( Something wrong, idk why.", code: LoginError.Unknown }});
        }

        let tries = 0, captchaUrl = "", captcha = "", PHPSESSID = "";
        do {
            const res = await fetch(`https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?response_type=code&client_id=eeclass&redirect_uri=https%3A%2F%2Feeclass.nthu.edu.tw%2Fservice%2Foauth%2F&scope=lmsid+userid&state=&ui_locales=en-US`, {
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
                "referrer": `https://eeclass.nthu.edu.tw/`,
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "same-origin",
                "cache": "no-cache",
            });

            const html = await res.text();
            const dom = new jsdom.JSDOM(html);
            const doc = dom.window.document;
            const setCookie = res.headers.getSetCookie();

            PHPSESSID = setCookie.find((cookie: string) => cookie.startsWith("PHPSESSID="))?.split(";")[0].split("=")[1] as string;

            const audio = doc.querySelector('source[id="captcha_image_source_wav"]') as HTMLSourceElement;
            captchaUrl = audio.src

            captcha = await (await fetch(`https://sr.nthumods.com/?url=${'https://oauth.ccxp.nthu.edu.tw/v1.1/' + captchaUrl}&id=${PHPSESSID}`)).text()
            if(captcha.length == 4) break;
        } while (tries <= 5);

        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
        const resLogin = await fetch(`https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?response_type=code&client_id=eeclass&redirect_uri=https%3A%2F%2Feeclass.nthu.edu.tw%2Fservice%2Foauth%2F&scope=lmsid+userid&state=&ui_locales=en-US`, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
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
            "referrer": `https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?response_type=code&client_id=eeclass&redirect_uri=https%3A%2F%2Feeclass.nthu.edu.tw%2Fservice%2Foauth%2F&scope=lmsid+userid&state=&ui_locales=en-US`,
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
        else if (!resLogin.headers.has("Location") || !resLogin.headers.get("Location")?.includes("service/oauth")) {
            return NextResponse.json({ success: false, body: { error: "未知錯誤 Unknown Login Error", code: LoginError.Unknown }});
        }

        const resToken = await fetch(resLogin.headers.get("Location") as string, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
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
            "referrer": "https://oauth.ccxp.nthu.edu.tw/",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "redirect": "manual",
            "method": "GET",
            "body": null,
            "mode": "cors",
            "credentials": "same-origin",
            "cache": "no-cache"
        });

        return NextResponse.json({ success: true, cookie: `noteFontSize=100;noteExpand=0;locale=en-us;timezone=%2B0800;PHPSESSID=${PHPSESSID}`, body: { PHPSESSID: PHPSESSID}});
    }
    return await oauthLogin()
}

// Example
export const GET = async (req: NextRequest) => {
    const cookie = req.nextUrl.searchParams.get("cookie") as string
    const announcementPage = req.nextUrl.searchParams.get("annPage") as string
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    const eeclass_dashboard = await fetch(`https://eeclass.nthu.edu.tw/dashboard/latestBulletin?page=${announcementPage}&category=all&condition=0&pageSize=20`, {
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
            "cookie": cookie,
        },
        "redirect": "follow",
        "method": "GET",
        "referrer": "https://eeclass.nthu.edu.tw/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "mode": "cors",
        "credentials": "same-origin",
        "cache": "no-cache"
    })
    const html = await eeclass_dashboard.text();
    const dom = new jsdom.JSDOM(html);
    const doc = dom.window.document;
    const rawDatas = Array.from(doc.querySelector("#bulletinMgrTable > tbody")!.querySelectorAll("tr"))
    const announcements = rawDatas.map((element) => element.querySelectorAll("td")).map((map) => {
        return {
            courseId: parseInt(map.item(2).querySelector("div > a")?.getAttribute("href")?.substring(8)!),
            courseName: map.item(2).querySelector("div > a > span")?.innerHTML,
            date: map.item(3).querySelector("div")?.innerHTML,
            title: map.item(1).querySelector("div > .afterText > .text-overflow > a > span")?.innerHTML,
            announcer: ((str) => str.substring(str.indexOf("by ")+3))(map.item(1).querySelector("div > .fs-hint")?.innerHTML!),
            url: map.item(1).querySelector("div > .afterText > .text-overflow > a")?.getAttribute("data-url")
        };
    })

    return NextResponse.json({
        announcements: announcements
    })
}