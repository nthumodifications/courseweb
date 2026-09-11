import { describe, expect, it } from "bun:test";
import {
  CONSENT_REQUEST_EXPIRY,
  coversScopes,
  isConsentRequired,
  isPendingConsentValid,
  sameScopes,
} from "./consent";

describe("sameScopes", () => {
  it("ignores ordering", () => {
    expect(sameScopes(["openid", "email"], ["email", "openid"])).toBe(true);
  });

  it("rejects a superset", () => {
    expect(sameScopes(["openid"], ["openid", "email"])).toBe(false);
  });
});

describe("coversScopes", () => {
  it("accepts a grant wider than the request", () => {
    expect(coversScopes(["openid", "profile", "email"], ["openid"])).toBe(true);
  });

  it("rejects a request reaching past the grant", () => {
    expect(coversScopes(["openid", "profile"], ["openid", "kv"])).toBe(false);
  });
});

describe("isConsentRequired", () => {
  const third = { firstParty: false, requestedScopes: ["openid", "profile"] };

  it("asks a third-party client the user has never seen", () => {
    expect(isConsentRequired({ ...third, grantedScopes: null })).toBe(true);
  });

  it("does not ask again once the grant covers the request", () => {
    expect(
      isConsentRequired({ ...third, grantedScopes: ["openid", "profile"] }),
    ).toBe(false);
  });

  it("asks again when the client widens its request", () => {
    expect(
      isConsentRequired({
        firstParty: false,
        grantedScopes: ["openid", "profile"],
        requestedScopes: ["openid", "profile", "calendar"],
      }),
    ).toBe(true);
  });

  it("does not ask for first-party clients", () => {
    expect(
      isConsentRequired({
        firstParty: true,
        grantedScopes: null,
        requestedScopes: ["openid", "kv"],
      }),
    ).toBe(false);
  });

  it("always asks on prompt=consent, first-party included", () => {
    expect(
      isConsentRequired({
        firstParty: true,
        prompt: "consent",
        grantedScopes: ["openid", "kv"],
        requestedScopes: ["openid"],
      }),
    ).toBe(true);
  });
});

describe("isPendingConsentValid", () => {
  const now = new Date("2026-09-10T12:00:00Z");
  const pending = {
    sessionId: "session-1",
    clientId: "chumei-observe",
    redirectUri: "https://chumei.observe.tw/auth/callback",
    scopes: ["openid", "profile"],
    createdAt: new Date(now.getTime() - 60_000),
  };
  const request = {
    sessionId: "session-1",
    clientId: "chumei-observe",
    redirectUri: "https://chumei.observe.tw/auth/callback",
    scope: ["profile", "openid"],
    now,
  };

  it("accepts the request the screen was rendered for", () => {
    expect(isPendingConsentValid(pending, request)).toBe(true);
  });

  it("rejects a token the client invented", () => {
    expect(isPendingConsentValid(null, request)).toBe(false);
  });

  it("rejects a token lifted into another browser session", () => {
    expect(
      isPendingConsentValid(pending, { ...request, sessionId: "session-2" }),
    ).toBe(false);
  });

  it("rejects reuse by a different client", () => {
    expect(
      isPendingConsentValid(pending, { ...request, clientId: "nthumods" }),
    ).toBe(false);
  });

  it("rejects a swapped redirect_uri", () => {
    expect(
      isPendingConsentValid(pending, {
        ...request,
        redirectUri: "https://chumei.observe.tw/auth/silent",
      }),
    ).toBe(false);
  });

  it("rejects scopes widened after the screen was shown", () => {
    expect(
      isPendingConsentValid(pending, {
        ...request,
        scope: ["openid", "profile", "calendar"],
      }),
    ).toBe(false);
  });

  it("rejects an expired approval", () => {
    expect(
      isPendingConsentValid(
        {
          ...pending,
          createdAt: new Date(now.getTime() - CONSENT_REQUEST_EXPIRY - 1000),
        },
        request,
      ),
    ).toBe(false);
  });
});
