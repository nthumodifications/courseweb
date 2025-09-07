import { HTTPException } from "hono/http-exception";
import type { NthuTokenResponse } from "./types";
import { toQueryParams } from "../utils/objectToQuery";

export async function refreshToken(
  client_id: string,
  client_secret: string,
  refresh_token: string,
): Promise<NthuTokenResponse> {
  const params = toQueryParams({
    grant_type: "refresh_token",
    refresh_token,
    client_id,
    client_secret,
  });

  const response = (await fetch(
    "https://oauth.ccxp.nthu.edu.tw/v1.1/token.php",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  ).then((res) => res.json())) as NthuTokenResponse | { error: string };

  if ("error" in response) {
    throw new HTTPException(400, { message: response.error });
  }

  return response;
}
