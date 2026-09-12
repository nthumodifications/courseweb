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
      <AlertTitle>{dict.chat.quota_exceeded_title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-4 leading-relaxed">
          {dict.chat.quota_exceeded_description}
        </p>
        {retryAfter && (
          <p className="text-sm mb-4 leading-relaxed">
            {dict.chat.retry_after} {retryAfter} {dict.chat.seconds}
          </p>
        )}
        <AISettingsDialog
          trigger={
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              {dict.chat.open_settings}
            </Button>
          }
        />
      </AlertDescription>
    </Alert>
  );
}
