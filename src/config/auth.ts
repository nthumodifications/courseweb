import { hc } from "hono/client";
import { app } from "auth/index";

if (!process.env.NEXT_PUBLIC_NTHUMODS_AUTH_URL) {
  throw new Error("NEXT_PUBLIC_NTHUMODS_AUTH_URL is not defined");
}
const authClient = hc<typeof app>(process.env.NEXT_PUBLIC_NTHUMODS_AUTH_URL);

export default authClient;
