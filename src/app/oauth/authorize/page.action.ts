'use server'
import { encryptPassword } from '@/helpers/password';
import { signInToNTHUAIS } from '@/lib/headless_ais';
import crypto from 'crypto';
import jws from 'jws';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { redirect } from 'next/navigation';

export type AuthorizationData = {
    // response_type, client_id, redirect_uri, scope, state
    response_type: string,
    client_id: string,
    redirect_uri: string,
    scope: string,
    state: string
}
export const loginAndAuthorize = async (authReq: AuthorizationData, form: FormData) => {
    // get the studentid and password from the form
    const studentid = form.get('username') as string;
    const password = form.get('password') as string;
    const scopes = authReq.scope.split(" ");
    try {
        const { ACIXSTORE } = await signInToNTHUAIS(studentid, password);
        const payload = {
            studentid,
            ...scopes.includes('login') ? { password: await encryptPassword(password) } : {},
            scope: authReq.scope
        }
        const code = jws.sign({
            header: { alg: 'HS256' },
            payload,
            secret: process.env.NTHU_OAUTH_AUTH_CODE_SECRET
        });
        redirect(`${authReq.redirect_uri}?code=${code}&state=${authReq.state}`);
    } catch (e) {
        if(isRedirectError(e)) throw e;
        throw new Error("Invalid Credentials");
    }
}
