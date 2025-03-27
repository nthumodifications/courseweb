import type { Context } from "hono";
export declare const getFirebaseAdmin: (c: Context) => {
    admin: import("firebase-admin/app").App;
    adminAuth: import("firebase-admin/auth").Auth;
    adminFirestore: FirebaseFirestore.Firestore;
};
