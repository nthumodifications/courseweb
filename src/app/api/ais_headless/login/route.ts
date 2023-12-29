import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export const POST = async (req: NextRequest) => {
    const form = await req.formData();
    const studentid = form.get('studentid');
    const password = form.get('password');

    const ocrAndLogin: (_try?:number) => Promise<string | null> = async (_try = 0) => {
        if(_try == 3) {
            return null;
        }
        let tries = 0, pwdstr = "", answer = "";
        do {
            tries++;
            const url = 'http://www.ccxp.nthu.edu.tw/ccxp/INQUIRE';
            const res = await fetch(url);
            const body = await res.text();
            if(!body) {
                continue;
            }
            const bodyMatch = body.match(/auth_img\.php\?pwdstr=([a-zA-Z0-9_-]+)/);
            if(!bodyMatch) {
                continue;
            }
            pwdstr = bodyMatch[1];
            //fetch the image from the url and send as base64
            console.log("pwdstr: ", pwdstr)
            const imgResponse = await fetch("https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/auth_img.php?pwdstr=" + pwdstr, {
                "headers": {
                    "accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                    "accept-language": "en-US,en;q=0.9",
                    "sec-ch-ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Microsoft Edge\";v=\"120\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "image",
                    "sec-fetch-mode": "no-cors",
                    "sec-fetch-site": "same-origin"
                },
                // "referrer": "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/",
                // "referrerPolicy": "strict-origin-when-cross-origin",
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
            });
            const imgBuffer = await imgResponse.arrayBuffer()
            console.log("imgBuff length: ", imgBuffer.byteLength)
            answer = await (await fetch('https://courseweb-git-ccxp-fucked-us-nthumods.vercel.app/api/ais_headless/fetch-img', { method: 'POST', body: imgBuffer })).text();

            if(answer.length == 6) break;
        } while (tries <= 5);
        if(tries == 6 || answer.length != 6) {
            throw "Internal Server Error";
        }
        const response = await fetch("https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/pre_select_entry.php", {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                "sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Microsoft Edge\";v=\"110\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "upgrade-insecure-requests": "1",
            },
            "body": `account=${studentid}&passwd=${password}&passwd2=${answer}&Submit=%B5n%A4J&fnstr=${pwdstr}`,
            "method": "POST"
        });
        const resHTML = await response.arrayBuffer()
                            .then(buffer => {
                                const decoder = new TextDecoder("big5")
                                const text = decoder.decode(buffer)
                                return text
                            })
        
        if(resHTML.match('驗證碼輸入錯誤!')) {
            return await ocrAndLogin(_try++);
        }
        if(resHTML.match('帳號或密碼錯誤')) {
            return null;
        }
        else if(resHTML.match("/ccxp/INQUIRE/index.php")) {
            return null;
        }
        if(resHTML.match(/ACIXSTORE=([a-zA-Z0-9_-]+)/)?.length == 0) {
            return await ocrAndLogin(_try++);
        }
        else {
            const ACIXSTORE = resHTML.match(/ACIXSTORE=([a-zA-Z0-9_-]+)/)?.[1];
            if(!ACIXSTORE) {
                return await ocrAndLogin(_try++);
            }
            await fetch(`https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/select_entry.php?ACIXSTORE=${ACIXSTORE}&hint=${studentid}`, {
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Microsoft Edge\";v=\"110\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1"
                },
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
            });
            await fetch(`https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/top.php?account=${studentid}&ACIXSTORE=${ACIXSTORE}`, {
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Microsoft Edge\";v=\"110\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "frame",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "upgrade-insecure-requests": "1"
                },
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
            });
            await fetch(`https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/IN_INQ_STU.php?ACIXSTORE=${ACIXSTORE}`, {
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "cache-control": "max-age=0",
                    "sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Microsoft Edge\";v=\"110\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "frame",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "upgrade-insecure-requests": "1",
                },
                "body": null,
                "method": "GET"
            });
            await fetch(`https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/xp03_m.htm?ACIXSTORE=${ACIXSTORE}`, {
                "headers": {
                  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                  "accept-language": "en-US,en;q=0.9",
                  "sec-ch-ua": "\"Chromium\";v=\"110\", \"Not A(Brand\";v=\"24\", \"Microsoft Edge\";v=\"110\"",
                  "sec-ch-ua-mobile": "?0",
                  "sec-ch-ua-platform": "\"Windows\"",
                  "sec-fetch-dest": "frame",
                  "sec-fetch-mode": "navigate",
                  "sec-fetch-site": "same-origin",
                  "upgrade-insecure-requests": "1"
                },
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
              });
            await fetch(`https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/time.php?account=${studentid}&ACIXSTORE=${ACIXSTORE}`, {
                "headers": {
                  "accept": "*/*",
                  "accept-language": "en-US,en;q=0.9",
                  "sec-ch-ua": "\"Microsoft Edge\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
                  "sec-ch-ua-mobile": "?0",
                  "sec-ch-ua-platform": "\"Windows\"",
                  "sec-fetch-dest": "empty",
                  "sec-fetch-mode": "cors",
                  "sec-fetch-site": "same-origin",
                  "x-requested-with": "XMLHttpRequest"
                },
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
            });
            return ACIXSTORE;
        }
    }
    const result = await ocrAndLogin();
    if(!result) {
        return NextResponse.json({ success: false, body: { error: "Login Failed" }});
    }
    return NextResponse.json({ success: true, body: { ACIXSTORE: result }});
}