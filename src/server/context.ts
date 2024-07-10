import * as trpcNext from '@trpc/server/adapters/next';
import { appRouter } from '@/server/routers/_app';
import { NextRequest } from 'next/server';
// export API handler
// @link https://trpc.io/docs/v11/server/adapters

const createContext = async ({
  req,
  resHeaders,
}: {
  req: NextRequest;
  resHeaders: Headers,
}) => {
  return {
    headers: req.headers,

    setCookie(name: string, value: string, attributes: string) {
      resHeaders.append(
        "set-cookie",
        `${name}=${value}${attributes ? `; ${attributes}` : ""}`,
      );
    },
  };
};

export default createContext;