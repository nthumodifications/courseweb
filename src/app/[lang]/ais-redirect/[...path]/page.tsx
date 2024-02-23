'use client';
import { useSettings } from "@/hooks/contexts/settings";
import { useEffect, useState } from "react";
import { AISLoading } from '@/components/Pages/AISLoading';
import { AISError } from '@/components/Pages/AISError';
import { useParams } from "next/navigation";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import {AISNotLoggedIn} from '@/components/Pages/AISNotLoggedIn';

// export async function GET(
//     request: Request,
//     { params, query }: { params: { path: string[] }, query: { [key: string]: string } }
// ) {
//     const { path } = params;
//     const token = query.token;

//     if(!token) return NextResponse.redirect(`https://nthumods.com/`);

//     const redirect_url = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/${path.join('/')}?ACIXSTORE=${token}`
//     return NextResponse.redirect(redirect_url, { 
//         status: 302, 
//         headers: {
//             'referrerPolicy': 'origin',
//             'referer': `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/IN_INQ_STU.php?ACIXSTORE=${token}`
//         }
//     })
// }

const RedirectPage = ({}) => {
    const params = useParams();
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { getACIXSTORE, ais } = useHeadlessAIS();

    const path = params.path instanceof Array ? params.path: [params.path];

    const redirect_url = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/${path.join('/')}?ACIXSTORE=`;
    useEffect(() => {
        (async () => {
                
            const token = await getACIXSTORE();
            if(!token) {
                setLoading(false);
                setError("Login Failed");
                return;
            }
            
            //redirect user
            const link = document.createElement('a');
            link.href = redirect_url + token;
            link.click();
            
            setLoading(false);
        })();
    }, []);

    if (!ais.enabled) return <AISNotLoggedIn/>
    if(loading) return <AISLoading/>;
    if(error) return <AISError/>;
    return <div>Redirecting...</div>;

}

export default RedirectPage;
