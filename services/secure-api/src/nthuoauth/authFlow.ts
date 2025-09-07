import { HTTPException } from "hono/http-exception";
import type {
  NthuErrorResponse,
  NthuTokenResponse,
  NthuUser,
  NthuUserInfoResponse,
  Scopes,
  Token,
} from "./types";
import { toQueryParams } from "../utils/objectToQuery";

type NthuAuthFlow = {
  // client_id = 帳號
  // response_type= code
  // redirect_uri = 認證後callback的url
  // scope = 要求的授權資料(以半形空白分隔) [userid] [name] [email] [inschool] [cid] [lmsid]
  // ui_locales = 顯示的語言 [ en-US | zh-TW ]
  // state = 應用程式端需要帶回的資料

  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scope: Scopes[];
  state: string;
  code: string | undefined;
  token: Token | undefined;
};

export class AuthFlow {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scope: string;
  state: string;
  code: string | undefined;
  token: Token | undefined;
  refresh_token: Token | undefined;
  granted_scopes: string[] | undefined;
  user: Partial<NthuUser> | undefined;

  constructor({
    client_id,
    client_secret,
    redirect_uri,
    scope,
    state,
    code,
    token,
  }: NthuAuthFlow) {
    this.client_id = client_id;
    this.client_secret = client_secret;
    this.redirect_uri = redirect_uri;
    this.scope = scope.join(" ");
    this.state = state;
    this.code = code;
    this.refresh_token = undefined;
    this.token = token;
    this.granted_scopes = undefined;
    this.user = undefined;
  }

  redirect() {
    const parsedOptions = toQueryParams({
      response_type: "code",
      client_id: this.client_id,
      scope: this.scope,
      state: this.state,
      prompt: "consent",
      redirect_uri: this.redirect_uri,
    });
    return `https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?${parsedOptions}`;
  }

  private async getTokenFromCode() {
    const parsedOptions = toQueryParams({
      client_id: this.client_id,
      client_secret: this.client_secret,
      grant_type: "authorization_code",
      code: this.code,
      redirect_uri: this.redirect_uri,
    });

    const url = "https://oauth.ccxp.nthu.edu.tw/v1.1/token.php";

    const response = (await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: parsedOptions,
    }).then((res) => res.json())) as NthuTokenResponse | NthuErrorResponse;

    if ("error" in response) {
      throw new HTTPException(400, { message: response.error_description });
    }

    //   if ('error_description' in response) {
    //     throw new HTTPException(400, { message: response.error_description })
    //   }
    //   if ('error' in response) {
    //     throw new HTTPException(400, { message: response.error })
    //   }
    //   if ('message' in response) {
    //     throw new HTTPException(400, { message: response.message })
    //   }

    if ("access_token" in response) {
      this.token = {
        token: response.access_token,
        expires_in: response.expires_in,
      };
    }

    if ("refresh_token" in response) {
      this.refresh_token = {
        token: response.refresh_token,
        expires_in: 0,
      };
    }
    if ("scope" in response) {
      this.granted_scopes = response.scope.split(" ");
    }
  }

  async getUserData() {
    await this.getTokenFromCode();
    const url = "https://oauth.ccxp.nthu.edu.tw/v1.1/resource.php";
    const response = (await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token?.token}`,
      },
    }).then((res) => res.json())) as NthuUserInfoResponse;

    if (!response.success) {
      throw new HTTPException(400, { message: "Failed to get user data" });
    }

    this.user = {
      userid: response.userid,
      name: response.name,
      name_en: response.name_en,
      email: response.email,
      inschool: response.inschool,
      cid: response.cid,
      lmsid: response.lmsid,
    };
  }
}
