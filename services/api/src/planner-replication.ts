import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { auth } from "./utils/auth";
import {
  ensureNotFalsy,
  lastOfArray,
  type RxReplicationWriteToMasterRow,
} from "rxdb/plugins/core";
import { PrismaClient, Prisma } from "./generated/client";
import { deepCompare, stripNullValues } from "./utils/deepCompare";
import { HTTPException } from "hono/http-exception";
import type { Bindings } from "./index";
import prismaClients from "./prisma/client";

// Define models with different ID fields
type BaseModel = {
  serverTimestamp: Date;
  userId: string;
  deleted: boolean;
};

type IdModel = BaseModel & {
  id: string;
};

type UuidModel = BaseModel & {
  uuid: string;
};

type Model = IdModel | UuidModel;

type RxDocument<T> = Omit<T, "userId" | "serverTimestamp" | "deleted"> & {
  _deleted: boolean;
};

type IdCheckpoint = {
  id: string;
  serverTimestamp: string;
};

type UuidCheckpoint = {
  uuid: string;
  serverTimestamp: string;
};

type Checkpoint<T extends "id" | "uuid"> = T extends "id"
  ? IdCheckpoint
  : UuidCheckpoint;

type ModelDelegates = {
  [K in Prisma.ModelName]: PrismaClient[Uncapitalize<K>];
};

// Define interfaces for the callbacks
interface PullHandlers<M extends Model, IdField extends "id" | "uuid"> {
  findItems: (
    userId: string,
    idField: IdField,
    id: string | undefined,
    lastPulledTimestamp: Date | null,
    batchSize: number,
  ) => Promise<M[]>;
  transformItemToDocument: (item: M) => RxDocument<M>;
}

interface PushHandlers<M extends Model> {
  findItem: (
    userId: string,
    idField: "id" | "uuid",
    id: string,
  ) => Promise<M | null>;
  processItems: (
    userId: string,
    idField: "id" | "uuid",
    items: Array<{
      id: string;
      isDeleted: boolean;
      data: Omit<M, "userId" | "deleted" | "serverTimestamp">;
    }>,
  ) => Promise<void>;
  transformItemToDocument: (item: M) => RxDocument<M>;
}

/**
 * Generic function to handle pull operations using callbacks
 * @template M The specific model type (with either id or uuid required)
 * @template IdField The ID field type ('id' or 'uuid')
 */
async function handlePullRequest<
  M extends Model,
  IdField extends "id" | "uuid" = "id" | "uuid",
>(
  userId: string | undefined,
  idField: IdField,
  queryParams: {
    id?: string;
    uuid?: string;
    serverTimestamp?: string;
    batchSize?: number;
  },
  handlers: PullHandlers<M, IdField>,
): Promise<{
  checkpoint: Checkpoint<IdField> | null;
  documents: RxDocument<M>[];
}> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const id = queryParams[idField];
  const { serverTimestamp, batchSize = 10 } = queryParams;
  const lastPulledTimestamp = serverTimestamp
    ? new Date(serverTimestamp)
    : null;

  const items = await handlers.findItems(
    userId,
    idField,
    id,
    lastPulledTimestamp,
    batchSize,
  );

  if (items.length === 0) {
    return {
      checkpoint: lastPulledTimestamp
        ? ({
            [idField]: id || "",
            serverTimestamp: lastPulledTimestamp.toISOString(),
          } as Checkpoint<IdField>)
        : null,
      documents: [],
    };
  }

  const lastDoc = ensureNotFalsy(lastOfArray(items)) as M;
  const documents = items.map(handlers.transformItemToDocument);

  const newCheckpoint = {
    [idField]: lastDoc[idField as unknown as keyof M] as string,
    serverTimestamp: (lastDoc.serverTimestamp as Date).toISOString(),
  } as Checkpoint<IdField>;

  return {
    documents,
    checkpoint: newCheckpoint,
  };
}

/**
 * Generic function to handle push operations using callbacks
 * @template M The specific model type (with either id or uuid required)
 */
