import { beforeEach, describe, expect, mock, test } from "bun:test";
import { exportPKCS8, generateKeyPair } from "jose";

const tokenFindUnique = mock();
const tokenFindFirst = mock();
const clientFindUnique = mock();
const userFindUnique = mock();

const prisma = {
  token: {
    findUnique: tokenFindUnique,
    findFirst: tokenFindFirst,
  },
  client: { findUnique: clientFindUnique },
  authCode: {},
  user: { findUnique: userFindUnique },
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
});
