// This is a temporary workaround to get headless ais to work 
// as current server actions are failing

import type { signInToCCXP } from "@/lib/headless_ais";
import type { refreshUserSession } from "@/lib/headless_ais";

export const fetchSignInToCCXP = async (studentid: string, password: string) => {
    const form = new FormData();
    form.append("studentid", studentid);
    form.append("password", password);
    const res = await fetch('/api/ais_auth/signin', {
        method: 'POST',
        body: form
    });
    return await res.json() as ReturnType<Awaited<typeof signInToCCXP>>;
}

export const fetchRefreshUserSession = async (studentid: string, encryptedPassword: string) => {
    const form = new FormData();
    form.append("studentid", studentid);
    form.append("encryptedPassword", encryptedPassword);
    const res = await fetch('/api/ais_auth/refresh', {
        method: 'POST',
        body: form
    });
    return await res.json() as ReturnType<Awaited<typeof refreshUserSession>>;
}