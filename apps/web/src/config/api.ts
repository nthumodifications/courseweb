import { createMainApiClient } from "@courseweb/api-types";

if (!import.meta.env.VITE_COURSEWEB_API_URL) {
  throw new Error("VITE_COURSEWEB_API_URL is not defined");
}
const client = createMainApiClient(import.meta.env.VITE_COURSEWEB_API_URL);

export default client;
