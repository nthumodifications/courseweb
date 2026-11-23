import { beforeEach, describe, expect, mock, test } from "bun:test";
import { exportPKCS8, generateKeyPair } from "jose";

const tokenFindUnique = mock();
const tokenFindFirst = mock();
const clientFindUnique = mock();
const userFindUnique = mock();
const tokenCreate = mock();
const tokenDelete = mock();
const authCodeFindUnique = mock();
const authCodeDelete = mock();
const transaction = mock();

const prisma = {
  token: {
    findUnique: tokenFindUnique,
    findFirst: tokenFindFirst,
    create: tokenCreate,
    delete: tokenDelete,
  },
  client: { findUnique: clientFindUnique },
  authCode: { findUnique: authCodeFindUnique, delete: authCodeDelete },
  user: { findUnique: userFindUnique },
  $transaction: transaction,
};

mock.module("./client", () => ({ default: prisma }));

const { default: oidcApp } = await import("./oidc");
const { privateKey } = await generateKeyPair("RS256", { extractable: true });
const testPrivateKey = await exportPKCS8(privateKey);
process.env.JWT_PRIVATE_KEY = testPrivateKey;

describe("secure-api OIDC bug hunt", () => {
  beforeEach(() => {
    tokenFindUnique.mockReset();
    tokenFindFirst.mockReset();
    clientFindUnique.mockReset();
    userFindUnique.mockReset();
    tokenCreate.mockReset();
    tokenDelete.mockReset();
    authCodeFindUnique.mockReset();
    authCodeDelete.mockReset();
    transaction.mockReset();
  });

  test("keeps valid Basic introspection responses compatible", async () => {
    clientFindUnique.mockResolvedValue({
      clientId: "introspect-client",
      clientSecret: "secret",
      scopes: ["introspect:target-client"],
    });
    tokenFindUnique.mockResolvedValue(null);

    const response = await oidcApp.request("/introspect", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa("introspect-client:secret")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "token=opaque",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ active: false });
  });

  test("rejects non-Basic and malformed introspection credentials as 4xx", async () => {
    const bearer = await oidcApp.request("/introspect", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${btoa("introspect-client:secret")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "token=opaque",
    });
    expect(bearer.status).toBe(400);

    const malformed = await oidcApp.request("/introspect", {
      method: "POST",
      headers: {
        Authorization: "Basic not-base64!!!",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "token=opaque",
    });
    expect(malformed.status).toBe(400);
    expect(clientFindUnique).not.toHaveBeenCalled();
  });

  test("keeps userinfo successful response private", async () => {
    tokenFindFirst.mockResolvedValue({
      userId: "user-1",
      type: "ACCESS",
      expiresAt: new Date(Date.now() + 60_000),
      scopes: ["openid"],
    });
    userFindUnique.mockResolvedValue({ userId: "user-1" });

    const response = await oidcApp.request("/userinfo", {
      headers: { Authorization: "Bearer access-token" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ sub: "user-1" });
  });

  describe("a suspended account", () => {
    const introspect = () =>
      oidcApp.request("/introspect", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa("introspect-client:secret")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "token=opaque",
      });

    const liveAccessToken = {
      token: "opaque",
      userId: "user-1",
      type: "ACCESS",
      clientId: "target-client",
      scopes: ["openid", "calendar"],
      expiresAt: new Date(Date.now() + 60_000),
    };

    const tokenRequest = (fields: Record<string, string>) =>
      oidcApp.request("/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(fields),
      });

    const liveAuthCode = {
      code: "auth-code",
      userId: "user-1",
      clientId: "web",
      redirectUri: "https://nthumods.com/auth/callback",
      scopes: ["openid", "offline_access"],
      nonce: null,
      codeChallenge: null,
      codeChallengeMethod: null,
      expiresAt: new Date(Date.now() + 60_000),
    };

    test("introspection reports an active token for an account in good standing", async () => {
      clientFindUnique.mockResolvedValue({
        clientId: "introspect-client",
        clientSecret: "secret",
        scopes: ["introspect:target-client"],
      });
      tokenFindUnique.mockResolvedValue(liveAccessToken);
      userFindUnique.mockResolvedValue({ userId: "user-1", banned: false });

      const response = await introspect();

      expect(await response.json()).toMatchObject({
        active: true,
        username: "user-1",
        client_id: "target-client",
      });
    });

    test("introspection reports its tokens as inactive", async () => {
      clientFindUnique.mockResolvedValue({
        clientId: "introspect-client",
        clientSecret: "secret",
        scopes: ["introspect:target-client"],
      });
      tokenFindUnique.mockResolvedValue(liveAccessToken);
      userFindUnique.mockResolvedValue({ userId: "user-1", banned: true });

      const response = await introspect();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ active: false });
    });

    test("is refused at userinfo", async () => {
      tokenFindFirst.mockResolvedValue(liveAccessToken);
      userFindUnique.mockResolvedValue({
        userId: "user-1",
        name: "Suspended User",
        email: "suspended@example.com",
        banned: true,
      });

      const response = await oidcApp.request("/userinfo", {
        headers: { Authorization: "Bearer opaque" },
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "account_suspended" });
    });

    test("cannot exchange an authorization code issued before the ban", async () => {
      authCodeFindUnique.mockResolvedValue(liveAuthCode);
      userFindUnique.mockResolvedValue({ userId: "user-1", banned: true });

      const response = await tokenRequest({
        grant_type: "authorization_code",
        code: "auth-code",
        client_id: "web",
        redirect_uri: "https://nthumods.com/auth/callback",
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_grant" });
      expect(tokenCreate).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
      expect(authCodeDelete).toHaveBeenCalledWith({
        where: { code: "auth-code" },
      });
    });

    test("cannot refresh, and the refresh token is discarded", async () => {
      tokenFindUnique.mockResolvedValue({
        ...liveAccessToken,
        token: "refresh-token",
        type: "REFRESH",
      });
      userFindUnique.mockResolvedValue({ userId: "user-1", banned: true });

      const response = await tokenRequest({
        grant_type: "refresh_token",
        refresh_token: "refresh-token",
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_grant" });
      expect(tokenCreate).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
      expect(tokenDelete).toHaveBeenCalledWith({
        where: { token: "refresh-token" },
      });
    });
  });
});
