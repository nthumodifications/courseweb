import { Hono } from "hono";
import summarize from "./summarize";

const app = new Hono().route("/summarize", summarize);

export default app;
