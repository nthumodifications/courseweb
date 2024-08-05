'use server';;
import { LoginError, UserJWTDetails } from "@/types/headless_ais";
import { parseHTML } from 'linkedom';
import {fetchWithTimeout} from '@/helpers/fetch';
import {createSessionCookie, mintFirebaseToken, revokeAllSessions} from '@/lib/firebase/auth';
import { cookies } from "next/headers";

function hexStringToUint8Array(hexString: string) {
    if (hexString.length % 2 !== 0) {
        throw new Error("Hex string has an odd length");
    }
    const arrayBuffer = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        const byteValue = parseInt(hexString.substring(i, i + 2), 16);
        arrayBuffer[i / 2] = byteValue;
    }
    return arrayBuffer;
}

export const encrypt = async (text: string) => {
    const key = await crypto.subtle.importKey(
        'raw',
        hexStringToUint8Array(process.env.NTHU_HEADLESS_AIS_ENCRYPTION_KEY!),
        { name: 'AES-CBC', length: 256 }, // Specify algorithm details
        false,
        ['encrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv },
        key,
        new TextEncoder().encode(text)
    );
    
    // Correctly handle binary data and Base64 encoding
    const encryptedData = new Uint8Array(encrypted); // Convert BufferSource to Uint8Array
    const ivBase64 = btoa(String.fromCharCode(...iv)); // Encode IV as Base64
    const encryptedDataBase64 = btoa(String.fromCharCode(...encryptedData)); // Encode encrypted data as Base64
    
    const encryptedPassword = ivBase64 + encryptedDataBase64; // Concatenate Base64 IV and encrypted data
    return encryptedPassword;
}

export const decrypt = async (encryptedPassword: string) => {
    const encodedKey = hexStringToUint8Array(process.env.NTHU_HEADLESS_AIS_ENCRYPTION_KEY!);
    const key = await crypto.subtle.importKey(
        'raw',
        encodedKey,
        { name: 'AES-CBC', length: 256 }, // Specify algorithm details for consistency
        false,
        ['decrypt']  // Specify that the key is for decryption
    );

    // Extract the IV from the first part of the Base64 string
    const ivBase64 = encryptedPassword.slice(0, 24); // First 24 characters are the Base64 encoded IV
    const iv = Uint8Array.from(atob(ivBase64).split('').map(char => char.charCodeAt(0)));

    // Extract the encrypted data
    const encryptedData = encryptedPassword.slice(24);
    const encryptedArrayBuffer = Uint8Array.from(atob(encryptedData).split('').map(char => char.charCodeAt(0)));


    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv },
        key,
        encryptedArrayBuffer
    );

    // Convert the decrypted buffer back to text
    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    return decryptedText;
}

async function streamAndMatch(response: Response, regex: RegExp) {
    if(response.body == null) throw new Error(LoginError.Unknown);

    const reader = response.body.getReader();
    const decoder = new TextDecoder("big5");
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const match = buffer.match(regex);
        if (match) {
            reader.cancel(); // Cancel the stream
            return match[1]; // Return the matched group
        }

        // Optionally, trim the buffer to avoid excessive memory usage
        if (buffer.length > 10000) {
            buffer = buffer.slice(-5000);
        }
    }

    throw new Error(LoginError.Unknown);
}

type SignInToCCXPResponse = Promise<{ ACIXSTORE: string, encryptedPassword: string, passwordExpired: boolean, accessToken: string } | { error: { message: string } }>;
/**
 * Attempts to login user to CCXP, takes in raw studentid and password
 * ONLY use this for first time login, will return encrypted password and ACIXSTORE
 * @param studentid 
 * @param password 
 * @returns { ACIXSTORE: string, encryptedPassword: string, passwordExpired: boolean, accessToken: string }
 */
