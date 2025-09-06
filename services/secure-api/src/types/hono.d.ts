import { Context } from "hono";

declare module "hono" {
  interface ContextVariableMap {
    user: { userId: string; name: string; email: string };
    apiKey: any;
    requiredScope: string;
  }
}
