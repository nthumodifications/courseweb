import { z } from "zod";
import { procedure, router } from '@/server/trpc';
import { refreshUserSession, signInToCCXP } from "@/lib/headless_ais";


export const authRouter = router({
    login: procedure
        .input(z.object({ studentid: z.string(), password: z.string() }))
        .mutation(async ({ input, ctx }) => { // POST
            const { studentid, password } = input;
            
            const res = await signInToCCXP(studentid, password);
            return res;
        }),
    refresh: procedure
        .input(z.object({ studentid: z.string(), encryptedPassword: z.string() }))
        .mutation(async ({ input, ctx }) => { // POST
            const { studentid, encryptedPassword } = input;
            const res = await refreshUserSession(studentid, encryptedPassword);
            return res;
        }),

});