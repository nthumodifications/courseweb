import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import useDictionary from "@/dictionaries/useDictionary";

const NotFoundPage = () => {
  const { lang } = useParams<{ lang: string }>();
  const dict = useDictionary();
  const routeLang = lang === "en" || lang === "zh-cn" ? lang : "zh";

  const title = dict.common.not_found_title;
  const description = dict.common.not_found_description;
  const canonical = `https://nthumods.com/${routeLang}/not-found`;

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
          <p className="text-2xl">{dict.common.not_found_heading}</p>
        </div>
      </div>
    </>
  );
};

export default NotFoundPage;
