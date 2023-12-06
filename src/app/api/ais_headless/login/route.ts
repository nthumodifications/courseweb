import { NextRequest, NextResponse } from "next/server";
import sharp from 'sharp';
import { decaptcha } from "./decaptcha";

export const runtime = "nodejs";

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
            const imgResponse = await fetch('http://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/auth_img.php?pwdstr=' + pwdstr);
            const imgBuffer = await sharp(await imgResponse.arrayBuffer())
                                        .resize(320,120)
                                        .greyscale() // make it greyscale
                                        .linear(1.2, 0) // increase the contrast
                                        .toBuffer()

            //OCR
            const text = await decaptcha(imgBuffer);
            answer = text.replace(/[^0-9]/g, "") || "";
            
            console.log("Answer: ",answer)
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
                "cookie": "TS01860c62=01dba9d2283c80dfc9c2e63410d8f99f7eb373994552ce9bfb51853db6546fcd200f80d8b73c0239df883c58bcf7477f86cb9ae228",
                "Referer": "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
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
                "referrer": `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/select_entry.php?ACIXSTORE=${ACIXSTORE}&hint=${studentid}`,
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
            });
            await fetch(`https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/top.php?account=${studentid}&ACIXSTORE==${ACIXSTORE}`, {
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
                "referrer": `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/select_entry.php?ACIXSTORE=${ACIXSTORE}&hint=${studentid}`,
                "referrerPolicy": "strict-origin-when-cross-origin",
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
                    "Referer": `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/select_entry.php?ACIXSTORE=${ACIXSTORE}&hint=${studentid}`,
                    "Referrer-Policy": "strict-origin-when-cross-origin"
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
                "referrer": `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/select_entry.php?ACIXSTORE=${ACIXSTORE}&hint=${studentid}`,
                "referrerPolicy": "strict-origin-when-cross-origin",
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