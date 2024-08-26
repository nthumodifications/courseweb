"use client";
import { useSettings } from "@/hooks/contexts/settings";
import { useEffect, useState } from "react";
import { AISLoading } from "@/components/Pages/AISLoading";
import { AISError } from "@/components/Pages/AISError";
import { useParams, useSearchParams } from "next/navigation";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { AISNotLoggedIn } from "@/components/Pages/AISNotLoggedIn";

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
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { getACIXSTORE, ais } = useHeadlessAIS();

  const path = params.path instanceof Array ? params.path : [params.path];

  useEffect(() => {
    (async () => {
      const token = await getACIXSTORE();
      if (!token) {
        setLoading(false);
        setError("Login Failed");
        return;
      }

      //handle custom url (but strictly for ccxp)
      if (path[0] === "custom") {
        const url = searchParams.get("url");
        if (!url) {
          setLoading(false);
          setError("Invalid URL");
          return;
        }

        // check if the url is a valid ccxp url, prevent phishing for ACIXSTORE
        if (!url.startsWith("https://www.ccxp.nthu.edu.tw")) {
          setLoading(false);
          setError("Invalid URL");
          return;
        }

        // Redirect user
        const redirect_url = url + `?ACIXSTORE=${token}`;
        console.log(redirect_url);
        const link = document.createElement("a");
        link.href = redirect_url;
        link.click();
        setLoading(false);
      } else {
        //redirect user
        const redirect_url = `https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/${path.join("/")}?ACIXSTORE=`;
        const link = document.createElement("a");
        link.href = redirect_url + token;
        link.click();
      }

      setLoading(false);
    })();
  }, [getACIXSTORE, searchParams, path]);

  if (!ais.enabled) return <AISNotLoggedIn />;
  if (loading) return <AISLoading />;
  if (error) return <AISError />;
  return (
    <div className="w-screen h-screen grid place-items-center">
      <h1>Redirecting...</h1>
    </div>
  );
};

export default RedirectPage;
