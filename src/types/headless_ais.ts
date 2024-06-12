import { cookies } from "next/headers";

export const getServerACIXSTORE = async () => {
    const cookie = await cookies();
    const ACIXSTORE = cookie.get('ACIXSTORE')?.value;
    return ACIXSTORE;
}

export type HeadlessAISStorage = { enabled: false } | {
    enabled: true, 
    studentid: string, 
    password: string, 
    encrypted: boolean,
    ACIXSTORE?: string, 
    lastUpdated: number,
}

export enum LoginError {
    IncorrectCredentials = "IncorrectCredentials",
    CaptchaError = "CaptchaError",
    Unknown = "Unknown"
}

export interface UserJWTDetails {
    studentid: string;
    name_zh: string;
    name_en: string;
    department: string;
    grade: string;
    email: string;
}

export type UserJWT = UserJWTDetails;