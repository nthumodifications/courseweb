import type { UserJWTDetails } from "@/types/headless_ais";
import client from "@/config/api";

// --- Response types (kept for external consumers) ---

export type LoginResponse = {
  ACIXSTORE: string;
  passwordExpired: boolean;
  data: UserJWTDetails;
  hasStoredCredentials: boolean;
};

export type RefreshResponse = {
  ACIXSTORE: string;
};

// --- Auth endpoints ---

export async function proxyLogin(
  studentid: string,
  password: string,
  storeCredentials = false,
): Promise<LoginResponse> {
  const res = await client.ccxp.auth.login.$post(
    {
      form: {
        studentid,
        password,
        ...(storeCredentials ? { store_credentials: "true" } : {}),
      },
    },
    { init: { credentials: "include" } },
  );

  const json = await res.json();
  if (!res.ok || "error" in json) {
    throw new Error((json as any).error?.message ?? "Login failed");
  }
  return json as LoginResponse;
}

export async function proxyRefresh(): Promise<RefreshResponse> {
  const res = await client.ccxp.auth.refresh.$post(
    {},
    { init: { credentials: "include" } },
  );

  const json = await res.json();
  if (!res.ok || "error" in json) {
    throw new Error((json as any).error?.message ?? "Refresh failed");
  }
  return json as RefreshResponse;
}

export async function proxyLogout(): Promise<void> {
  await client.ccxp.auth.logout.$post({}, { init: { credentials: "include" } });
}

// --- Data endpoints ---

export function fetchGrades(ACIXSTORE: string) {
  return client.ccxp.grades
    .$post({
      form: { ACIXSTORE },
    })
    .then((res) => res.json());
}

export function fetchOSACode(ACIXSTORE: string) {
  return client.ccxp.inthu.code
    .$post({
      form: { ACIXSTORE },
    })
    .then((res) => res.json());
}

export function fetchOSAToken(userId: string, refreshToken: string) {
  return client.ccxp.inthu.token
    .$post({
      form: { user_id: userId, refreshToken },
    })
    .then((res) => res.json());
}

export function fetchDoorQR(
  authToken: string,
  deviceId: string,
  sessionId: string,
) {
  return client.ccxp.inthu["door-access-qr"]
    .$post({
      form: { authToken, deviceId, session_id: sessionId },
    })
    .then((res) => res.json());
}

export function fetchParcels(
  authToken: string,
  deviceId: string,
  sessionId: string,
) {
  return client.ccxp.inthu["parcel-information"]
    .$post({
      form: { authToken, deviceId, session_id: sessionId },
    })
    .then((res) => res.json());
}
