import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "../generated/client";
import type { D1Database } from "@cloudflare/workers-types";
declare const prismaClients: {
    fetch(db: D1Database): Promise<PrismaClient<{
        adapter: PrismaD1;
    }, never, import("../generated/client/runtime/library").DefaultArgs>>;
};
export default prismaClients;
