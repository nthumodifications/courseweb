import { appRouter } from "@/server/routers/_app";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";
import createContext from "@/server/context";
import { captureException } from "@sentry/nextjs";

export function POST(req: NextRequest) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async ({ resHeaders }) => {
      return await createContext({ req, resHeaders });
    },
    onError(opts) {
      const { error, type, path, input, ctx, req } = opts;
      console.error('Error:', error);
      if (error.code === 'INTERNAL_SERVER_ERROR') {
        captureException(error, {
          extra: {
            type,
            path,
            input,
            ctx,
            req,
          },
        });
      }
    },
  });
}