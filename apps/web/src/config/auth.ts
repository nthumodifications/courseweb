import { createSecureApiClient } from "@courseweb/api-types";

if (!process.env.NEXT_PUBLIC_NTHUMODS_AUTH_URL) {
  throw new Error("NEXT_PUBLIC_NTHUMODS_AUTH_URL is not defined");
}
const authClient = createSecureApiClient(
  process.env.NEXT_PUBLIC_NTHUMODS_AUTH_URL,
);

export default authClient;
