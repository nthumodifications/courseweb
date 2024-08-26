"use client"; // Error components must be Client Components
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, View } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import NTHUModsLogo from "@/components/Branding/NTHUModsLogo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { lang } = useParams();

  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  const errorStrings = [
    "完蛋了，工程師今晚要加班了。",
    "糟糕，這裡出了點問題。",
    "哎呀，出了點錯誤。",
    "Oops! Something went wrong.",
    "Mistakes were made.",
    "An error has occurred.",
    "Error 500: Client Side Error",
    "進不去？清大是不是沒電了？",
    "出事了，沒人幫忙修Bug (´。＿。｀)",
  ];

  const selectedString =
    errorStrings[Math.floor(Math.random() * errorStrings.length)];

  const finalLang = (lang as string) ?? "zh";

  return (
    <div className="h-screen w-screen grid place-items-center px-4">
      <div className="flex flex-col gap-4 max-w-[90vw]">
        <div className="flex flex-col md:flex-row gap-4">
          <NTHUModsLogo width={64} height={64} />
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-bold">{selectedString}</h1>
            <Tabs defaultValue={finalLang}>
              <TabsContent value="zh" className="flex flex-col gap-2">
                <p className="">NTHUMods 用戶端出現了系統錯誤。請稍後再試。</p>
                <p className="text-sm text-muted-foreground">你可以試看：</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  <li>檢查您的網路訊號</li>
                  <li>清除瀏覽器快取並重新整理頁面</li>
                  <li>上 Dcard 抱怨</li>
                  <li>
                    在這裡回報錯誤{" "}
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
              </TabsContent>
              <TabsContent value="en" className="flex flex-col gap-2">
                <p className="">
                  A client side error has occurred. Please try again later.
                </p>
                <p className="text-sm text-muted-foreground">You can try:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  <li>Checking your internet connection</li>
                  <li>Clearing your browser cache and refreshing the page</li>
                  <li>Complaining on Dcard</li>
                  <li>
                    Reporting this error here{" "}
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline">
              <View className="mr-2" />
              <span className="font-mono">Stack Trace</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="text-xs rounded-md p-4 bg-black text-white overflow-x-auto">
              {error.stack}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
