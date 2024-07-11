import { z } from "zod";
import { procedure, router } from '@/server/trpc';
import { refreshUserSession, signInToCCXP } from "@/lib/headless_ais";
import { TRPCError } from "@trpc/server";


export const authRouter = router({
    login: procedure
        .input(z.object({ studentid: z.string(), password: z.string() }))
        .mutation(async ({ input, ctx }) => { // POST
            const { studentid, password } = input;
            
            const res = await signInToCCXP(studentid, password);
            // check if error exists
            if('error' in res) throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                cause: res.error.message,
            });
            
            // set cookie
            ctx.setCookie('accessToken', res.accessToken, 'path = /; SameSite = Strict; Secure');
            return res;
        }),
    refresh: procedure
        .input(z.object({ studentid: z.string(), encryptedPassword: z.string() }))
        .mutation(async ({ input, ctx }) => { // POST
            const { studentid, encryptedPassword } = input;
            const res = await refreshUserSession(studentid, encryptedPassword);
            // check if error exists
            if('error' in res) throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                cause: res.error.message,
            });
            // set cookie
            ctx.setCookie('accessToken', res.accessToken, 'path = /; SameSite = Strict; Secure');
            return res;
        }),

});