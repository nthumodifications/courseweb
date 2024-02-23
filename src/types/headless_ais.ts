import { cookies } from "next/headers";

export const getServerACIXSTORE = async () => {
    const cookie = await cookies();
    const ACIXSTORE = cookie.get('ACIXSTORE')?.value;
    return ACIXSTORE;
}

export enum LoginError {
    IncorrectCredentials = "IncorrectCredentials",
    CaptchaError = "CaptchaError",
    Unknown = "Unknown"
}
