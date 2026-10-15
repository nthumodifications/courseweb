import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import prisma from "../src/client";
import {
  compareUserStorageRecords,
  FirestoreUserStore,
  PostgresUserStore,
} from "../src/storage/userStore";
import { validKeys } from "../src/api/kv_storage_contract";

export type BackfillCounts = {
  users: number;
  firestoreRows: number;
  invalidRows: number;
  missing: number;
  newer: number;
  unchanged: number;
  copied: number;
  notCopied: number;
  errors: number;
};

type BackfillFirestore = Pick<FirestoreUserStore, "listAllPage">;
type BackfillPostgres = Pick<PostgresUserStore, "get" | "put">;

export type BackfillOptions = {
  firestore: BackfillFirestore;
  postgres: BackfillPostgres;
  dryRun: boolean;
  batchSize?: number;
  concurrency?: number;
};

const DEFAULT_CONCURRENCY = 16;
const MAX_CONCURRENCY = 64;

const parseStoragePath = (path: string) => {
  const parts = path.split("/");
  if (parts.length !== 4) return undefined;
  const [root, userId, collection, key] = parts;
  if (
    root !== "users" ||
    !userId ||
    collection !== "storage" ||
    !key ||
    !validKeys.includes(key as (typeof validKeys)[number])
  ) {
    return undefined;
  }
  return { userId, key };
};

export async function runBackfill({
  firestore,
  postgres,
  dryRun,
  batchSize = 500,
  concurrency = DEFAULT_CONCURRENCY,
}: BackfillOptions): Promise<BackfillCounts> {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > MAX_CONCURRENCY) {
    throw new Error(
      `concurrency must be an integer between 1 and ${MAX_CONCURRENCY}`,
    );
  }

  const users = new Set<string>();
  const counts = {
    users: 0,
    firestoreRows: 0,
    invalidRows: 0,
    missing: 0,
    newer: 0,
    unchanged: 0,
    copied: 0,
    notCopied: 0,
    errors: 0,
  } satisfies BackfillCounts;

  const startedAt = performance.now();
  let cursor: string | undefined;
  do {
    let page;
    try {
      page = await firestore.listAllPage(cursor, batchSize);
    } catch (error) {
      counts.errors += 1;
      console.error("Failed to read a Firestore backfill page:", error);
      break;
    }

    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < page.documents.length) {
        const document = page.documents[nextIndex++];
        counts.firestoreRows += 1;
        const { path, record } = document;
        const location = parseStoragePath(path);
        if (!location || !record) {
          counts.invalidRows += 1;
          console.error(`Skipping invalid Firestore storage document: ${path}`);
          continue;
        }

        const { userId, key } = location;
        users.add(userId);
        try {
          if (dryRun) {
            const existing = await postgres.get(userId, key);
            if (existing && compareUserStorageRecords(record, existing) < 0) {
              counts.unchanged += 1;
              continue;
            }

            if (existing) counts.newer += 1;
            else counts.missing += 1;
          } else {
            const copied = await postgres.put(userId, key, record, {
              merge: false,
            });
            if (copied) counts.copied += 1;
            else counts.notCopied += 1;
          }
        } catch (error) {
          counts.errors += 1;
          console.error(`Failed to backfill ${userId}/${key}:`, error);
        }
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(concurrency, page.documents.length) },
        () => worker(),
      ),
    );

    const elapsedMinutes = (performance.now() - startedAt) / 60_000;
    const rowsPerMinute =
      elapsedMinutes > 0 ? counts.firestoreRows / elapsedMinutes : 0;
    const skipped = counts.invalidRows + counts.unchanged + counts.notCopied;
    console.log(
      `Backfill progress: processed=${counts.firestoreRows} ` +
        `copied=${counts.copied} skipped=${skipped} errors=${counts.errors} ` +
        `rows/min=${rowsPerMinute.toFixed(1)}`,
    );

    cursor = page.nextCursor;
  } while (cursor);

  counts.users = users.size;
  return counts;
}

export const setBackfillExitCode = (counts: BackfillCounts) => {
  if (counts.errors > 0) process.exitCode = 1;
};

const runCommand = async () => {
  const dryRun = !process.argv.includes("--apply");
  const concurrencyArgument = process.argv.find((argument) =>
    argument.startsWith("--concurrency="),
  );
  const concurrency = concurrencyArgument
    ? Number(concurrencyArgument.slice("--concurrency=".length))
    : DEFAULT_CONCURRENCY;
  const serviceAccountValue = process.env["FIREBASE_SERVICE_ACCOUNT"];

  if (!serviceAccountValue) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is required");
  }

  const serviceAccount = JSON.parse(
    Buffer.from(serviceAccountValue, "base64").toString(),
  );
  const firebaseApp =
    getApps().find((app) => app.name === "user-storage-backfill") ??
    initializeApp(
      { credential: cert(serviceAccount) },
      "user-storage-backfill",
    );
  const firestore = new FirestoreUserStore(() => getFirestore(firebaseApp));
  const postgres = new PostgresUserStore(prisma);

  let counts: BackfillCounts;
  try {
    counts = await runBackfill({ firestore, postgres, dryRun, concurrency });
  } finally {
    await prisma.$disconnect();
  }

  console.log(
    JSON.stringify({ dryRun, batchSize: 500, concurrency, ...counts }, null, 2),
  );
  setBackfillExitCode(counts);
};

if (import.meta.main) {
  await runCommand();
}
