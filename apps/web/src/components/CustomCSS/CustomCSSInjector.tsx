import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

const STYLE_ID = "nthumods-custom-css";

const CustomCSSInjector = () => {
  const [customCSS] = useLocalStorage("custom_css", "");

  useEffect(() => {
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = customCSS;
    return () => {
      // leave the style element — it will be updated on next render
    };
  }, [customCSS]);

  return null;
};

export default CustomCSSInjector;
