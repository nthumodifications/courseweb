import { apps } from "@/const/apps";
import React from "react";
import { useCallback } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@courseweb/ui";
import { event } from "@/lib/gtag";
const useLaunchApp = (app: (typeof apps)[number]) => {
  const dict = useDictionary();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();

  const launchFn = useCallback(async () => {
    event({
      action: "open_app" + app.id,
      category: "app",
      label: "open_app_" + app.id,
    });
    if (app.href.startsWith("http")) {
      window.open(app.href, "_blank");
    } else {
      navigate(`/${lang}${app.href}`);
    }
  }, [navigate, app, lang]);

  return [launchFn] as const;
};

export default useLaunchApp;
