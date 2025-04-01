import type { QueryDocumentSnapshot } from "@google-cloud/firestore";
export type FirestoreCheckpointType = {
    id: string;
    serverTimestamp: string;
};
export type EventDocType = {
    id: string | undefined;
};
export type TimetableSyncDocType = {
    semester: string;
};
export type GetQuery<RxDocType> = (ids: string[]) => Promise<QueryDocumentSnapshot<RxDocType>[]>;
