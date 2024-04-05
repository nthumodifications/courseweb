import {NextRequest, NextResponse} from "next/server";

export const GET = async (req: NextRequest) => {
    const cookie = decodeURI(req.nextUrl.searchParams.get("cookie") as string)
    const url = decodeURI(req.nextUrl.searchParams.get("url") as string)
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

    const res = await fetch(url, {
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
    })
    if (!res.ok) return NextResponse.error();
    const blob = await res.blob();
    return new NextResponse(blob, {status: 200, statusText: "OK"})
}