async function handlePushRequest<M extends Model>(
  userId: string | undefined,
  idField: "id" | "uuid",
  rows: RxReplicationWriteToMasterRow<
    RxDocument<
      (IdModel | UuidModel) & Omit<M, "userId" | "deleted" | "serverTimestamp">
    >
  >[],
  handlers: PushHandlers<M>,
): Promise<RxDocument<M>[]> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const conflicts: RxDocument<M>[] = [];
  const itemsToProcess: Array<{
    id: string;
    isDeleted: boolean;
    data: Omit<M, "userId" | "deleted" | "serverTimestamp">;
  }> = [];

  // Process each row separately first to determine conflicts
  for (const row of rows) {
    const { newDocumentState, assumedMasterState } = row;
    const idValue = newDocumentState[idField as keyof typeof newDocumentState];
    if (typeof idValue !== "string") {
      throw new Error(
        `Expected ${idField} to be a string, but got ${typeof idValue}`,
      );
    }
    const id = idValue;

    // Find the current state in the database
    const itemInDb = await handlers.findItem(userId, idField, id);

    // Check for conflicts
    if (itemInDb && assumedMasterState) {
      const itemAsDocument = handlers.transformItemToDocument(itemInDb);

      // Strip null values from both objects before comparison
      const strippedItemAsDocument = stripNullValues(itemAsDocument);
      const strippedAssumedState = stripNullValues(assumedMasterState);

      // If we have an assumed state but it doesn't match what's in the DB, it's a conflict
      if (!deepCompare(strippedItemAsDocument, strippedAssumedState)) {
        conflicts.push(itemAsDocument);
        continue;
      }
    }

    // If no conflicts, add to batch processing
    const { _deleted, ...itemData } = newDocumentState;
    itemsToProcess.push({
      id,
      isDeleted: _deleted,
      data: itemData as any as Omit<
        M,
        "userId" | "deleted" | "serverTimestamp"
      >,
    });
  }

  // If there are no conflicts, process all rows in a batch
  if (conflicts.length === 0 && itemsToProcess.length > 0) {
    await handlers.processItems(userId, idField, itemsToProcess);
  }

  return conflicts;
}

