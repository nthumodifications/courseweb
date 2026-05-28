import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";

const NotFound = () => {
  const { lang } = useParams<{ lang: string }>();
  const isZh = lang !== "en";

  const title = isZh ? "找不到頁面 | NTHUMods" : "Page Not Found | NTHUMods";
  const description = isZh
    ? "您要尋找的頁面不存在或已被移除。"
    : "The page you are looking for does not exist or has been removed.";
  const canonical = `https://nthumods.com/${isZh ? "zh" : "en"}/not-found`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <meta name="googlebot" content="noindex, nofollow, noarchive" />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="grid place-items-center dark:bg-background w-screen h-screen">
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-2xl">{isZh ? "找不到頁面" : "Page not found"}</p>
        </div>
      </div>
    </>
  );
};

export default NotFound;
