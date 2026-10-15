import { Navigate } from "react-router-dom";
import { isLocale, localeFromBrowserLanguage } from "@/types/locale";

function getLocale(): string {
  // Check cookie first
  const cookieLocale = document.cookie
    .split("; ")
    .find((c) => c.startsWith("locale="))
    ?.split("=")[1];
  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  // Check browser language
  return localeFromBrowserLanguage(navigator.language);
}

const RootRedirect = () => {
  const lang = getLocale();
  return <Navigate to={`/${lang}/today`} replace />;
};

export default RootRedirect;
