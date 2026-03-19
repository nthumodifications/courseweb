export type HeadlessAISStorage =
  | { enabled: false }
  | {
      enabled: true;
      studentid: string;
      user: UserJWTDetails;
      ACIXSTORE?: string;
      hasStoredCredentials: boolean; // Whether server-side creds exist (token in httpOnly cookie)
      lastUpdated: number;
      expired: boolean;
      consentGiven: boolean; // User acknowledged privacy risks
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
