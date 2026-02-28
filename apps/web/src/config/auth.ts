import { createSecureApiClient } from "@courseweb/api-types";

if (!import.meta.env.VITE_NTHUMODS_AUTH_URL) {
  throw new Error("VITE_NTHUMODS_AUTH_URL is not defined");
}
const authClient = createSecureApiClient(
  import.meta.env.VITE_NTHUMODS_AUTH_URL,
);

export default authClient;
