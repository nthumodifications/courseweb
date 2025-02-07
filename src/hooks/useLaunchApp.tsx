import { apps } from "@/const/apps";
import React from "react";
import { useCallback } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { event } from "@/lib/gtag";
const useLaunchApp = (app: (typeof apps)[number]) => {
  const dict = useDictionary();
  const { ais, getACIXSTORE } = useHeadlessAIS();
  const router = useRouter();
  const [aisLoading, setAisLoading] = React.useState(false);

  const launchFn = useCallback(async () => {
    event({
      action: "open_app",
      category: "app",
      label: "open_app_" + app.id,
    });
    if (app.ais) {
      if (!ais.enabled) {
        toast({ title: dict.ccxp.not_logged_in_error });
        return;
      }

      setAisLoading(true);
      try {
        const token = await getACIXSTORE();
        if (!token) {
          setAisLoading(false);
          return;
        }

        // if starts with http, open in new tab
        if (app.href.startsWith("https://www.ccxp.nthu.edu.tw")) {
          // Redirect user
          const redirect_url = app.href + `?ACIXSTORE=${token}`;
          console.log(redirect_url);
          const link = document.createElement("a");
          link.href = redirect_url;
          link.target = "_blank";
          link.click();
        } else {
          router.push(app.href);
        }
      } catch (e) {
        console.error("Failed to get ACIXSTORE", e);
      } finally {
        setAisLoading(false);
      }
    } else {
      router.push(app.href);
    }
  }, [router, app, ais, getACIXSTORE, dict]);

  const cancelFn = () => {
    setAisLoading(false);
  };

  return [launchFn, aisLoading, cancelFn] as const;
};

export default useLaunchApp;
