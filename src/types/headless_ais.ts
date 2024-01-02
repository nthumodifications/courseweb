import { cookies } from "next/headers";

export const getACIXSTORE = async () => {
    const cookie = await cookies();
    const ACIXSTORE = cookie.get('ACIXSTORE')?.value;
    return ACIXSTORE;
}