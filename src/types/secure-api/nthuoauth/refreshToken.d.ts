import type { NthuTokenResponse } from "./types";
export declare function refreshToken(client_id: string, client_secret: string, refresh_token: string): Promise<NthuTokenResponse>;
