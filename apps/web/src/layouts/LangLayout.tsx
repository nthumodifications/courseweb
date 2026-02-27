import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { Suspense } from "react";
import LoadingPage from "@/components/Pages/LoadingPage";

const locales = ["en", "zh"];

function getLocale(): string {
  const cookieLocale = document.cookie
    .split("; ")
    .find((c) => c.startsWith("locale="))
    ?.split("=")[1];
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }
  const browserLang = navigator.language.split("-")[0];
  if (locales.includes(browserLang)) {
    return browserLang;
  }
  return "zh";
}

const LangLayout = () => {
  const { lang } = useParams<{ lang: string }>();
  const location = useLocation();

  if (!lang || !locales.includes(lang)) {
    // Preserve the full path: e.g. /courses/ABC -> /zh/courses/ABC
    const preferredLang = getLocale();
    return (
      <Navigate
        to={`/${preferredLang}${location.pathname}${location.search}${location.hash}`}
        replace
      />
    );
  }

  return (
    <Suspense fallback={<LoadingPage />}>
      <Outlet />
    </Suspense>
  );
};

export default LangLayout;
