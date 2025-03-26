import { QueryDocumentSnapshot, Timestamp } from "@google-cloud/firestore";
import { type WithDeleted } from "rxdb";
import type { GetQuery } from "./firestore_replication_types";
export declare function stripServerTimestampField(serverTimestampField: string, docData: any): any;
export declare function firestoreRowToDocData<RxDocType>(serverTimestampField: string, primaryPath: string, row: QueryDocumentSnapshot<RxDocType>): WithDeleted<RxDocType>;
export declare function serverTimestampToIsoString(serverTimestampField: string, docData: any): string;
export declare function isoStringToServerTimestamp(isoString: string): Timestamp;
export declare function stripPrimaryKey(primaryPath: string, docData: any): any;
export declare function getContentByIds<RxDocType>(ids: string[], getQuery: GetQuery<RxDocType>): Promise<QueryDocumentSnapshot<RxDocType>[]>;
