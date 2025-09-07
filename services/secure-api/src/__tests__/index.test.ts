// import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";
// import { setCookie, getCookie } from "hono/cookie";
// import type { Context, Next } from "hono";
// import prisma from "../client";

// mock.module("./nthuoauth", () => ({
//   nthuAuth: ({ client_id, client_secret, redirect_uri, scopes }: any) => async (c: Context, next: Next) => {
//     console.log('////////////////////////u3 here?')
//     const state = crypto.randomUUID();
//     setCookie(c, "state", state, { httpOnly: true, path: "/", maxAge: 10 * 60 });
//     if (!c.req.query("code")) {
//       // Simulate redirect to NTHU OAuth
//       c.status(302);
//       c.header(
//         "Location",
//         `https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php?client_id=${client_id}&scope=${scopes.join(
//           "%20"
//         )}&state=${state}&redirect_uri=${encodeURIComponent(redirect_uri)}`
//       );
//       return c.body(null);
//     } else {
//       // Simulate callback with user data
//       const storedState = getCookie(c, "state");
//       if (c.req.query("state") !== storedState) {
//         c.status(401);
//         return c.json({ error: "invalid_state" });
//       }
//       c.set("user", {
//         userid: "testuser123",
//         name: "Test User",
//         name_en: "Test User En",
//         email: "test@example.com",
//         inschool: true,
//       });
//       await next();
//     }
//   },
// }));

// // Import your existing app
// const { default: app } = await import('../oidc');

// // Server setup
// let server: any;

// beforeAll(async () => {

//   server = Bun.serve({
//     fetch: app.fetch,
//     port: 5002,
//   });
// });

// afterAll(async () => {
//   const deleteUsers = prisma.user.deleteMany();
//   const deleteClients = prisma.authCode.deleteMany();

//   await prisma.$transaction([deleteUsers, deleteClients]);
//   await prisma.$disconnect();
//   server.stop();
// });

// // Test Suite
// describe.skip("Comprehensive OIDC Tests", () => {
//   // --- /authorize Tests ---
//   it("redirects with valid /authorize params", async () => {
//     const res = await fetch(
//       "http://localhost:5002/authorize?client_id=test_client&redirect_uri=http://client.com/callback&scope=openid%20user:read&response_type=code&state=xyz",
//       { redirect: "manual" }
//     );
//     expect(res.status).toBe(302);
//     const location = res.headers.get("location");
//     expect(location).toContain("https://oauth.ccxp.nthu.edu.tw");
//     expect(location).toContain("client_id=");
//     expect(location).toContain("scope=userid+name+email+inschool");
//     expect(location).toContain("state=");
//     expect(location).toContain("redirect_uri="+encodeURIComponent(process.env['NTHU_OAUTH_REDIRECT_URI']!));
//     const cookies = res.headers.get("set-cookie")?.split(", ");
//     expect(cookies?.some((c) => c.startsWith("oidc_data="))).toBe(true);
//     expect(cookies?.some((c) => c.includes("HttpOnly"))).toBe(true);
//     expect(cookies?.some((c) => c.includes("SameSite=Strict"))).toBe(true);
//   });

//   it("rejects /authorize with missing params", async () => {
//     const res = await fetch("http://localhost:5002/authorize?scope=openid&response_type=code", { redirect: "manual" });
//     expect(res.status).toBe(400);
//   });

//   it("rejects /authorize with invalid response_type", async () => {
//     const res = await fetch(
//       "http://localhost:5002/authorize?client_id=test_client&redirect_uri=http://client.com&scope=openid&response_type=token",
//       { redirect: "manual" }
//     );
//     expect(res.status).toBe(400);
//     expect(await res.json()).toEqual({ error: "invalid_request" });
//   });

//   it("rejects /authorize with missing openid scope", async () => {
//     const res = await fetch(
//       "http://localhost:5002/authorize?client_id=test_client&redirect_uri=http://client.com&scope=profile&response_type=code",
//       { redirect: "manual" }
//     );
//     expect(res.status).toBe(400);
//     expect(await res.json()).toEqual({ error: "invalid_request" });
//   });

//   // --- /oauth/nthu Tests ---
//   it("rejects /oauth/nthu direct access without cookies", async () => {
//     const res = await fetch("http://localhost:5002/oauth/nthu?code=abc&state=xyz", { redirect: "manual" });
//     expect(res.status).toBe(400);
//   });

