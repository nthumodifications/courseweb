import admin from 'firebase-admin';

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;
if(!serviceAccountBase64) throw new Error('FIREBASE_SERVICE_ACCOUNT is required');
const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString());
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

export default admin;