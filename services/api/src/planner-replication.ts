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

type ModelIdField = "id" | "uuid";

const MAX_REPLICATION_BATCH_SIZE = 100;
const MAX_REPLICATION_PUSH_ROWS = 100;
const replicationIdSchema = z.string().trim().max(256);
const replicationTimestampSchema = z.literal("").or(z.string().datetime());
const replicationBatchSizeSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(MAX_REPLICATION_BATCH_SIZE)
  .optional();

const replicationPullQuerySchema = (idField: ModelIdField): z.ZodTypeAny =>
  z.object({
    [idField]: replicationIdSchema,
    serverTimestamp: replicationTimestampSchema,
    batchSize: replicationBatchSizeSchema,
  });

const replicationPushSchema = (idField: ModelIdField): z.ZodTypeAny =>
  z
    .array(
      z.object({
        newDocumentState: z
          .object({
            [idField]: z.string(),
            _deleted: z.boolean(),
          })
          .passthrough(),
        assumedMasterState: z
          .object({
            [idField]: z.string(),
            _deleted: z.boolean(),
          })
          .passthrough()
          .optional(),
      }),
    )
    .max(MAX_REPLICATION_PUSH_ROWS);

type Checkpoint<T extends ModelIdField> = T extends "id"
  ? IdCheckpoint
  : UuidCheckpoint;

type ModelDelegates = {
  [K in Prisma.ModelName]: PrismaClient[Uncapitalize<K>];
};

// Define interfaces for the callbacks
interface PullHandlers<M extends Model, IdField extends ModelIdField> {
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
    idField: ModelIdField,
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

const findItemsWithCursor = async <M extends Model>(
  userId: string,
  idField: ModelIdField,
  id: string | undefined,
  lastPulledTimestamp: Date | null,
  batchSize: number,
  findMany: (args: any) => Promise<M[]>,
) => {
  if (lastPulledTimestamp) {
    return findMany({
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
              { [idField]: { gt: id || "" } },
            ],
          },
        ],
      },
      orderBy: [{ serverTimestamp: "asc" }, { [idField]: "asc" }],
      take: batchSize,
    });
  }

  return findMany({
    where: { userId },
    orderBy: [{ serverTimestamp: "asc" }, { [idField]: "asc" }],
    take: batchSize,
  });
};

const transformItemToDocument = <M extends Model>(item: M): RxDocument<M> => {
  const { userId, serverTimestamp, deleted, ...rest } = item;
  return { ...rest, _deleted: deleted || false } as RxDocument<M>;
};

const withDeleted = <T extends object>(data: T, deleted: boolean) => ({
  ...data,
  _deleted: deleted || false,
});

const processItemsWithUpsert = async <T extends object>(
  userId: string,
  items: Array<{ id: string; isDeleted: boolean; data: T }>,
  transaction: (operations: unknown[]) => Promise<unknown>,
  upsert: (
    item: { id: string; isDeleted: boolean; data: T },
    data: { update: T & BaseModel; create: T & BaseModel },
  ) => unknown,
  transformData: (data: T) => T = (data) => data,
) => {
  const operations = items.map((item) => {
    const data = transformData({ ...item.data });
    return upsert(item, {
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

  return transaction(operations);
};

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
      throw new TypeError(
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
    zValidator("query", replicationPullQuerySchema("id")),
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
            return findItemsWithCursor(
              userId,
              idField,
              id,
              lastPulledTimestamp,
              batchSize,
              (args) => prisma.folder.findMany(args),
            );
          },
          transformItemToDocument,
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
    zValidator("json", replicationPushSchema("id")),
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
              await processItemsWithUpsert(
                userId,
                items,
                (operations) => prisma.$transaction(operations as any[]),
                (item, data) =>
                  prisma.folder.upsert({
                    where: { userId_id: { userId, id: item.id } },
                    ...data,
                  }),
              );
            },
            transformItemToDocument,
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
    zValidator("query", replicationPullQuerySchema("uuid")),
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
            return findItemsWithCursor(
              userId,
              idField,
              uuid,
              lastPulledTimestamp,
              batchSize,
              (args) => prisma.item.findMany(args),
            );
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

            return withDeleted(transformedData, deleted) as RxDocument<
              typeof item
            >;
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
    zValidator("json", replicationPushSchema("uuid")),
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
              await processItemsWithUpsert(
                userId,
                items,
                (operations) => prisma.$transaction(operations as any[]),
                (item, data) =>
                  prisma.item.upsert({
                    where: { uuid: item.id, userId },
                    ...data,
                  }),
                (data) => {
                  // Serialize dependson if it exists
                  if (
                    "dependson" in data &&
                    data.dependson !== null &&
                    (Array.isArray(data.dependson) ||
                      typeof data.dependson === "object")
                  ) {
                    data.dependson = JSON.stringify(data.dependson);
                  }
                  return data;
                },
              );
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

              return withDeleted(transformedData, deleted) as RxDocument<
                typeof item
              >;
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
    zValidator("query", replicationPullQuerySchema("id")),
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
            return findItemsWithCursor(
              userId,
              idField,
              id,
              lastPulledTimestamp,
              batchSize,
              (args) => prisma.plannerData.findMany(args),
            );
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

            return withDeleted(transformedData, deleted) as RxDocument<
              typeof item
            >;
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
    zValidator("json", replicationPushSchema("id")),
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
              await processItemsWithUpsert(
                userId,
                items,
                (operations) => prisma.$transaction(operations as any[]),
                (item, data) =>
                  prisma.plannerData.upsert({
                    where: { userId_id: { userId, id: item.id } },
                    ...data,
                  }),
                (data) => {
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
                  return data;
                },
              );
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

              return withDeleted(transformedData, deleted) as RxDocument<
                typeof item
              >;
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
    zValidator("query", replicationPullQuerySchema("id")),
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
            return findItemsWithCursor(
              userId,
              idField,
              id,
              lastPulledTimestamp,
              batchSize,
              (args) => prisma.semester.findMany(args),
            );
          },
          transformItemToDocument,
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
    zValidator("json", replicationPushSchema("id")),
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
              await processItemsWithUpsert(
                userId,
                items,
                (operations) => prisma.$transaction(operations as any[]),
                (item, data) =>
                  prisma.semester.upsert({
                    where: { userId_id: { userId, id: item.id } },
                    ...data,
                  }),
              );
            },
            transformItemToDocument,
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
