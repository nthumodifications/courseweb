export type HeadlessAISStorage =
  | { enabled: false }
  | {
      enabled: true;
      studentid: string;
      user: UserJWTDetails;
      ACIXSTORE?: string;
      credentialToken?: string; // Present when server-side credential storage is opted in
      lastUpdated: number;
      expired: boolean;
    };

export enum LoginError {
  IncorrectCredentials = "IncorrectCredentials",
  CaptchaError = "CaptchaError",
  Unknown = "Unknown",
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
