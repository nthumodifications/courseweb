import * as path from "node:path";
import type { PrismaConfig } from "prisma";

export default {
  schema: path.join("src", "prisma", "schema.prisma"),
} satisfies PrismaConfig;
