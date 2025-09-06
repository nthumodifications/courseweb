import { describe, expect, it, mock } from "bun:test";
import { AuthFlow } from "../authFlow";
import { HTTPException } from "hono/http-exception";
import { mockJsonResponse } from "../../__tests__/utils";

describe("AuthFlow", () => {
  // Keep the URL test as is - no changes needed
  it("should create redirect URL correctly", () => {
    const authFlow = new AuthFlow({
      client_id: "test_client",
      client_secret: "test_secret",
      redirect_uri: "https://example.com/callback",
      scope: ["userid", "name"],
      state: "test_state",
      code: undefined,
      token: undefined,
    });

    const redirectUrl = authFlow.redirect();

    // Create an actual URL object to parse the components
    const url = new URL(redirectUrl);

    // Test the base URL
    expect(url.origin + url.pathname).toBe(
      "https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php",
    );

    // Test each query parameter individually
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("test_client");
    expect(url.searchParams.get("scope")).toBe("userid name");
    expect(url.searchParams.get("state")).toBe("test_state");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://example.com/callback",
    );
  });

  it("should get token from code successfully", async () => {
    // Mock fetch directly to allow assertions
    const originalFetch = globalThis.fetch;
    const fetchMock = mock(async (url) => {
      if (url === "https://oauth.ccxp.nthu.edu.tw/v1.1/token.php") {
        return mockJsonResponse({
          access_token: "test_access_token",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "userid name",
          refresh_token: "test_refresh_token",
        });
      }
      return mockJsonResponse({});
    });

    globalThis.fetch = fetchMock;

    try {
      const authFlow = new AuthFlow({
        client_id: "test_client",
        client_secret: "test_secret",
        redirect_uri: "https://example.com/callback",
        scope: ["userid", "name"],
        state: "test_state",
        code: "test_code",
        token: undefined,
      });

      await authFlow["getTokenFromCode"]();

      expect(authFlow.token).toEqual({
        token: "test_access_token",
        expires_in: 3600,
      });
      expect(authFlow.refresh_token).toEqual({
        token: "test_refresh_token",
        expires_in: 0,
      });
      expect(authFlow.granted_scopes).toEqual(["userid", "name"]);

      // Check that fetch was called with the right URL
      expect(fetchMock).toHaveBeenCalledWith(
        "https://oauth.ccxp.nthu.edu.tw/v1.1/token.php",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should get user data successfully", async () => {
    // Mock fetch to handle both token and resource endpoints
    const originalFetch = globalThis.fetch;
    let tokenCalled = false;

    const fetchMock = mock(async (url) => {
      if (url === "https://oauth.ccxp.nthu.edu.tw/v1.1/token.php") {
        tokenCalled = true;
        return mockJsonResponse({
          access_token: "test_access_token",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "userid name",
          refresh_token: "test_refresh_token",
        });
      } else if (url === "https://oauth.ccxp.nthu.edu.tw/v1.1/resource.php") {
        // Only return user data if token was called first
        if (tokenCalled) {
          return mockJsonResponse({
            success: true,
            userid: "test_user",
            otp: false,
            inschool: true,
            name: "Test User",
            name_en: "Test User En",
            email: "test@example.com",
            lmsid: "test_lmsid",
            cid: "test_cid",
          });
        }
      }
      return mockJsonResponse({});
    });

    globalThis.fetch = fetchMock;

    try {
      const authFlow = new AuthFlow({
        client_id: "test_client",
        client_secret: "test_secret",
        redirect_uri: "https://example.com/callback",
        scope: ["userid", "name"],
        state: "test_state",
        code: "test_code",
        token: undefined,
      });

      await authFlow.getUserData();

      expect(authFlow.user).toEqual({
        userid: "test_user",
        name: "Test User",
        name_en: "Test User En",
        email: "test@example.com",
        inschool: true,
        cid: "test_cid",
        lmsid: "test_lmsid",
      });

      // Verify fetch was called for both endpoints
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should throw exception on token error", async () => {
    // Mock fetch for error response
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => {
      return mockJsonResponse({
        error: "invalid_grant",
        error_description: "Invalid authorization code",
      });
    });

    try {
      const authFlow = new AuthFlow({
        client_id: "test_client",
        client_secret: "test_secret",
        redirect_uri: "https://example.com/callback",
        scope: ["userid", "name"],
        state: "test_state",
        code: "invalid_code",
        token: undefined,
      });

      await expect(authFlow["getTokenFromCode"]()).rejects.toThrow(
        HTTPException,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should throw exception on user data error", async () => {
    // Mock fetch to succeed for token but fail for resource
    const originalFetch = globalThis.fetch;
    let callCount = 0;

    globalThis.fetch = mock(async () => {
      callCount++;
      if (callCount === 1) {
        // First call is for token
        return mockJsonResponse({
          access_token: "test_access_token",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "userid name",
          refresh_token: "test_refresh_token",
        });
      } else {
        // Second call is for user data
        return mockJsonResponse({
          success: false,
        });
      }
    });

    try {
      const authFlow = new AuthFlow({
        client_id: "test_client",
        client_secret: "test_secret",
        redirect_uri: "https://example.com/callback",
        scope: ["userid", "name"],
        state: "test_state",
        code: "test_code",
        token: undefined,
      });

      await expect(authFlow.getUserData()).rejects.toThrow(HTTPException);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
