import { describe, expect, it, mock } from "bun:test";
import { refreshToken } from "../refreshToken";
import { HTTPException } from "hono/http-exception";
import { mockJsonResponse } from "../../__tests__/utils";

describe("refreshToken", () => {
  it("should refresh token successfully", async () => {
    // Create mock response for successful token refresh
    const mockResponse = {
      access_token: "new_access_token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "userid name",
      refresh_token: "new_refresh_token",
    };

    // Mock fetch directly with Bun's mock
    const originalFetch = globalThis.fetch;

    // Use Bun's mock function so we can check calls
    const fetchMock = mock(async () => {
      return mockJsonResponse(mockResponse);
    });

    globalThis.fetch = fetchMock;

    try {
      const result = await refreshToken(
        "client_id",
        "client_secret",
        "refresh_token",
      );

      // Check the result
      expect(result).toEqual(mockResponse);

      // Verify the fetch was called with correct parameters
      expect(fetchMock).toHaveBeenCalledWith(
        "https://oauth.ccxp.nthu.edu.tw/v1.1/token.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=refresh_token&refresh_token=refresh_token&client_id=client_id&client_secret=client_secret",
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should throw HTTPException on error", async () => {
    // Create mock for error response
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () => {
      return mockJsonResponse({ error: "invalid_grant" });
    });

    try {
      await expect(
        refreshToken("client_id", "client_secret", "invalid_token"),
      ).rejects.toThrow(HTTPException);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
