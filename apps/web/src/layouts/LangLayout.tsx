import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { Suspense } from "react";
import LoadingPage from "@/components/Pages/LoadingPage";
import { useCachedDictionary } from "@/dictionaries/dictionary-cache";
import {
  SUPPORTED_LOCALES,
  isLocale,
  localeFromBrowserLanguage,
  normalizeLocaleSegment,
} from "@/types/locale";

const locales = new Set<string>(SUPPORTED_LOCALES);

function getLocale(): string {
  const cookieLocale = document.cookie
    .split("; ")
    .find((c) => c.startsWith("locale="))
    ?.split("=")[1];
  if (cookieLocale && locales.has(cookieLocale)) {
    return cookieLocale;
  }
  return localeFromBrowserLanguage(navigator.language);
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
  const explicitLocale = normalizeLocaleSegment(firstSegment);
  const nestedPath =
    explicitLocale || languageTagPattern.test(firstSegment)
      ? pathname.replace(/^\/[^/]+/, "")
      : pathname;
  const target =
    nestedPath === "" || nestedPath === "/" ? "/today" : nestedPath;
  return `/${explicitLocale ?? preferredLang}${target}`;
}

const LangLayout = () => {
  const { lang } = useParams<{ lang: string }>();
  const location = useLocation();

  if (!lang || !isLocale(lang) || !locales.has(lang)) {
    return (
      <Navigate
        to={`${localizedRedirectPath(location.pathname, getLocale())}${location.search}${location.hash}`}
        replace
      />
    );
  }

  return (
    <Suspense fallback={<LoadingPage />}>
      <LocaleDictionaryGate lang={lang} />
    </Suspense>
  );
};

const LocaleDictionaryGate = ({ lang }: { lang: string }) => {
  useCachedDictionary(lang);
  return <Outlet />;
};

export default LangLayout;
