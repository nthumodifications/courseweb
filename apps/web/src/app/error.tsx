import * as Sentry from "@sentry/browser";
import { useEffect } from "react";
import { AlertOctagon, View } from "lucide-react";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@courseweb/ui";
import NTHUModsLogo from "@/components/Branding/NTHUModsLogo";
import { reloadApp } from "@/lib/chunk-recovery";
import useDictionary from "@/dictionaries/useDictionary";
export default function ErrorPage({
  error,
  resetErrorBoundary: reset,
}: Readonly<{
  error: Error;
  resetErrorBoundary: () => void;
}>) {
  const dict = useDictionary();

  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  const errorStrings = [
    dict.error.message_1,
    dict.error.message_2,
    dict.error.message_3,
    dict.error.message_4,
    dict.error.message_5,
    dict.error.message_6,
    dict.error.message_7,
    dict.error.message_8,
    dict.error.message_9,
  ];

  const selectedString =
    errorStrings[Math.floor(Math.random() * errorStrings.length)];

  return (
    <div
      data-nosnippet
      className="h-screen w-screen grid place-items-center px-4"
    >
      <div className="flex flex-col gap-4 max-w-[90vw]">
        <div className="flex flex-col md:flex-row gap-4">
          <NTHUModsLogo width={64} height={64} />
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-bold">{selectedString}</h1>
            <div className="flex flex-col gap-2">
              <p className="">{dict.error.client_description}</p>
              <p className="text-sm text-muted-foreground">
                {dict.error.tips_title}
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                <li>{dict.error.check_connection}</li>
                <li>{dict.error.clear_cache}</li>
                <li>{dict.error.dcard}</li>
                <li>
                  {dict.error.report_here}{" "}
                  <a
                    href="https://github.com/nthumodifications/courseweb/issues/new/choose"
                    className="underline text-purple-500"
                  >
                    Github
                  </a>{" "}
                  <a
                    href="https://instagram.com/nthumods"
                    className="underline text-purple-500"
                  >
                    IG
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline">
              <View className="mr-2" />
              <span className="font-mono">{dict.error.stack_trace}</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="text-xs rounded-md p-4 bg-black text-white overflow-x-auto">
              {error.stack}
            </pre>
          </CollapsibleContent>
        </Collapsible>
        <Button variant="outline" onClick={() => void reloadApp()}>
          {dict.error.reload_app}
        </Button>
      </div>
    </div>
  );
}