export const signInToCCXP = async (studentid: string, password: string): SignInToCCXPResponse => {
    console.log("Signing in to CCXP")
    let startTime = Date.now();
    try {
        const ocrAndLogin: (_try?:number) => Promise<{ ACIXSTORE: string, passwordExpired: boolean }> = async (_try = 0) => {
            if(_try == 3) {
                throw new Error(LoginError.Unknown);
            }
            let tries = 0, pwdstr = "", answer = "";
            do {
                tries++;
                try {
                    console.log('Fetching login page')
                    const res = await fetchWithTimeout('https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/', {
                        timeout: 3000,
                        "headers": {
                            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                            "accept-language": "en-US,en;q=0.9",
                            "cache-control": "max-age=0",
                            "sec-ch-ua": "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Microsoft Edge\";v=\"126\"",
                            "sec-ch-ua-mobile": "?0",
                            "sec-ch-ua-platform": "\"Windows\"",
                            "sec-fetch-dest": "document",
                            "sec-fetch-mode": "navigate",
                            "sec-fetch-site": "none",
                            "sec-fetch-user": "?1",
                            "upgrade-insecure-requests": "1"
                        },
                        keepalive: true,
                        "body": null,
                        "method": "GET",
                        "mode": "cors",
                        "credentials": "include"
                        
                    });
                    pwdstr = await streamAndMatch(res, /auth_img\.php\?pwdstr=([a-zA-Z0-9_-]+)/);
                    console.log('Time taken', Date.now() - startTime);
                    startTime = Date.now();
                    
                    //fetch the image from the url and send as base64
                    console.log("pwdstr: ", pwdstr)
                    console.log('Fetching CAPTCHA')
                    answer = await fetch(`https://ocr.nthumods.com/?url=https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/auth_img.php?pwdstr=${pwdstr}`)
                                .then(res => res.text())
                    console.log('Time taken', Date.now() - startTime);
                    startTime = Date.now();
                    if(answer.length == 6) break;
                } catch (err) { 
                    console.error('fetch login err',err)
                    // throw new Error(LoginError.Unknown);
                    continue;
                }
            } while (tries <= 5);
            if(tries == 6 || answer.length != 6) {
                throw new Error("Internal Server Error");
            }
            console.log('Attempt Login')
            const response = await fetchWithTimeout("https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/pre_select_entry.php", {
                timeout: 3000,
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
                keepalive: true,
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
                keepalive: true,
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
            console.log('Time taken', Date.now() - startTime);
            startTime = Date.now();

            const passwordExpired = !!newHTML.match('個人密碼修改');
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
                return { ACIXSTORE, passwordExpired };
            }
        }
        const result = await ocrAndLogin();

        console.log('Fetching user details')
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
            .then(arrayBuffer => new TextDecoder('big5').decode(new Uint8Array(arrayBuffer)))
        const { document: doc } = parseHTML(html, 'text/html');

        const form = doc.querySelector('form[name="register"]');
        if(form == null) {
            throw new Error(LoginError.Unknown);
        }

        console.log('Time taken', Date.now() - startTime);
        startTime = Date.now();

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
        const accessToken = await mintFirebaseToken(data);

        // Encrypt user password 
        const encryptedPassword = await encrypt(password);
        
        return { ...result, encryptedPassword, accessToken };
    } catch (err) {
        console.error('CCXP Login Err', err);
        if(err instanceof Error) return { error: { message: err.message } };
        throw err;
    }
}

type RefreshUserSessionResponse = Promise<{ ACIXSTORE: string, passwordExpired: boolean, accessToken: string } | { error: { message: string } }>;
export const refreshUserSession = async (studentid: string, encryptedPassword: string): RefreshUserSessionResponse => {
    console.log('Refreshing User Session')
    // Decrypt password
    const password =  await decrypt(encryptedPassword);

    const res = await signInToCCXP(studentid, password);
    if('error' in res && res.error) {
        console.error(res.error);
        return { error: res.error }
    }
    // @ts-ignore - We know that res is not an error
    return { ACIXSTORE: res.ACIXSTORE, passwordExpired: res.passwordExpired, accessToken: res.accessToken };
}

export const updateUserPassword = async (ACIXSTORE: string, oldEncryptedPassword: string, newPassword: string) => {
    // Decrypt old password
    const oldPassword = await decrypt(oldEncryptedPassword);
    fetch("https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/PC/1/1.1/PC11002.php", {
        "headers": {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "max-age=0",
          "content-type": "application/x-www-form-urlencoded",
          "sec-ch-ua": "\"Not)A;Brand\";v=\"99\", \"Microsoft Edge\";v=\"127\", \"Chromium\";v=\"127\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "frame",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        },
        "referrer": "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/PC/1/1.1/PC11001.php?ACIXSTORE=c3d1ipem8trmvk6gpq5mrv9490",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": `ACIXSTORE=${ACIXSTORE}&O_PASS=${oldPassword}&N_PASS=${newPassword}&N_PASS2=${newPassword}&choice=確定`,
        "method": "POST",
        "mode": "cors",
        "credentials": "include"
      });

    // Encrypt new password
    const newEncryptedPassword = await encrypt(newPassword);
    return newEncryptedPassword;
}