export type Scopes = "userid" | "name" | "email" | "inschool" | "cid" | "lmsid";

export type NthuErrorResponse = {
  // error = 錯誤訊息
  // error_description = 錯誤描述
  // TODO: validate error type

  error: string;
  error_description: string;
};

export type NthuTokenResponse = {
  // access_token = ACCESS_TOKEN
  // expires_in = expire time in seconds
  // token_type = Bearer
  // scope = SCOPE (以空白分隔)
  // refresh_token = REFRESH_TOKEN

  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token: string;
};

export type NthuUserInfoResponse = {
  // success = true/false 認證成功/認證失敗
  // userid = USERID 帳號
  // otp = true/false 已啟用OTP / 未啟用OTP
  // inschool = true/false 在職、在學、復學 / 離職、畢業、肄業、外校選修、.....
  // name = 中文姓名
  // name_en = 英文姓名
  // email = 電子郵件
  // lmsid = 學習平台帳號
  // cid = 身分證字號

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
