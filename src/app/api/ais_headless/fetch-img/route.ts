import { NextRequest } from "next/server";

export const runtime = "edge";

export const GET = async (req: NextRequest) => {
    const pwdstr = req.nextUrl.searchParams.get('pwdstr');
    if (!pwdstr) {
        return new Response('pwdstr is required', { status: 400 });
    }
    const imgResponse = await fetch('http://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/auth_img.php?pwdstr=' + pwdstr);
    return new Response(await imgResponse.arrayBuffer(), {
        headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
        },
    });
};