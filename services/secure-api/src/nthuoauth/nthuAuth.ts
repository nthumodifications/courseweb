import type { NthuUser, Scopes, Token } from "./types";
import { getRandomState } from "../utils/getRandomState";
import { AuthFlow } from "./authFlow";
import { getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { createMiddleware } from "hono/factory";

const nthuAuth = (options: {
  scopes: Scopes[];
  client_id: string;
  client_secret: string;
  redirect_uri?: string;
  state?: string;
}) =>
  createMiddleware<{
    Variables: {
      user: Partial<NthuUser> | undefined;
      token: Token | undefined;
      "refresh-token": Token | undefined;
      "granted-scopes": string[] | undefined;
      state: string | undefined;
    };
  }>(async (c, next) => {
    const state = options.state ?? getRandomState();

    const auth = new AuthFlow({
      client_id: options.client_id,
      client_secret: options.client_secret,
      redirect_uri: options.redirect_uri ?? c.req.url.split("?")[0],
      scope: options.scopes,
      state: state,
      code: c.req.query("code"),
      token: {
        token: c.req.query("access_token") as string,
        expires_in: Number(c.req.query("expires_in")),
      },
    });

    // Redirect to login dialog
    if (!auth.code) {
      setCookie(c, "state", state, {
        maxAge: 60 * 10,
        httpOnly: true,
        path: "/",
        // secure: true,
      });
      return c.redirect(auth.redirect());
    }

    // Avoid CSRF attack by checking state
    if (c.req.url.includes("?")) {
      const storedState = getCookie(c, "state");
      if (c.req.query("state") !== storedState) {
        throw new HTTPException(401);
      }
    }

    // Retrieve user data from NthuOauth
    await auth.getUserData();

    // Set return info
    c.set("token", auth.token);
    c.set("refresh-token", auth.refresh_token);
    c.set("user", auth.user);
    c.set("granted-scopes", auth.granted_scopes);
    c.set("state", auth.state);

    await next();
  });

export default nthuAuth;
