'use server';
import { adminAuth as auth, adminFirestore } from "@/config/firebase_admin";
import { UserJWT } from "@/types/headless_ais";
import { SessionCookieOptions, getAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { cookies } from "next/headers";

export const mintFirebaseToken = async (user: UserJWT) => {
    // read user document
    const userDoc = await adminFirestore.collection('users').doc(user.studentid).get();
    if(!userDoc.exists) {
        userDoc.ref.set({
            department: user.department,
            lastUpdated: Timestamp.fromDate(new Date(0)),
        })
    }
    const firebaseToken = await auth.createCustomToken(user.studentid, {
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

export async function isUserAuthenticated(session: string | undefined = undefined) {
    const _session = session ?? (await getSession());
    if (!_session) return false;
  
    try {
      const isRevoked = !(await auth.verifySessionCookie(_session, true));
      return !isRevoked;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
  
  export async function getCurrentUser() {
    const session = await getSession();
  
    if (!(await isUserAuthenticated(session))) {
      return null;
    }
  
    const decodedIdToken = await auth.verifySessionCookie(session!);
    const currentUser = await auth.getUser(decodedIdToken.uid);
  
    return currentUser;
  }
  
  async function getSession() {
    try {
      return cookies().get("__session")?.value;
    } catch (error) {
      return undefined;
    }
  }
  
  export async function createSessionCookie(idToken: string, sessionCookieOptions: SessionCookieOptions) {
    return auth.createSessionCookie(idToken, sessionCookieOptions);
  }
  
  export async function revokeAllSessions(session: string) {
    const decodedIdToken = await auth.verifySessionCookie(session);
  
    return await auth.revokeRefreshTokens(decodedIdToken.sub);
  }

  export const signIn = async (idToken: string) => {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
      
    const sessionCookie = await createSessionCookie(idToken, { expiresIn });
  
    cookies().set("__session", sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: true });
  }
  
  export const signOut = async () => {
    const sessionCookie = cookies().get("__session")?.value;

    if (!sessionCookie)
        return { success: false, error: "Session not found." }

    cookies().delete("__session");

    await revokeAllSessions(sessionCookie);

    return { success: true, data: "Signed out successfully." }

}