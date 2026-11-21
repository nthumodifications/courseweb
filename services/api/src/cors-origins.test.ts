import { describe, expect, test } from "bun:test";
import { allowedCorsOrigin } from "./cors-origins";

describe("allowedCorsOrigin", () => {
  test.each([
    "https://nthumods.com",
    "https://courseweb.nthumods.workers.dev",
    "https://pr-1070-courseweb.nthumods.workers.dev",
    "http://localhost:5173",
    "http://localhost",
    "https://localhost:4173",
    "http://127.0.0.1:8787",
  ])("allows %s", (origin) => {
    expect(allowedCorsOrigin(origin)).toBe(origin);
  });

  test.each([
    "https://evil.com",
    "https://nthumods.com.evil.com",
    "http://nthumods.com",
    "https://nthumods.workers.dev",
    "https://x.nthumods.workers.dev.evil.com",
    "https://evilnthumods.workers.dev",
    "http://localhost.evil.com",
    "http://localhost:5173/path",
    "",
    undefined,
  ])("rejects %s", (origin) => {
    expect(allowedCorsOrigin(origin)).toBeNull();
  });
});
