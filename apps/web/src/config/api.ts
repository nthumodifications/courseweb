import { createMainApiClient } from "@courseweb/api-types";

if (!process.env.NEXT_PUBLIC_COURSEWEB_API_URL) {
  throw new Error("NEXT_PUBLIC_COURSEWEB_API_URL is not defined");
}
const client = createMainApiClient(process.env.NEXT_PUBLIC_COURSEWEB_API_URL);

export default client;
