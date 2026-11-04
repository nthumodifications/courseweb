import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { Context } from "hono";
import { env } from "hono/adapter";

const getFirebaseAdminForServiceAccount = (
  FIREBASE_SERVICE_ACCOUNT: string,
) => {
  const serviceAccount = JSON.parse(
    Buffer.from(FIREBASE_SERVICE_ACCOUNT, "base64").toString(),
  );

  const admin =
    getApps().find((it) => it.name === "firebase-admin-app") ||
    initializeApp(
      {
        credential: cert(serviceAccount),
      },
      "firebase-admin-app",
    );
  const adminAuth = getAuth(admin);
  const adminFirestore = getFirestore(admin);

  return { admin, adminAuth, adminFirestore };
};

export const getFirebaseAdmin = (c: Context) => {
  const { FIREBASE_SERVICE_ACCOUNT } = env<{
    FIREBASE_SERVICE_ACCOUNT: string;
  }>(c);
  return getFirebaseAdminForServiceAccount(FIREBASE_SERVICE_ACCOUNT);
};

export const getFirebaseAdminFromProcessEnv = () => {
  const serviceAccount = process.env["FIREBASE_SERVICE_ACCOUNT"];
  if (!serviceAccount)
    throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set");
  return getFirebaseAdminForServiceAccount(serviceAccount);
};
