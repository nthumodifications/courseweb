import {NextRequest, NextResponse} from "next/server";
import jsdom from 'jsdom';
import {parse} from "node-html-parser";

export const GET = async (req: NextRequest) => {
    const cookie = req.nextUrl.searchParams.get("cookie") as string
    const course = req.nextUrl.searchParams.get("course") as string
    const announcementPage = req.nextUrl.searchParams.get("page") as string
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

    const getAnnouncementDetails = async (url: string) => {
        const res = await fetch(`https://eeclass.nthu.edu.tw${url}`, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*\/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                "content-type": "text/html; charset=UTF-8",
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
            "method": "GET",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "mode": "cors",
            "credentials": "same-origin",
            "cache": "no-cache"
        })
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
                return {text: element?.querySelector(".text > :not(.fs-hint)")?.text, filesize: element?.querySelector(".text > .fs-hint")?.text, url: `https://eeclass.nthu.edu.tw${element?.getAttribute("href")}`}
            }).map((element) => {
                return {...element, filename: element.text?.split(".").filter((text, index, arr) => index < arr.length-1).join(".")}
            })
        contentBlock!.querySelectorAll("[src]").forEach((element) => (element.getAttribute("src")![0] == "/") && element.setAttribute("src", `https://eeclass.nthu.edu.tw${element.getAttribute("src")}`));
        contentBlock!.querySelectorAll("[href]").forEach((element) => (element.getAttribute("href")![0] == "/") && element.setAttribute("href", `https://eeclass.nthu.edu.tw${element.getAttribute("href")}`));

        return {
            content: contentBlock === null ? "無內容 No content" : contentBlock.innerHTML.replace(/^\s+|\s+$/g, ""),
            attachments: downloadBlock === null ? [] : urls!
        }
    }

    let announcements, pageCount = 2
    const location = course == "every" ? `dashboard/latestBulletin?page=${announcementPage}&category=all&condition=0&pageSize=20` : `course/bulletin/${course}`
    const eeclass_bulletin = await fetch(`https://eeclass.nthu.edu.tw/${location}`, {
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

    if (!eeclass_bulletin.ok) {
        return NextResponse.error();
    }
    const html = await eeclass_bulletin.text();
    const dom = new jsdom.JSDOM(html);
    const doc = dom.window.document;
    const rawDatas = Array.from(doc.querySelector("#bulletinMgrTable > tbody")!.querySelectorAll("tr"))
    if (rawDatas[0].id == "noData") {
        return NextResponse.json({
            announcements: [],
            pageCount: 0
        })
    }
    const pageBox = doc.querySelector(".pagination")
    pageCount = pageBox ? pageBox!.querySelectorAll("li").length : 3
    announcements = rawDatas.map((element) => element.querySelectorAll("td")).map((tdmap) => {
            return {
                courseId: tdmap.item(2).querySelector("div > a")?.getAttribute("href")?.substring(8)!,
                courseName: tdmap.item(2).querySelector("div > a > span")?.innerHTML,
                date: tdmap.item(3).querySelector("div")?.innerHTML,
                title: tdmap.item(1).querySelector("div > .afterText > .text-overflow > a > span")?.innerHTML,
                announcer: ((str) => str.substring(str.indexOf("by ") + 3))(tdmap.item(1).querySelector("div > .fs-hint")?.innerHTML!),
                details: tdmap.item(1).querySelector("div > .afterText > .text-overflow > a")?.getAttribute("data-url")!
            }
        }
    )
    return NextResponse.json({
        announcements: await Promise.all(announcements.map(async (announcement) => {
            return {...announcement, details: await getAnnouncementDetails(announcement.details)}
        })),
        pageCount: pageCount-2
    })
}