import type { NthuUser, Scopes, Token } from "./types";
type NthuAuthFlow = {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scope: Scopes[];
  state: string;
  code: string | undefined;
  token: Token | undefined;
};
export declare class AuthFlow {
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
  }: NthuAuthFlow);
  redirect(): string;
  private getTokenFromCode;
  getUserData(): Promise<void>;
}
export {};
