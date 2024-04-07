import {NextRequest, NextResponse} from "next/server";
import jsdom from 'jsdom';
import {ElearningCourseObject} from "@/types/elearning";

export const GET = async (req: NextRequest) => {
    const cookie = req.nextUrl.searchParams.get("cookie") as string
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

    const courseComparator = (a: ElearningCourseObject, b: ElearningCourseObject) => {
        return a.code.charCodeAt(a.code.length-6)-b.code.charCodeAt(b.code.length-6)
    }

    const eeclass_dashboard = await fetch(`https://eeclass.nthu.edu.tw/dashboard`, {
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
    const courses = Array.from(doc.querySelectorAll(".fs-thumblist > ul > li")).map((element) => element.querySelector(".fs-caption")).map((element) => {
        const link = element?.querySelector("a")
        const details = element?.querySelectorAll(".fs-hint > div")
        return {
            courseId: link?.getAttribute("href")!.substring(8)!,
            courseName: link!.innerHTML.trim(),
            instructor: details!.item(0).innerHTML.substring(12),
            grade: details!.item(2).innerHTML.substring(7),
            code: details!.item(3).innerHTML.substring(6)
        };
    })
    return NextResponse.json(courses.sort(courseComparator))
}