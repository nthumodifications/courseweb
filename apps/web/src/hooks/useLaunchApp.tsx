import { apps } from "@/const/apps";
import React from "react";
import { useCallback } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import { useNavigate } from "react-router-dom";
import { toast } from "@courseweb/ui";
import { event } from "@/lib/gtag";
const useLaunchApp = (app: (typeof apps)[number]) => {
  const dict = useDictionary();
  const navigate = useNavigate();

  const launchFn = useCallback(async () => {
    event({
      action: "open_app" + app.id,
      category: "app",
      label: "open_app_" + app.id,
    });
    navigate(app.href);
  }, [navigate, app]);

  return [launchFn] as const;
};

export default useLaunchApp;