//   it("rejects /oauth/nthu with mismatched state", async () => {
//     const authRes = await fetch(
//       "http://localhost:5002/authorize?client_id=test_client&redirect_uri=http://client.com/callback&scope=openid&response_type=code",
//       { redirect: "manual" }
//     );
//     const cookies = authRes.headers.get("set-cookie")?.split(", ");
//     const oidcData = cookies?.find((c) => c.startsWith("oidc_data="))?.split(";")[0].split("=")[1];
//     const res = await fetch("http://localhost:5002/oauth/nthu?code=abc&state=wrong_state", {
//       headers: { Cookie: `oidc_data=${oidcData}; state=correct_state` },
//       redirect: "manual",
//     });
//     expect(res.status).toBe(401); // nthuAuth enforces this
//   });

//   it("processes /oauth/nthu with valid callback", async () => {
//     const authRes = await fetch(
//       "http://localhost:5002/authorize?client_id=test_client&redirect_uri=http://client.com/callback&scope=openid&response_type=code&state=xyz",
//       { redirect: "manual" }
//     );
//     const cookies = authRes.headers.get("set-cookie")?.split(", ");
//     const oidcData = cookies?.find((c) => c.startsWith("oidc_data="))?.split(";")[0].split("=")[1];
//     const state = cookies?.find((c) => c.startsWith("state="))?.split(";")[0].split("=")[1];
//     const res = await fetch(`http://localhost:5002/oauth/nthu?code=abc&state=${state}`, {
//       headers: { Cookie: `oidc_data=${oidcData}; state=${state}` },
//       redirect: "manual",
//     });
//     // TODO: Need to mock NTHU OAuth to get the code

//     expect(res.status).toBe(302);
//     const redirectUrl = new URL(res.headers.get("location")!);
//     expect(redirectUrl.searchParams.get("code")).toBeDefined();
//     expect(redirectUrl.searchParams.get("state")).toBe("xyz");
//   });

//   // --- /token Tests ---
//   it("rejects /token with GET request", async () => {
//     const res = await fetch("http://localhost:5002/token");
//     expect(res.status).toBe(404);
//   });

//   it("rejects /token with missing grant_type", async () => {
//     const res = await fetch("http://localhost:5002/token", {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: "code=abc&redirect_uri=http://client.com&client_id=test_client",
//     });
//     expect(res.status).toBe(400);
//   });

//   it("rejects /token with invalid grant_type", async () => {
//     const res = await fetch("http://localhost:5002/token", {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: "grant_type=password&code=abc&redirect_uri=http://client.com&client_id=test_client",
//     });
//     expect(res.status).toBe(400);
//     expect(await res.json()).toEqual({ error: "unsupported_grant_type" });
//   });

//   it("processes /token with valid code", async () => {
//     const authRes = await fetch(
//       "http://localhost:5002/authorize?client_id=test_client&redirect_uri=http://client.com/callback&scope=openid&response_type=code&state=xyz",
//       { redirect: "manual" }
//     );
//     const cookies = authRes.headers.get("set-cookie")?.split(", ");
//     const oidcData = cookies?.find((c) => c.startsWith("oidc_data="))?.split(";")[0].split("=")[1];
//     const state = cookies?.find((c) => c.startsWith("state="))?.split(";")[0].split("=")[1];

//     // TODO: Mock NTHU OAuth to get the code
//     const callbackRes = await fetch(`http://localhost:5002/oauth/nthu?code=abc&state=${state}`, {
//       headers: { Cookie: `oidc_data=${oidcData}; state=${state}` },
//       redirect: "manual",
//     });
//     const code = new URL(callbackRes.headers.get("location")!).searchParams.get("code");

//     const res = await fetch("http://localhost:5002/token", {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: `grant_type=authorization_code&code=${code}&redirect_uri=http://client.com/callback&client_id=test_client`,
//     });
//     expect(res.status).toBe(200);
//     const json = await res.json();
//     expect(json.access_token).toBeDefined();
//     expect(json.token_type).toBe("Bearer");
//     expect(typeof json.expires_in).toBe("number");
//   });

//   // --- /userinfo Tests ---
//   it("rejects /userinfo with POST request", async () => {
//     const res = await fetch("http://localhost:5002/userinfo", { method: "POST" });
//     expect(res.status).toBe(405); // Assuming your app enforces this
//   });

