export type Scopes = "userid" | "name" | "email" | "inschool" | "cid" | "lmsid";
export type NthuErrorResponse = {
    error: string;
    error_description: string;
};
export type NthuTokenResponse = {
    access_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
    refresh_token: string;
};
export type NthuUserInfoResponse = {
    success: boolean;
    userid: string;
    otp: boolean;
    inschool: boolean;
    name: string;
    name_en: string;
    email: string;
    lmsid: string;
    cid: string;
};
export type NthuUser = {
    userid: string;
    name: string;
    name_en: string;
    email: string;
    inschool: boolean;
    cid: string;
    lmsid: string;
};
export type Token = {
    token: string;
    expires_in?: number;
};
export type OAuthVariables = {
    token: Token | undefined;
    "refresh-token": Token | undefined;
    "granted-scopes": string[] | undefined;
};
