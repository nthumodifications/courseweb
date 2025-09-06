import { QueryDocumentSnapshot, Timestamp } from "@google-cloud/firestore";
import { type WithDeleted, flatClone } from "rxdb";
import type { GetQuery } from "./firestore_replication_types";

export function stripServerTimestampField(
  serverTimestampField: string,
  docData: any,
): any {
  const { [serverTimestampField]: _, ...rest } = docData;
  return rest;
}

export function firestoreRowToDocData<RxDocType>(
  serverTimestampField: string,
  primaryPath: string,
  row: QueryDocumentSnapshot<RxDocType>,
): WithDeleted<RxDocType> {
  const docData = stripServerTimestampField(serverTimestampField, row.data());
  (docData as any)[primaryPath] = row.id;

  if (primaryPath !== "id") {
    delete (docData as any)["id"];
  }

  return docData;
}

export function serverTimestampToIsoString(
  serverTimestampField: string,
  docData: any,
): string {
  const timestamp = (docData as any)[serverTimestampField];
  const date: Date = timestamp.toDate();
  return date.toISOString();
}

export function isoStringToServerTimestamp(isoString: string): Timestamp {
  const date = new Date(isoString);
  return Timestamp.fromDate(date);
}

export function stripPrimaryKey(primaryPath: string, docData: any): any {
  docData = flatClone(docData);
  delete (docData as any)[primaryPath];
  return docData;
}
// https://stackoverflow.com/questions/61354866/is-there-a-workaround-for-the-firebase-query-in-limit-to-10

export function getContentByIds<RxDocType>(
  ids: string[],
  getQuery: GetQuery<RxDocType>,
): Promise<QueryDocumentSnapshot<RxDocType>[]> {
  const batches = [];

  while (ids.length) {
    // firestore limits batches to 10
    const batch = ids.splice(0, 10);

    // add the batch request to to a queue
    batches.push(getQuery(batch));
  }

  // after all of the data is fetched, return it
  return Promise.all(batches).then((content) => content.flat());
}