//   it("rejects /userinfo with missing Authorization", async () => {
//     const res = await fetch("http://localhost:5002/userinfo");
//     expect(res.status).toBe(401);
//     expect(await res.json()).toEqual({ error: "unauthorized" });
//   });

//   it("returns userinfo with valid token", async () => {
//     const authRes = await fetch(
//       "http://localhost:5002/authorize?client_id=test_client&redirect_uri=http://client.com/callback&scope=openid%20user:read&response_type=code&state=xyz",
//       { redirect: "manual" }
//     );
//     const cookies = authRes.headers.get("set-cookie")?.split(", ");
//     expect(cookies).toBeDefined();
//     const oidcData = cookies?.find((c) => c.startsWith("oidc_data="))?.split(";")[0].split("=")[1];
//     const state = cookies?.find((c) => c.startsWith("state="))?.split(";")[0].split("=")[1];
//     // TODO: Mock NTHU OAuth to get the code
//     const callbackRes = await fetch(`http://localhost:5002/oauth/nthu?code=abc&state=${state}`, {
//       headers: { Cookie: `oidc_data=${oidcData}; state=${state}` },
//       redirect: "manual",
//     });
//     const code = new URL(callbackRes.headers.get("location")!).searchParams.get("code");

//     const tokenRes = await fetch("http://localhost:5002/token", {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: `grant_type=authorization_code&code=${code}&redirect_uri=http://client.com/callback&client_id=test_client`,
//     });
//     const { access_token } = await tokenRes.json();

//     const res = await fetch("http://localhost:5002/userinfo", {
//       headers: { Authorization: `Bearer ${access_token}` },
//     });
//     expect(res.status).toBe(200);
//     const json = await res.json();
//     expect(json.sub).toBe("testuser123");
//     expect(json.name).toBe("Test User");
//   });

//   // --- Full Flow ---
//   it("completes full OIDC flow with abuse prevention", async () => {
//     // Attempt abuse: Direct /token call
//     let res = await fetch("http://localhost:5002/token", { method: "POST" });
//     expect(res.status).toBe(400);

//     // Valid flow
//     const authRes = await fetch(
//       "http://localhost:5002/authorize?client_id=test_client&redirect_uri=http://client.com/callback&scope=openid%20user:read&response_type=code&state=xyz",
//       { redirect: "manual" }
//     );
//     const cookies = authRes.headers.get("set-cookie")?.split(", ");
//     const oidcData = cookies?.find((c) => c.startsWith("oidc_data="))?.split(";")[0].split("=")[1];
//     const state = cookies?.find((c) => c.startsWith("state="))?.split(";")[0].split("=")[1];

//     // Attempt abuse: Wrong state
//     res = await fetch(`http://localhost:5002/oauth/nthu?code=abc&state=wrong`, {
//       headers: { Cookie: `oidc_data=${oidcData}; state=${state}` },
//       redirect: "manual",
//     });
//     expect(res.status).toBe(401);

//     // TODO: Mock NTHU OAuth to get the code
//     // Valid callback
//     const callbackRes = await fetch(`http://localhost:5002/oauth/nthu?code=abc&state=${state}`, {
//       headers: { Cookie: `oidc_data=${oidcData}; state=${state}` },
//       redirect: "manual",
//     });
//     const code = new URL(callbackRes.headers.get("location")!).searchParams.get("code");

//     // Attempt abuse: Invalid token request
//     res = await fetch("http://localhost:5002/token", {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: "grant_type=invalid",
//     });
//     expect(res.status).toBe(400);

//     // Valid token request
//     const tokenRes = await fetch("http://localhost:5002/token", {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: `grant_type=authorization_code&code=${code}&redirect_uri=http://client.com/callback&client_id=test_client`,
//     });
//     const { access_token } = await tokenRes.json();

//     // Attempt abuse: No auth header
//     res = await fetch("http://localhost:5002/userinfo");
//     expect(res.status).toBe(401);

//     // Valid userinfo request
//     res = await fetch("http://localhost:5002/userinfo", {
//       headers: { Authorization: `Bearer ${access_token}` },
//     });
//     expect(res.status).toBe(200);
//     const userinfo = await res.json();
//     expect(userinfo.sub).toBe("testuser123");
//   });
// });
