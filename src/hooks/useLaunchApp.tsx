import { apps } from "@/const/apps";
import React from "react";
import { useCallback } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { event } from "@/lib/gtag";
const useLaunchApp = (app: (typeof apps)[number]) => {
  const dict = useDictionary();
  const router = useRouter();

  const launchFn = useCallback(async () => {
    event({
      action: "open_app",
      category: "app",
      label: "open_app_" + app.id,
    });
    router.push(app.href);
  }, [router, app]);

  return [launchFn] as const;
};

export default useLaunchApp;
