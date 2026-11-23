import { describe, expect, test } from "bun:test";
import { clientUriSchema, redirectUriSchema } from "./clientUrls";

const isHttpUrl = (value: string) => clientUriSchema.safeParse(value).success;
const isSafeRedirectUri = (value: string) =>
  redirectUriSchema.safeParse(value).success;

describe("clientUriSchema (a client's homepage link on the consent screen)", () => {
  test.each(["https://example.com", "http://localhost:3000/app"])(
    "accepts %s",
    (url) => {
      expect(isHttpUrl(url)).toBe(true);
    },
  );

  test.each([
    "javascript:alert(document.domain)",
    "JAVASCRIPT:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "myapp://home",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isHttpUrl(url)).toBe(false);
  });
});

describe("redirectUriSchema (where codes are sent, and the consent screen's deny link)", () => {
  test.each([
    "https://example.com/callback",
    "http://localhost:5173/auth/callback",
    // Native apps register their own scheme.
    "com.example.app:/oauth2redirect",
    "myapp://callback",
  ])("accepts %s", (uri) => {
    expect(isSafeRedirectUri(uri)).toBe(true);
  });

  test.each([
    "javascript:alert(document.domain)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "blob:https://example.com/1234",
    "not a url",
  ])("rejects %s", (uri) => {
    expect(isSafeRedirectUri(uri)).toBe(false);
  });
});

test("both schemas trim surrounding whitespace, as the form did before", () => {
  expect(clientUriSchema.parse("  https://example.com  ")).toBe(
    "https://example.com",
  );
  expect(redirectUriSchema.parse("  myapp://callback  ")).toBe(
    "myapp://callback",
  );
});
