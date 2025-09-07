import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import nthuAuth from "../nthuAuth";
import { setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";

// Mock dependencies
mock.module("hono/cookie", () => ({
  getCookie: mock(() => "test_state"),
  setCookie: mock(() => {}),
}));

mock.module("../utils/getRandomState", () => ({
  getRandomState: mock(() => "test_state"),
}));

describe("nthuAuth middleware", () => {
  interface MockContext {
    req: {
      url: string;
      query: (key: string) => string | undefined;
    };
    redirect: () => string;
    set: (key: string, value: any) => void;
  }

  let mockContext: MockContext;
  interface NextFunction {
    (): Promise<void>;
  }

  let nextMock: NextFunction;

  beforeEach(() => {
    // Create a mock context object
    mockContext = {
      req: {
        url: "https://example.com/auth",
        query: mock((key: string) => {
          const params: Record<string, string> = {
            code: "test_code",
            state: "test_state",
            access_token: "test_token",
            expires_in: "3600",
          };
          return params[key];
        }),
      },
      redirect: mock(() => "redirected"),
      set: mock(() => {}),
    };

    nextMock = mock(() => Promise.resolve());

    // Create a mock AuthFlow class
    mock.module("../authFlow", () => {
      class MockAuthFlow {
        code;
        token = { token: "mock_token", expires_in: 3600 };
        refresh_token = { token: "mock_refresh_token", expires_in: 0 };
        user = { userid: "test_user" };
        granted_scopes = ["userid", "name"];

        constructor(options: { code: string }) {
          this.code = options.code;
        }

        redirect() {
          return "https://oauth.ccxp.nthu.edu.tw/mock-redirect";
        }

        getUserData = mock(() => Promise.resolve());
      }

      return { AuthFlow: MockAuthFlow };
    });
  });

  afterEach(() => {
    // Clean up mocks
    mock.restore();
  });

  it("should redirect to login if no code is provided", async () => {
    // Create a no-code context
    const noCodeContext = {
      ...mockContext,
      req: {
        ...mockContext.req,
        query: mock(() => undefined),
      },
    };

    const middleware = nthuAuth({
      scopes: ["userid", "name"],
      client_id: "test_client",
      client_secret: "test_secret",
    });

    await middleware(noCodeContext as any, nextMock);

    // Check if setCookie was called
    expect(setCookie).toHaveBeenCalled();
    // Check if redirect was called
    expect(noCodeContext.redirect).toHaveBeenCalled();
  });

  it("should validate state parameter", async () => {
    // Setup mock to return mismatched state
    mock.module("hono/cookie", () => ({
      getCookie: mock(() => "different_state"),
      setCookie: mock(() => {}),
    }));

    // Create a context with state in URL
    const stateContext = {
      ...mockContext,
      req: {
        ...mockContext.req,
        url: "https://example.com/auth?code=test_code&state=test_state",
      },
    };

    const middleware = nthuAuth({
      scopes: ["userid", "name"],
      client_id: "test_client",
      client_secret: "test_secret",
    });

    // Expect middleware to throw due to state mismatch
    try {
      // Cast the mock context to any to bypass type checking
      await middleware(stateContext as any, nextMock);
      // If we get here, the test fails
      expect(true).toBe(false); // Force test to fail
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      if (error instanceof HTTPException) {
        expect(error.status).toBe(401);
      }
    }
  });

  it("should set user data and tokens when authentication succeeds", async () => {
    const middleware = nthuAuth({
      scopes: ["userid", "name"],
      client_id: "test_client",
      client_secret: "test_secret",
    });

    await middleware(mockContext as any, nextMock);

    // Verify that context variables were set
    expect(mockContext.set).toHaveBeenCalledWith("token", {
      token: "mock_token",
      expires_in: 3600,
    });
    expect(mockContext.set).toHaveBeenCalledWith("refresh-token", {
      token: "mock_refresh_token",
      expires_in: 0,
    });
    expect(mockContext.set).toHaveBeenCalledWith("user", {
      userid: "test_user",
    });
    expect(mockContext.set).toHaveBeenCalledWith("granted-scopes", [
      "userid",
      "name",
    ]);

    // Check that next middleware was called
    expect(nextMock).toHaveBeenCalled();
  });
});
