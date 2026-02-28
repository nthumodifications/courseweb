import { Navigate } from "react-router-dom";

const locales = ["en", "zh"];

function getLocale(): string {
  // Check cookie first
  const cookieLocale = document.cookie
    .split("; ")
    .find((c) => c.startsWith("locale="))
    ?.split("=")[1];
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // Check browser language
  const browserLang = navigator.language.split("-")[0];
  if (locales.includes(browserLang)) {
    return browserLang;
  }

  return "zh";
}

const RootRedirect = () => {
  const lang = getLocale();
  return <Navigate to={`/${lang}/today`} replace />;
};

export default RootRedirect;
