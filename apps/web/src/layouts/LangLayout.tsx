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

// Looks like a language tag (fr, zh-TW, en_us), as opposed to a page name.
const languageTagPattern = /^[a-z]{2}([-_][a-z]{2,4})?$/i;

/**
 * Where to send a URL whose first segment is not a supported locale.
 * `/fr/courses` swaps the unsupported language for the preferred one;
 * `/laundry` has no language at all, so the whole path is kept.
 */
export function localizedRedirectPath(
  pathname: string,
  preferredLang: string,
): string {
  const firstSegment = pathname.split("/")[1] ?? "";
  const nestedPath = languageTagPattern.test(firstSegment)
    ? pathname.replace(/^\/[^/]+/, "")
    : pathname;
  const target =
    nestedPath === "" || nestedPath === "/" ? "/today" : nestedPath;
  return `/${preferredLang}${target}`;
}

const LangLayout = () => {
  const { lang } = useParams<{ lang: string }>();
  const location = useLocation();

  if (!lang || !locales.includes(lang)) {
    return (
      <Navigate
        to={`${localizedRedirectPath(location.pathname, getLocale())}${location.search}${location.hash}`}
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
