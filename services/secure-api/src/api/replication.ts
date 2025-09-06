import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import {
  FieldPath,
  FieldValue,
  FirebaseFirestoreError,
  Query,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import {
  appendToArray,
  ensureNotFalsy,
  flatClone,
  lastOfArray,
  type ById,
  type RxReplicationWriteToMasterRow,
  type WithDeleted,
} from "rxdb/plugins/core";
import { deepCompare } from "../utils/deepCompare";
import {
  isoStringToServerTimestamp,
  firestoreRowToDocData,
  serverTimestampToIsoString,
  getContentByIds,
  stripServerTimestampField,
  stripPrimaryKey,
} from "../utils/firestore_replication/firestore_replication_utils";
import type {
  EventDocType,
  TimetableSyncDocType,
  FirestoreCheckpointType,
} from "../utils/firestore_replication/firestore_replication_types";
import { getFirebaseAdmin } from "../config/firebase_admin";

const app = new Hono()
  .get(
    "/events/pull",
    zValidator(
      "query",
      z.object({
        id: z.string(),
        serverTimestamp: z.string(),
        batchSize: z.coerce.number().optional(),
      }),
    ),
    requireAuth(["calendar"]),
    async (c) => {
      const { id, serverTimestamp, batchSize = 10 } = c.req.valid("query");
      const user = c.var.user;

      let newerQuery: Query;
      let sameTimeQuery: Query | undefined;
      const { adminFirestore } = getFirebaseAdmin(c);
      const pullQuery = adminFirestore
        .collection("users")
        .doc(user.userId)
        .collection("events");

      const lastPulledCheckpoint = serverTimestamp
        ? {
            id,
            serverTimestamp,
          }
        : null;

      if (lastPulledCheckpoint) {
        const lastServerTimestamp = isoStringToServerTimestamp(
          lastPulledCheckpoint.serverTimestamp,
        );
        newerQuery = pullQuery
          .where("serverTimestamp", ">", lastServerTimestamp)
          .orderBy("serverTimestamp", "asc")
          .limit(batchSize);
        sameTimeQuery = pullQuery
          .where("serverTimestamp", "==", lastServerTimestamp)
          .where(FieldPath.documentId(), ">", id)
          .orderBy(FieldPath.documentId(), "asc")
          .limit(batchSize);
      } else {
        newerQuery = pullQuery
          .orderBy("serverTimestamp", "asc")
          .limit(batchSize);
      }

      let useDocs: QueryDocumentSnapshot<EventDocType>[] = [];
      await adminFirestore.runTransaction(async (_tx) => {
        useDocs = [];
        const [newerQueryResult, sameTimeQueryResult] = await Promise.all([
          newerQuery.get(),
          sameTimeQuery ? sameTimeQuery.get() : undefined,
        ]);
        if (sameTimeQuery) {
          useDocs = ensureNotFalsy(sameTimeQueryResult).docs as any;
        }
        const missingAmount = batchSize - useDocs.length;
        if (missingAmount > 0) {
          const additionalDocs = newerQueryResult.docs
            .slice(0, missingAmount)
            .filter((x) => !!x);
          appendToArray(useDocs, additionalDocs);
        }
      });

      if (useDocs.length === 0) {
        return c.json({
          checkpoint: lastPulledCheckpoint ?? null,
          documents: [],
        });
      }
      const lastDoc = ensureNotFalsy(lastOfArray(useDocs));
      const documents: WithDeleted<EventDocType>[] = useDocs.map((row) =>
        firestoreRowToDocData("serverTimestamp", "id", row),
      );
      const newCheckpoint: FirestoreCheckpointType = {
        id: lastDoc.id,
        serverTimestamp: serverTimestampToIsoString(
          "serverTimestamp",
          lastDoc.data(),
        ),
      };
      const ret = {
        documents: documents,
        checkpoint: newCheckpoint,
      };
      return c.json(ret);
    },
  )
  .post(
    "/events/push",
    zValidator(
      "json",
      z.array(
        z.object({
          newDocumentState: z
            .object({
              id: z.string().optional(),
              _deleted: z.boolean(),
            })
            .passthrough(),
          assumedMasterState: z
            .object({
              id: z.string().optional(),
              _deleted: z.boolean(),
            })
            .passthrough()
            .optional(),
        }),
      ),
    ),
    requireAuth(["calendar"]),
    async (c) => {
      const rows = c.req.valid(
        "json",
      ) as RxReplicationWriteToMasterRow<EventDocType>[];
      const user = c.var.user;
      const { adminFirestore } = getFirebaseAdmin(c);
      const eventsRef = adminFirestore
        .collection("users")
        .doc(user.userId)
        .collection("events");

      const writeRowsById: ById<RxReplicationWriteToMasterRow<EventDocType>> =
        {};
      const docIds: string[] = rows
        .map((row) => {
          const docId = row.newDocumentState["id"];
          if (!docId) return;
          writeRowsById[docId] = row;
          return docId;
        })
        .filter((x) => !!x) as string[];
      let conflicts: WithDeleted<EventDocType>[] = [];

      /**
       * Everything must run INSIDE of the transaction
       * because on tx-errors, firebase will re-run the transaction on some cases.
       * @link https://firebase.google.com/docs/firestore/manage-data/transactions#transaction_failure
       * @link https://firebase.google.com/docs/firestore/manage-data/transactions
       */
      await adminFirestore.runTransaction(async (_tx) => {
        conflicts = []; // reset in case the tx has re-run.
        /**
         * @link https://stackoverflow.com/a/48423626/3443137
         */

        const getQuery = (ids: string[]) => {
          return eventsRef
            .where(FieldPath.documentId(), "in", ids)
            .get()
            .then((result) => result.docs)
            .catch((error) => {
              if (
                error?.code &&
                (error as FirebaseFirestoreError).code === "permission-denied"
              ) {
                // Query may fail due to rules using 'resource' with non existing ids
                // So try to get the docs one by one
                return Promise.all(
                  ids.map((id) => eventsRef.doc(id).get()),
                ).then((docs) => docs.filter((doc) => doc.exists));
              }
              throw error;
            }) as Promise<QueryDocumentSnapshot<EventDocType>[]>;
        };

        const docsInDbResult = await getContentByIds<EventDocType>(
          docIds,
          getQuery,
        );

        const docsInDbById: ById<EventDocType> = {};
        docsInDbResult.forEach((row) => {
          const docDataInDb = stripServerTimestampField(
            "serverTimestamp",
            row.data(),
          );
          const docId = row.id;
          (docDataInDb as any)["id"] = docId;
          docsInDbById[docId] = docDataInDb;
        });

        /**
         * @link https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes
         */
        const batch = adminFirestore.batch();
        let hasWrite = false;
        await Promise.all(
          Object.entries(writeRowsById).map(async ([docId, writeRow]) => {
            const docInDb: EventDocType | undefined = docsInDbById[docId];
            if (
              docInDb &&
              (!writeRow.assumedMasterState ||
                deepCompare(docInDb, writeRow.assumedMasterState) === false)
            ) {
              // Conflict if doc exists and assumedMasterState is different
              console.log("[PUSH] Conflict detected", docId);
              conflicts.push(docInDb as any);
            } else {
              console.log("[PUSH] Write", docId);
              // No conflict if doc does not exist or assumedMasterState is the same
              hasWrite = true;
              const docRef = eventsRef.doc(docId);
              const writeDocData = flatClone(writeRow.newDocumentState);
              (writeDocData as any)["serverTimestamp"] =
                FieldValue.serverTimestamp();
              if (!docInDb) {
                // insert
                batch.set(docRef, stripPrimaryKey("id", writeDocData));
              } else {
                // update
                batch.update(docRef, stripPrimaryKey("id", writeDocData));
              }
            }
          }),
        );

        if (hasWrite) {
          await batch.commit();
        }
      });
      return c.json(conflicts);
    },
  )
  .get(
    "/timetablesync/pull",
    zValidator(
      "query",
      z.object({
        id: z.string(),
        serverTimestamp: z.string(),
        batchSize: z.coerce.number().optional(),
      }),
    ),
    requireAuth(["calendar"]),
    async (c) => {
      const { id, serverTimestamp, batchSize = 10 } = c.req.valid("query");
      const user = c.var.user;

      let newerQuery: Query;
      let sameTimeQuery: Query | undefined;
      const { adminFirestore } = getFirebaseAdmin(c);
      const pullQuery = adminFirestore
        .collection("users")
        .doc(user.userId)
        .collection("timetablesync");

      const lastPulledCheckpoint = serverTimestamp
        ? {
            id,
            serverTimestamp,
          }
        : null;

      if (lastPulledCheckpoint) {
        const lastServerTimestamp = isoStringToServerTimestamp(
          lastPulledCheckpoint.serverTimestamp,
        );
        newerQuery = pullQuery
          .where("serverTimestamp", ">", lastServerTimestamp)
          .orderBy("serverTimestamp", "asc")
          .limit(batchSize);
        sameTimeQuery = pullQuery
          .where("serverTimestamp", "==", lastServerTimestamp)
          .where(FieldPath.documentId(), ">", id)
          .orderBy(FieldPath.documentId(), "asc")
          .limit(batchSize);
      } else {
        newerQuery = pullQuery
          .orderBy("serverTimestamp", "asc")
          .limit(batchSize);
      }

      let useDocs: QueryDocumentSnapshot<TimetableSyncDocType>[] = [];
      await adminFirestore.runTransaction(async (_tx) => {
        useDocs = [];
        const [newerQueryResult, sameTimeQueryResult] = await Promise.all([
          newerQuery.get(),
          sameTimeQuery ? sameTimeQuery.get() : undefined,
        ]);
        if (sameTimeQuery) {
          useDocs = ensureNotFalsy(sameTimeQueryResult).docs as any;
        }
        const missingAmount = batchSize - useDocs.length;
        if (missingAmount > 0) {
          const additionalDocs = newerQueryResult.docs
            .slice(0, missingAmount)
            .filter((x) => !!x);
          appendToArray(useDocs, additionalDocs);
        }
      });

      if (useDocs.length === 0) {
        return c.json({
          checkpoint: lastPulledCheckpoint ?? null,
          documents: [],
        });
      }
      const lastDoc = ensureNotFalsy(lastOfArray(useDocs));
      const documents: WithDeleted<TimetableSyncDocType>[] = useDocs.map(
        (row) => firestoreRowToDocData("serverTimestamp", "semester", row),
      );
      const newCheckpoint: FirestoreCheckpointType = {
        id: lastDoc.id,
        serverTimestamp: serverTimestampToIsoString(
          "serverTimestamp",
          lastDoc.data(),
        ),
      };
      const ret = {
        documents: documents,
        checkpoint: newCheckpoint,
      };
      return c.json(ret);
    },
  )
  .post(
    "/timetablesync/push",
    zValidator(
      "json",
      z.array(
        z.object({
          newDocumentState: z
            .object({
              semester: z.string().optional(),
              _deleted: z.boolean(),
            })
            .passthrough(),
          assumedMasterState: z
            .object({
              semester: z.string().optional(),
              _deleted: z.boolean(),
            })
            .passthrough()
            .optional(),
        }),
      ),
    ),
    requireAuth(["calendar"]),
    async (c) => {
      const rows = c.req.valid(
        "json",
      ) as RxReplicationWriteToMasterRow<TimetableSyncDocType>[];
      const user = c.var.user;
      const { adminFirestore } = getFirebaseAdmin(c);
      const timetableSyncRef = adminFirestore
        .collection("users")
        .doc(user.userId)
        .collection("timetablesync");

      const writeRowsById: ById<
        RxReplicationWriteToMasterRow<TimetableSyncDocType>
      > = {};
      const docIds: string[] = rows
        .map((row) => {
          const docId = row.newDocumentState["semester"];
          if (!docId) return;
          writeRowsById[docId] = row;
          return docId;
        })
        .filter((x) => !!x) as string[];
      let conflicts: WithDeleted<TimetableSyncDocType>[] = [];

      /**
       * Everything must run INSIDE of the transaction
       * because on tx-errors, firebase will re-run the transaction on some cases.
       * @link https://firebase.google.com/docs/firestore/manage-data/transactions#transaction_failure
       * @link https://firebase.google.com/docs/firestore/manage-data/transactions
       */
      await adminFirestore.runTransaction(async (_tx) => {
        conflicts = []; // reset in case the tx has re-run.
        /**
         * @link https://stackoverflow.com/a/48423626/3443137
         */

        const getQuery = (ids: string[]) => {
          return timetableSyncRef
            .where(FieldPath.documentId(), "in", ids)
            .get()
            .then((result) => result.docs)
            .catch((error) => {
              if (
                error?.code &&
                (error as FirebaseFirestoreError).code === "permission-denied"
              ) {
                // Query may fail due to rules using 'resource' with non existing ids
                // So try to get the docs one by one
                return Promise.all(
                  ids.map((id) => timetableSyncRef.doc(id).get()),
                ).then((docs) => docs.filter((doc) => doc.exists));
              }
              throw error;
            }) as Promise<QueryDocumentSnapshot<TimetableSyncDocType>[]>;
        };

        const docsInDbResult = await getContentByIds<TimetableSyncDocType>(
          docIds,
          getQuery,
        );

        const docsInDbById: ById<TimetableSyncDocType> = {};
        docsInDbResult.forEach((row) => {
          const docDataInDb = stripServerTimestampField(
            "serverTimestamp",
            row.data(),
          );
          const docId = row.id;
          (docDataInDb as any)["semester"] = docId;
          docsInDbById[docId] = docDataInDb;
        });

        /**
         * @link https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes
         */
        const batch = adminFirestore.batch();
        let hasWrite = false;
        await Promise.all(
          Object.entries(writeRowsById).map(async ([docId, writeRow]) => {
            const docInDb: TimetableSyncDocType | undefined =
              docsInDbById[docId];
            if (
              docInDb &&
              (!writeRow.assumedMasterState ||
                deepCompare(docInDb, writeRow.assumedMasterState) === false)
            ) {
              // Conflict if doc exists and assumedMasterState is different
              console.log("[PUSH] Conflict detected", docId);
              conflicts.push(docInDb as any);
            } else {
              console.log("[PUSH] Write", docId);
              // No conflict if doc does not exist or assumedMasterState is the same
              hasWrite = true;
              const docRef = timetableSyncRef.doc(docId);
              const writeDocData = flatClone(writeRow.newDocumentState);
              (writeDocData as any)["serverTimestamp"] =
                FieldValue.serverTimestamp();
              if (!docInDb) {
                // insert
                batch.set(docRef, stripPrimaryKey("semester", writeDocData));
              } else {
                // update
                batch.update(docRef, stripPrimaryKey("semester", writeDocData));
              }
            }
          }),
        );

        if (hasWrite) {
          await batch.commit();
        }
      });
      return c.json(conflicts);
    },
  );

export default app;