const app = new Hono<{ Bindings: Bindings }>()
  .use(auth(["planner"]))
  .get(
    "/folders/pull",
    zValidator(
      "query",
      z.object({
        id: z.string(),
        serverTimestamp: z.string(),
        batchSize: z.coerce.number().optional(),
      }),
    ),
    async (c) => {
      try {
        const params = c.req.valid("query");
        const user = c.get("user");
        const prisma = await prismaClients.fetch(c.env.DB);

        const result = await handlePullRequest<
          Prisma.FolderGetPayload<{}>,
          "id"
        >(user.sub, "id", params, {
          async findItems(userId, idField, id, lastPulledTimestamp, batchSize) {
            if (lastPulledTimestamp) {
              return prisma.folder.findMany({
                where: {
                  userId,
                  OR: [
                    {
                      serverTimestamp: {
                        gt: lastPulledTimestamp,
                      },
                    },
                    {
                      AND: [
                        { serverTimestamp: lastPulledTimestamp },
                        { id: { gt: id || "" } },
                      ],
                    },
                  ],
                },
                orderBy: [{ serverTimestamp: "asc" }, { id: "asc" }],
                take: batchSize,
              });
            } else {
              return prisma.folder.findMany({
                where: { userId },
                orderBy: [{ serverTimestamp: "asc" }, { id: "asc" }],
                take: batchSize,
              });
            }
          },
          transformItemToDocument(item) {
            const { userId, serverTimestamp, deleted, ...rest } = item;
            return { ...rest, _deleted: deleted || false };
          },
        });

        return c.json(result);
      } catch (error) {
        console.error("Error in folders/pull:", error);
        throw new HTTPException(400, {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  )
  .post(
    "/folders/push",
    zValidator(
      "json",
      z.array(
        z.object({
          newDocumentState: z
            .object({
              id: z.string(),
              _deleted: z.boolean(),
            })
            .passthrough(),
          assumedMasterState: z
            .object({
              id: z.string(),
              _deleted: z.boolean(),
            })
            .passthrough()
            .optional(),
        }),
      ),
    ),
    async (c) => {
      try {
        const rows = c.req.valid("json");
        const user = c.get("user");
        const prisma = await prismaClients.fetch(c.env.DB);

        const conflicts = await handlePushRequest<Prisma.FolderGetPayload<{}>>(
          user.sub,
          "id",
          rows as RxReplicationWriteToMasterRow<
            RxDocument<
              IdModel &
                Omit<Prisma.FolderGetPayload<{}>, "deleted" | "serverTimestamp">
            >
          >[],
          {
            async findItem(userId, idField, id) {
              return prisma.folder.findUnique({
                where: { userId_id: { userId, id } },
              });
            },
            async processItems(userId, idField, items) {
              const operations = items.map((item) => {
                return prisma.folder.upsert({
                  where: { userId_id: { userId, id: item.id } },
                  update: {
                    ...item.data,
                    userId,
                    serverTimestamp: new Date(),
                    deleted: item.isDeleted,
                  },
                  create: {
                    deleted: item.isDeleted,
                    userId,
                    serverTimestamp: new Date(),
                    ...item.data,
                  },
                });
              });

              await prisma.$transaction(operations);
            },
            transformItemToDocument(item) {
              const { userId, serverTimestamp, deleted, ...rest } = item;
              return { ...rest, _deleted: deleted || false };
            },
          },
        );

        return c.json(conflicts);
      } catch (error) {
        console.error("Error in folders/push:", error);
        throw new HTTPException(400, {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  )
  .get(
    "/items/pull",
    zValidator(
      "query",
      z.object({
        uuid: z.string(),
        serverTimestamp: z.string(),
        batchSize: z.coerce.number().optional(),
      }),
    ),
    async (c) => {
      try {
        const params = c.req.valid("query");
        const user = c.get("user");
        const prisma = await prismaClients.fetch(c.env.DB);

        const result = await handlePullRequest<
          Prisma.ItemGetPayload<{}>,
          "uuid"
        >(user.sub, "uuid", params, {
          async findItems(
            userId,
            idField,
            uuid,
            lastPulledTimestamp,
            batchSize,
          ) {
            if (lastPulledTimestamp) {
              return prisma.item.findMany({
                where: {
                  userId,
                  OR: [
                    {
                      serverTimestamp: {
                        gt: lastPulledTimestamp,
                      },
                    },
                    {
                      AND: [
                        { serverTimestamp: lastPulledTimestamp },
                        { uuid: { gt: uuid || "" } },
                      ],
                    },
                  ],
                },
                orderBy: [{ serverTimestamp: "asc" }, { uuid: "asc" }],
                take: batchSize,
              });
            } else {
              return prisma.item.findMany({
                where: { userId },
                orderBy: [{ serverTimestamp: "asc" }, { uuid: "asc" }],
                take: batchSize,
              });
            }
          },
          transformItemToDocument(item) {
            const { userId, serverTimestamp, deleted, ...rest } = item;
            const transformedData = { ...rest };

            // Deserialize dependson if it exists
            if (
              "dependson" in transformedData &&
              typeof transformedData.dependson === "string"
            ) {
              transformedData.dependson = transformedData.dependson
                ? JSON.parse(transformedData.dependson)
                : null;
            }

            return { ...transformedData, _deleted: deleted || false };
          },
        });

        return c.json(result);
      } catch (error) {
        console.error("Error in items/pull:", error);
        throw new HTTPException(400, {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  )
  .post(
    "/items/push",
    zValidator(
      "json",
      z.array(
        z.object({
          newDocumentState: z
            .object({
              uuid: z.string(),
              _deleted: z.boolean(),
            })
            .passthrough(),
          assumedMasterState: z
            .object({
              uuid: z.string(),
              _deleted: z.boolean(),
            })
            .passthrough()
            .optional(),
        }),
      ),
    ),
    async (c) => {
      try {
        const rows = c.req.valid("json");
        const user = c.get("user");
        const prisma = await prismaClients.fetch(c.env.DB);

        const conflicts = await handlePushRequest<Prisma.ItemGetPayload<{}>>(
          user.sub,
          "uuid",
          rows as RxReplicationWriteToMasterRow<
            RxDocument<
              UuidModel &
                Omit<Prisma.ItemGetPayload<{}>, "deleted" | "serverTimestamp">
            >
          >[],
          {
            async findItem(userId, idField, uuid) {
              return prisma.item.findUnique({
                where: { uuid: uuid, userId },
              });
            },
            async processItems(userId, idField, items) {
              const operations = items.map((item) => {
                const data = { ...item.data };

                // Serialize dependson if it exists
                if (
                  "dependson" in data &&
                  data.dependson !== null &&
                  (Array.isArray(data.dependson) ||
                    typeof data.dependson === "object")
                ) {
                  data.dependson = JSON.stringify(data.dependson);
                }

                return prisma.item.upsert({
                  where: { uuid: item.id, userId },
                  update: {
                    ...data,
                    userId,
                    serverTimestamp: new Date(),
                    deleted: item.isDeleted,
                  },
                  create: {
                    ...data,
                    userId,
                    serverTimestamp: new Date(),
                    deleted: item.isDeleted,
                  },
                });
              });

              await prisma.$transaction(operations);
            },
            transformItemToDocument(item) {
              const { userId, serverTimestamp, deleted, ...rest } = item;
              const transformedData = { ...rest };

              // Deserialize dependson for comparison
              if (
                "dependson" in transformedData &&
                typeof transformedData.dependson === "string"
              ) {
                transformedData.dependson = transformedData.dependson
                  ? JSON.parse(transformedData.dependson)
                  : null;
              }

              return { ...transformedData, _deleted: deleted || false };
            },
          },
        );

        return c.json(conflicts);
      } catch (error) {
        console.error("Error in items/push:", error);
        throw new HTTPException(400, {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  )
  .get(
    "/plannerdata/pull",
    zValidator(
      "query",
      z.object({
        id: z.string(),
        serverTimestamp: z.string(),
        batchSize: z.coerce.number().optional(),
      }),
    ),
    async (c) => {
      try {
        const params = c.req.valid("query");
        const user = c.get("user");
        const prisma = await prismaClients.fetch(c.env.DB);

        const result = await handlePullRequest<
          Prisma.PlannerDataGetPayload<{}>,
          "id"
        >(user.sub, "id", params, {
          async findItems(userId, idField, id, lastPulledTimestamp, batchSize) {
            if (lastPulledTimestamp) {
              return prisma.plannerData.findMany({
                where: {
                  userId,
                  OR: [
                    {
                      serverTimestamp: {
                        gt: lastPulledTimestamp,
                      },
                    },
                    {
                      AND: [
                        { serverTimestamp: lastPulledTimestamp },
                        { id: { gt: id || "" } },
                      ],
                    },
                  ],
                },
                orderBy: [{ serverTimestamp: "asc" }, { id: "asc" }],
                take: batchSize,
              });
            } else {
              return prisma.plannerData.findMany({
                where: { userId },
                orderBy: [{ serverTimestamp: "asc" }, { id: "asc" }],
                take: batchSize,
              });
            }
          },
          transformItemToDocument(item) {
            const { userId, serverTimestamp, deleted, ...rest } = item;
            const transformedData = { ...rest };

            // Deserialize includedSemesters if it exists
            if (
              "includedSemesters" in transformedData &&
              typeof transformedData.includedSemesters === "string"
            ) {
              transformedData.includedSemesters =
                transformedData.includedSemesters
                  ? JSON.parse(transformedData.includedSemesters)
                  : [];
            }

            return { ...transformedData, _deleted: deleted || false };
          },
        });

        return c.json(result);
      } catch (error) {
        console.error("Error in plannerdata/pull:", error);
        throw new HTTPException(400, {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  )
  .post(
    "/plannerdata/push",
    zValidator(
      "json",
      z.array(
        z.object({
          newDocumentState: z
            .object({
              id: z.string(),
              _deleted: z.boolean(),
            })
            .passthrough(),
          assumedMasterState: z
            .object({
              id: z.string(),
              _deleted: z.boolean(),
            })
            .passthrough()
            .optional(),
        }),
      ),
    ),
    async (c) => {
      try {
        const rows = c.req.valid("json");
        const user = c.get("user");
        const prisma = await prismaClients.fetch(c.env.DB);

        const conflicts = await handlePushRequest<
          Prisma.PlannerDataGetPayload<{}>
        >(
          user.sub,
          "id",
          rows as RxReplicationWriteToMasterRow<
            RxDocument<
              IdModel &
                Omit<
                  Prisma.PlannerDataGetPayload<{}>,
                  "deleted" | "serverTimestamp"
                >
            >
          >[],
          {
            async findItem(userId, idField, id) {
              return prisma.plannerData.findUnique({
                where: { userId_id: { userId, id } },
              });
            },
            async processItems(userId, idField, items) {
              const operations = items.map((item) => {
                const data = { ...item.data };

                // Serialize includedSemesters if it exists
                if (
                  "includedSemesters" in data &&
                  Array.isArray(data.includedSemesters)
                ) {
                  data.includedSemesters = JSON.stringify(
                    data.includedSemesters,
                  );
                } else {
                  data.includedSemesters = JSON.stringify([]);
                }

                return prisma.plannerData.upsert({
                  where: { userId_id: { userId, id: item.id } },
                  update: {
                    ...data,
                    userId,
                    serverTimestamp: new Date(),
                    deleted: item.isDeleted,
                  },
                  create: {
                    ...data,
                    userId,
                    serverTimestamp: new Date(),
                    deleted: item.isDeleted,
                  },
                });
              });

              await prisma.$transaction(operations);
            },
            transformItemToDocument(item) {
              const { userId, serverTimestamp, deleted, ...rest } = item;
              const transformedData = { ...rest };

              // Deserialize includedSemesters for comparison
              if (
                "includedSemesters" in transformedData &&
                typeof transformedData.includedSemesters === "string"
              ) {
                transformedData.includedSemesters =
                  transformedData.includedSemesters
                    ? JSON.parse(transformedData.includedSemesters)
                    : [];
              } else {
                //@ts-ignore
                transformedData.includedSemesters = [];
              }

              return { ...transformedData, _deleted: deleted || false };
            },
          },
        );

        return c.json(
          conflicts as unknown as (Omit<
            Prisma.PlannerDataGetPayload<{}>,
            "userId" | "deleted" | "serverTimestamp" | "includedSemesters"
          > & {
            _deleted: boolean;
            includedSemesters: string[];
          })[],
        );
      } catch (error) {
        console.error("Error in plannerdata/push:", error);
        throw new HTTPException(400, {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  )
  .get(
    "/semesters/pull",
    zValidator(
      "query",
      z.object({
        id: z.string(),
        serverTimestamp: z.string(),
        batchSize: z.coerce.number().optional(),
      }),
    ),
    async (c) => {
      try {
        const params = c.req.valid("query");
        const user = c.get("user");
        const prisma = await prismaClients.fetch(c.env.DB);

        const result = await handlePullRequest<
          Prisma.SemesterGetPayload<{}>,
          "id"
        >(user.sub, "id", params, {
          async findItems(userId, idField, id, lastPulledTimestamp, batchSize) {
            if (lastPulledTimestamp) {
              return prisma.semester.findMany({
                where: {
                  userId,
                  OR: [
                    {
                      serverTimestamp: {
                        gt: lastPulledTimestamp,
                      },
                    },
                    {
                      AND: [
                        { serverTimestamp: lastPulledTimestamp },
                        { id: { gt: id || "" } },
                      ],
                    },
                  ],
                },
                orderBy: [{ serverTimestamp: "asc" }, { id: "asc" }],
                take: batchSize,
              });
            } else {
              return prisma.semester.findMany({
                where: { userId },
                orderBy: [{ serverTimestamp: "asc" }, { id: "asc" }],
                take: batchSize,
              });
            }
          },
          transformItemToDocument(item) {
            const { userId, serverTimestamp, deleted, ...rest } = item;
            return { ...rest, _deleted: deleted || false };
          },
        });

        return c.json(result);
      } catch (error) {
        console.error("Error in semesters/pull:", error);
        throw new HTTPException(400, {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  )
  .post(
    "/semesters/push",
    zValidator(
      "json",
      z.array(
        z.object({
          newDocumentState: z
            .object({
              id: z.string(),
              _deleted: z.boolean(),
            })
            .passthrough(),
          assumedMasterState: z
            .object({
              id: z.string(),
              _deleted: z.boolean(),
            })
            .passthrough()
            .optional(),
        }),
      ),
    ),
    async (c) => {
      try {
        const rows = c.req.valid("json");
        const user = c.get("user");
        const prisma = await prismaClients.fetch(c.env.DB);

        const conflicts = await handlePushRequest<
          Prisma.SemesterGetPayload<{}>
        >(
          user.sub,
          "id",
          rows as RxReplicationWriteToMasterRow<
            RxDocument<
              IdModel &
                Omit<
                  Prisma.SemesterGetPayload<{}>,
                  "deleted" | "serverTimestamp"
                >
            >
          >[],
          {
            async findItem(userId, idField, id) {
              return prisma.semester.findUnique({
                where: { userId_id: { userId, id } },
              });
            },
            async processItems(userId, idField, items) {
              const operations = items.map((item) => {
                return prisma.semester.upsert({
                  where: { userId_id: { userId, id: item.id } },
                  update: {
                    ...item.data,
                    userId,
                    serverTimestamp: new Date(),
                    deleted: item.isDeleted,
                  },
                  create: {
                    ...item.data,
                    userId,
                    serverTimestamp: new Date(),
                    deleted: item.isDeleted,
                  },
                });
              });

              await prisma.$transaction(operations);
            },
            transformItemToDocument(item) {
              const { userId, serverTimestamp, deleted, ...rest } = item;
              return { ...rest, _deleted: deleted || false };
            },
          },
        );

        return c.json(conflicts);
      } catch (error) {
        console.error("Error in semesters/push:", error);
        throw new HTTPException(400, {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

export default app;
