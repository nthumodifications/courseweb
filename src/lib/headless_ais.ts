'use server';
import { LoginError } from "@/types/headless_ais";
import jwt from 'jsonwebtoken';
export const signInToCCXP = async (studentid: string, password: string) => {
    try {
        const ocrAndLogin: (_try?:number) => Promise<{ ACIXSTORE: string }> = async (_try = 0) => {
            if(_try == 3) {
                throw new Error(LoginError.Unknown);
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
                answer = await fetch(`https://ocr.nthumods.com/?url=https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/auth_img.php?pwdstr=${pwdstr}`)
                            .then(res => res.text())
                console.log(answer)
                if(answer.length == 6) break;
            } while (tries <= 5);
            if(tries == 6 || answer.length != 6) {
                throw new Error("Internal Server Error");
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
            const redirectMatch = resHTML.match(/url=(select_entry\.php\?ACIXSTORE=[a-zA-Z0-9_-]+&hint=[0-9]+)/);
            //Check if login credentials are correct
            const newHTML = await fetch("https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/" + redirectMatch?.[1], {
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9",
                    "sec-ch-ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Microsoft Edge\";v=\"120\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "same-origin",
                    "upgrade-insecure-requests": "1"
                },
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
            })
            .then(response => response.arrayBuffer())
            .then(buffer => {
                const decoder = new TextDecoder("big5")
                const text = decoder.decode(buffer)
                return text
            })
            if(resHTML.match('驗證碼輸入錯誤!')) {
                return await ocrAndLogin(_try++);
            }
            else if(resHTML.match('15分鐘內登錄錯誤')) {
                throw new Error(LoginError.CaptchaError);
            }
            //CAPTCHA IS CORRECT: check if select_entry.php is correct  (if not, then login credentials are wrong)
            else if(newHTML.match('帳號或密碼錯誤')) {
                throw new Error(LoginError.IncorrectCredentials);
            }
            else if(resHTML.match(/ACIXSTORE=([a-zA-Z0-9_-]+)/)?.length == 0) {
                return await ocrAndLogin(_try++);
            }
            else {
                const ACIXSTORE = resHTML.match(/ACIXSTORE=([a-zA-Z0-9_-]+)/)?.[1];
                if(!ACIXSTORE) {
                    return await ocrAndLogin(_try++);
                }
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
                return { ACIXSTORE: ACIXSTORE };
            }
        }
        const result = await ocrAndLogin();

        return result;
    } catch (err) {
        if(err instanceof Error) return { error: { message: err.message } };
        throw err;
    }
}
