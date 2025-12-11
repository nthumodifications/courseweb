"use client";
import { AlertCircle, Settings, X } from "lucide-react";
import { Button } from "@courseweb/ui";
import { Alert, AlertDescription, AlertTitle } from "@courseweb/ui";
import { AISettingsDialog } from "./AISettingsDialog";
import useDictionary from "@/dictionaries/useDictionary";

interface QuotaExceededAlertProps {
  retryAfter?: number;
  onDismiss?: () => void;
}

export function QuotaExceededAlert({
  retryAfter,
  onDismiss,
}: QuotaExceededAlertProps) {
  const dict = useDictionary();

  return (
    <Alert variant="destructive" className="relative">
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {dict.chat?.quota_exceeded_title ?? "API 配額已超出"}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          {dict.chat?.quota_exceeded_description ??
            "我們的 API 配額已達上限。您可以使用自己的 Gemini API Key 來繼續使用 AI 課程助手。"}
        </p>
        {retryAfter && (
          <p className="text-sm mb-3">
            {dict.chat?.retry_after ?? "預計"} {retryAfter}{" "}
            {dict.chat?.seconds ?? "秒後可重試"}
          </p>
        )}
        <AISettingsDialog
          trigger={
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              {dict.chat?.open_settings ?? "開啟設定"}
            </Button>
          }
        />
      </AlertDescription>
    </Alert>
  );
}
