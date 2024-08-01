'use server';
import admin from "@/config/firebase_admin";
import { getUserSession } from "../headless_ais"
import {ServerAction} from '@/types/actions';

/**
 * Get Firebase token for the current user session
 * @returns {ServerAction<string>} Firebase token
 */
export const getFirebaseToken: ServerAction<string> = async () => {
    const user = await getUserSession();
    if(!user) return {
        error: {
            message: 'User not found'
        }
    }
    // read user document
    const userDoc = await admin.firestore().collection('users').doc(user.studentid).get();
    if(!userDoc.exists) {
        userDoc.ref.set({
            department: user.department,
            lastUpdated: admin.firestore.Timestamp.fromDate(new Date(0)),
        })
    }
    const firebaseToken = await admin.auth().createCustomToken(user.studentid, {
        department: user.department,
        email: user.email,
        grade: user.grade,
        name_en: user.name_en,
        name_zh: user.name_zh,
        studentid: user.studentid,
    })
    console.log('minted firebase token for ', user.studentid)
    return firebaseToken;
}