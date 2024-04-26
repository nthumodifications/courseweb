import { fetchEeClass } from "@/lib/elearning";
import {NextRequest} from "next/server";

export const GET = async (req: NextRequest) => {
    const cookie = decodeURI(req.nextUrl.searchParams.get("cookie") as string)
    const url = decodeURI(req.nextUrl.searchParams.get("url") as string)
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

    return await fetchEeClass(cookie, url);
}