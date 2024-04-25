'use server';

import { AnnouncementsQuery, ElearningCourse } from '@/types/elearning';
import jsdom from 'jsdom';
import { parse } from "node-html-parser";

export const fetchEeClass = async (cookie: string, url: string) => {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

    return await fetch(url, {
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
            "cookie": cookie
        },
        "referrer": "https://nthumods.com/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "method": "GET",
        "body": null,
        "mode": "cors",
        "credentials": "same-origin",
        "cache": "no-cache"
    });
}

export const getAnnouncements = async (cookie: string, course: string, announcementPage: number): Promise<AnnouncementsQuery> => {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

    let announcements, pageCount = 2
    const location = course == "all" ? `dashboard/latestBulletin?page=${announcementPage}&category=all&condition=0&pageSize=20` : `course/bulletin/${course}`
    const eeclass_bulletin = await fetchEeClass(cookie, `https://eeclass.nthu.edu.tw/${location}`)

    if (!eeclass_bulletin.ok) {
        throw new Error("Failed to fetch announcements")
    }
    const html = await eeclass_bulletin.text();
    const dom = new jsdom.JSDOM(html);
    const doc = dom.window.document;
    const rawDatas = Array.from(doc.querySelector("#bulletinMgrTable > tbody")!.querySelectorAll("tr"))
    if (rawDatas[0].id == "noData") {
        return {
            announcements: [],
            pageCount: 0
        }
    }
    const pageBox = doc.querySelector(".pagination")
    pageCount = pageBox ? pageBox!.querySelectorAll("li").length : 3
    announcements = rawDatas.map((element) => element.querySelectorAll("td")).map((tdmap) => {
        return {
            courseId: tdmap.item(2).querySelector("div > a")?.getAttribute("href")?.substring(8)!,
            courseName: tdmap.item(2).querySelector("div > a > span")?.innerHTML ?? "",
            date: tdmap.item(3).querySelector("div")?.innerHTML ?? "",
            title: tdmap.item(1).querySelector("div > .afterText > .text-overflow > a > span")?.innerHTML ?? "",
            announcer: ((str) => str.substring(str.indexOf("by ") + 3))(tdmap.item(1).querySelector("div > .fs-hint")?.innerHTML!) ?? "",
            details: tdmap.item(1).querySelector("div > .afterText > .text-overflow > a")?.getAttribute("data-url")!
        }
    }
    )
    return {
        announcements,
        pageCount: pageCount - 2
    }
}

export const getAnnouncementDetails = async (cookie: string, url: string) => {
    const res = await fetchEeClass(cookie, `https://eeclass.nthu.edu.tw${url}`)
    if (!res.ok) {
        return {
            content: "",
            attachments: []
        }
    }
    const html = await res.text()
    const dom = parse(html)
    const modalBox = parse(dom.querySelector(".modalBox")?.innerHTML!)
    const contentBlock = modalBox.querySelector(".fs-text-break-word")
    const downloadBlock = modalBox.querySelector(".fs-filelist > ul")
    const urls = downloadBlock?.querySelectorAll("li")
        .map((element) => element.querySelector("a"))
        .map((element) => {
            return { text: element?.querySelector(".text > :not(.fs-hint)")?.text, filesize: element?.querySelector(".text > .fs-hint")?.text, url: `https://eeclass.nthu.edu.tw${element?.getAttribute("href")}` }
        }).map((element) => {
            return { ...element, filename: element.text?.split(".").filter((text, index, arr) => index < arr.length - 1).join(".") }
        })
    contentBlock!.querySelectorAll("[src]").forEach((element) => (element.getAttribute("src")![0] == "/") && element.setAttribute("src", `https://eeclass.nthu.edu.tw${element.getAttribute("src")}`));
    contentBlock!.querySelectorAll("[href]").forEach((element) => (element.getAttribute("href")![0] == "/") && element.setAttribute("href", `https://eeclass.nthu.edu.tw${element.getAttribute("href")}`));

    return {
        content: contentBlock === null ? "無內容 No content" : contentBlock.innerHTML.replace(/^\s+|\s+$/g, ""),
        attachments: downloadBlock === null ? [] : urls!
    }
}

export const getCourses = async (cookie: string) => {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

    const courseComparator = (a: ElearningCourse, b: ElearningCourse) => {
        return a.raw_id.charCodeAt(a.raw_id.length - 6) - b.raw_id.charCodeAt(b.raw_id.length - 6)
    }

    const normalizeRawID = (rawID: string) => {
        //input is 11220EE225501 => 11220EE  225501 get first 5 characters and last 6 characters, middle is the dept, dept must be padEnd 4 char, join them together
        const sem = rawID.substring(0, 5);
        const dept = rawID.substring(5, rawID.length - 6).padEnd(4, " ");
        const course = rawID.substring(rawID.length - 6);
        return `${sem}${dept}${course}`
    }
        

    const eeclass_dashboard = await fetchEeClass(cookie, `https://eeclass.nthu.edu.tw/dashboard`)
    const html = await eeclass_dashboard.text();
    const dom = new jsdom.JSDOM(html);
    const doc = dom.window.document;
    const courses = Array.from(doc.querySelectorAll(".fs-thumblist > ul > li")).map((element) => element.querySelector(".fs-caption")).map((element) => {
        const link = element?.querySelector("a")
        const details = element?.querySelectorAll(".fs-hint > div")
        return {
            courseId: link?.getAttribute("href")!.substring(8)!,
            courseName: link!.innerHTML.trim(),
            instructor: details!.item(0).innerHTML.substring(12),
            grade: details!.item(2).innerHTML.substring(7),
            raw_id: normalizeRawID(details!.item(3).innerHTML.substring(6))
        };
    })
    return courses.sort(courseComparator)
}

type EEClassOauthReturn = { 
    cookie: string,
    PHPSESSID: string,
    TS01e4fe74: string
}
export const signInEeclassOauth = async (studentid: string, password: string) => {

    const oauthLogin = async (_try = 0): Promise<EEClassOauthReturn> => {
        if(_try == 3) {
            throw new Error("登入出錯，但不知道爲什麽 :( Something wrong, idk why.");
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
            throw new Error("帳號或密碼錯誤 Incorrect Login Credentials")
        }
        else if (!resLogin.headers.has("Location") || !resLogin.headers.get("Location")?.includes("service/oauth")) {
            throw new Error("未知錯誤 Unknown Login Error")
        }
        const res = await fetch(resLogin.headers.get("Location") as string, {
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
        const TS01e4fe74 = res.headers.getSetCookie().find((cookie: string) => cookie.startsWith("TS01e4fe74="))?.split(";")[0].split("=")[1] as string;

        return { cookie: `noteFontSize=100;noteExpand=0;locale=en-us;timezone=%2B0800;PHPSESSID=${PHPSESSID};TS01e4fe74=${TS01e4fe74}`, PHPSESSID: PHPSESSID, TS01e4fe74: TS01e4fe74 }
    }
    return await oauthLogin()
}