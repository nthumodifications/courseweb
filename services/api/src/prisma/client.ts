import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "../generated/client";
import type { D1Database } from "@cloudflare/workers-types";

const prismaClients = {
  async fetch(db: D1Database) {
    const adapter = new PrismaD1(db);
    const prisma = new PrismaClient({ adapter });
    return prisma;
  },
};
export default prismaClients;
