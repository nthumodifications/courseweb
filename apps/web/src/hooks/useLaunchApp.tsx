import { apps } from "@/const/apps";
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { event } from "@/lib/gtag";
const useLaunchApp = (app: (typeof apps)[number]) => {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();

  const launchFn = useCallback(() => {
    event({
      action: "open_app" + app.id,
      category: "app",
      label: "open_app_" + app.id,
    });
    if (app.href.startsWith("http")) {
      window.open(app.href, "_blank");
    } else {
      navigate(`/${lang === "en" ? "en" : "zh"}${app.href}`);
    }
  }, [navigate, app, lang]);

  return [launchFn] as const;
};

export default useLaunchApp;
