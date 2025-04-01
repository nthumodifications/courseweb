import { hc } from "hono/client";
import { app } from "@/types/api";

if (!process.env.NEXT_PUBLIC_COURSEWEB_API_URL) {
  throw new Error("NEXT_PUBLIC_COURSEWEB_API_URL is not defined");
}
const client = hc<typeof app>(process.env.NEXT_PUBLIC_COURSEWEB_API_URL);

export default client;
