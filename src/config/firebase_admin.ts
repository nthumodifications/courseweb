import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;
if(!serviceAccountBase64) throw new Error('FIREBASE_SERVICE_ACCOUNT is required');
const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString());

export const admin =
  getApps().find((it) => it.name === "firebase-admin-app") ||
  initializeApp(
    {
      credential: cert(serviceAccount),
    },
    "firebase-admin-app"
  );
export const adminAuth = getAuth(admin);
export const adminFirestore = getFirestore(admin);