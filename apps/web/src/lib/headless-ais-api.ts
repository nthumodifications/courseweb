import type { UserJWTDetails } from "@/types/headless_ais";

const API_BASE =
  import.meta.env.VITE_COURSEWEB_API_URL ?? "https://api.nthumods.com";

export type LoginResponse = {
  ACIXSTORE: string;
  passwordExpired: boolean;
  data: UserJWTDetails;
  hasStoredCredentials: boolean;
};

export type RefreshResponse = {
  ACIXSTORE: string;
};

async function post<T>(path: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
    credentials: "include", // Send httpOnly cookies
  });

  const json = await res.json();

  if (!res.ok || (json as any).error) {
    throw new Error((json as any).error?.message ?? "Request failed");
  }

  return json as T;
}

export function proxyLogin(
  studentid: string,
  password: string,
  storeCredentials = false,
): Promise<LoginResponse> {
  return post<LoginResponse>("/ccxp/auth/login", {
    studentid,
    password,
    ...(storeCredentials ? { store_credentials: "true" } : {}),
  });
}

// credential_token is sent automatically via httpOnly cookie
export function proxyRefresh(): Promise<RefreshResponse> {
  return post<RefreshResponse>("/ccxp/auth/refresh", {});
}

// credential_token is sent automatically via httpOnly cookie
export function proxyLogout(): Promise<void> {
  return post<void>("/ccxp/auth/logout", {});
}

export function fetchGrades(ACIXSTORE: string) {
  return post<unknown>("/ccxp/grades", { ACIXSTORE });
}

export function fetchOSACode(ACIXSTORE: string) {
  return post<unknown>("/ccxp/inthu/code", { ACIXSTORE });
}

export function fetchOSAToken(userId: string, refreshToken: string) {
  return post<unknown>("/ccxp/inthu/token", {
    user_id: userId,
    refresh_token: refreshToken,
  });
}

export function fetchDoorQR(
  authToken: string,
  deviceId: string,
  sessionId: string,
) {
  return post<unknown>("/ccxp/inthu/door-access-qr", {
    auth_token: authToken,
    device_id: deviceId,
    session_id: sessionId,
  });
}

export function fetchParcels(
  authToken: string,
  deviceId: string,
  sessionId: string,
) {
  return post<unknown>("/ccxp/inthu/parcel-information", {
    auth_token: authToken,
    device_id: deviceId,
    session_id: sessionId,
  });
}
