'use server';
import { LoginError, UserJWT, UserJWTDetails } from "@/types/headless_ais";
import jwt from 'jsonwebtoken';
import { cookies } from "next/headers";
import jsdom from 'jsdom';
import iconv from 'iconv-lite';
import supabase_server from "@/config/supabase_server";
import crypto from 'crypto';

const encrypt = (text: string) => {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(process.env.NTHU_HEADLESS_AIS_ENCRYPTION_KEY!, 'hex');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = cipher.update(text, 'utf8', 'base64') + cipher.final('base64');
    const encryptedPassword = iv.toString('base64') + encrypted;
    return encryptedPassword;
}

const decrypt = (encryptedPassword: string) => {
    const key = Buffer.from(process.env.NTHU_HEADLESS_AIS_ENCRYPTION_KEY!, 'hex');
    
    // Split the IV and the encrypted text
    const iv = Buffer.from(encryptedPassword.slice(0, 24), 'base64'); // First 24 characters represent the IV
    const encryptedText = encryptedPassword.slice(24); // The rest is the encrypted text
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}


type SignInToCCXPResponse = Promise<{ ACIXSTORE: string, encryptedPassword: string } | { error: { message: string } }>;
/**
 * Attempts to login user to CCXP, takes in raw studentid and password
 * ONLY use this for first time login, will return encrypted password and ACIXSTORE
 * @param studentid 
 * @param password 
 * @returns { ACIXSTORE: string, encryptedPassword: string }
 */
export const signInToCCXP = async (studentid: string, password: string): SignInToCCXPResponse => {
    console.log("Signing in to CCXP")
    try {
        const ocrAndLogin: (_try?:number) => Promise<{ ACIXSTORE: string }> = async (_try = 0) => {
            if(_try == 3) {
                throw new Error(LoginError.Unknown);
            }
            let tries = 0, pwdstr = "", answer = "";
            do {
                tries++;
                try {
                    const url = 'http://www.ccxp.nthu.edu.tw/ccxp/INQUIRE';
                    const res = await fetch(url);
                    const body = await res.text();
                    console.log(body)
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
                } catch (err) { 
                    console.error('fetch login err',err)
                    throw new Error(LoginError.Unknown);
                }
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
                return { ACIXSTORE };
            }
        }
        console.log('congrats')
        const result = await ocrAndLogin();

        const html = await fetch(`https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/JH/4/4.19/JH4j002.php?ACIXSTORE=${result.ACIXSTORE}&user_lang=`, {
            "headers": {
              "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
              "accept-language": "en-US,en;q=0.9",
              "cache-control": "max-age=0",
              "sec-ch-ua": "\"Chromium\";v=\"124\", \"Microsoft Edge\";v=\"124\", \"Not-A.Brand\";v=\"99\"",
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
        })
            .then(res => res.arrayBuffer())
            .then(arrayBuffer => iconv.decode(Buffer.from(arrayBuffer), 'big5').toString())
        const dom = new jsdom.JSDOM(html);
        const doc = dom.window.document;

        console.log('what')

        const form = doc.querySelector('form[name="register"]');
        if(form == null) {
            throw new Error(LoginError.Unknown);
        }

        const firstRow = form.querySelector('tr:nth-child(1)')!;
        const secondRow = form.querySelector('tr:nth-child(2)')!;

        const data = {
            studentid: firstRow.querySelector('.class3:nth-child(2)')?.textContent?.trim() ?? "",
            name_zh: firstRow.querySelector('.class3:nth-child(4)')?.textContent?.trim() ?? "",
            name_en: firstRow.querySelector('.class3:nth-child(6)')?.textContent?.trim() ?? "",
            department: secondRow.querySelector('.class3:nth-child(2)')?.textContent?.trim() ?? "",
            grade: secondRow.querySelector('.class3:nth-child(4)')?.textContent?.trim() ?? "",
            email: form.querySelector('input[name="email"]')?.getAttribute('value') ?? "",
        } as UserJWTDetails;

        if(form.querySelector('input[name="ACIXSTORE"]')?.getAttribute('value') != result.ACIXSTORE) {
            throw new Error(LoginError.Unknown);
        }

        const token = jwt.sign({ sub: studentid, ...data }, process.env.NTHU_HEADLESS_AIS_SIGNING_KEY!, { expiresIn: '15d' });
        await cookies().set('accessToken', token, { path: '/', maxAge: 60 * 60 * 24, sameSite: 'strict', secure: true });

        // Encrypt user password 
        const encryptedPassword = encrypt(password);
        
        return { ...result, encryptedPassword };
    } catch (err) {
        if(err instanceof Error) return { error: { message: err.message } };
        console.error('CCXP Unknown Err', err);
        throw err;
    }
}

type RefreshUserSessionResponse = Promise<{ ACIXSTORE: string } | { error: { message: string } }>;
export const refreshUserSession = async (studentid: string, encryptedPassword: string): RefreshUserSessionResponse => {
    console.log('Refreshing User Session')
    // Decrypt password
    const password =  decrypt(encryptedPassword);

    const res = await signInToCCXP(studentid, password);
    if('error' in res && res.error) {
        console.error(res.error);
        return { error: res.error }
    }
    // @ts-ignore - We know that res is not an error
    return { ACIXSTORE: res.ACIXSTORE };
}

export const getUserSession = async () => {
    const accessToken = cookies().get('accessToken')?.value ?? '';
    try {
        return await jwt.verify(accessToken, process.env.NTHU_HEADLESS_AIS_SIGNING_KEY!) as UserJWT;
    } catch {
        return null;
    }
}

export const isUserBanned = async () => {
    const session = await getUserSession();
    if(!session) {
        return false;
    }
    const { data, error } = await supabase_server.from('users').select('banned').eq('studentid', session.studentid).maybeSingle();
    if(error) {
        return false;
    }
    return data?.banned ?? false;
}