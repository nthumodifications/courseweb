import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: { path: string[] } }
) {
    const { path } = params;
    const cookieStore = cookies()
    const token = cookieStore.get('ACIXSTORE')
    if(!token?.value) redirect('/settings')

    const redirect_url = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/${path.join('/')}?ACIXSTORE=${token?.value}`
    return NextResponse.redirect(redirect_url, { 
        status: 302, 
        headers: {
            'referrerPolicy': 'origin',
            'referer': `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/IN_INQ_STU.php?ACIXSTORE=${token?.value}`
        }
    })
}