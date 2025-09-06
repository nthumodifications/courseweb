import { type FC } from "hono/jsx";
export declare const AuthPageZH: FC<{
  authUrl: string;
}>;
export declare const AuthConfirmation: FC<{
  client_id: string;
  redirect_uri: string;
  scope: string;
  state: string;
  response_type?: string;
  nonce?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  ui_locales?: string;
}>;
