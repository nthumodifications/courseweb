import { AlertCircle, KeyRound, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Button } from "@courseweb/ui";
import { Link, useParams } from "react-router-dom";
import { ChatError } from "@/hooks/useAIChat";
import useDictionary from "@/dictionaries/useDictionary";

interface ChatErrorAlertProps {
  error: ChatError;
  onRetry: () => void;
  onDismiss: () => void;
}

export function ChatErrorAlert({
  error,
  onRetry,
  onDismiss,
}: Readonly<ChatErrorAlertProps>) {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  const copy = dict.chat.errors[error.code];
  const canRetry = error.code !== "auth" && error.code !== "bad_request";

  return (
    <Alert variant="destructive" className="relative">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription className="mt-2 flex flex-wrap items-center gap-3">
        <span>{copy.description}</span>
        {error.code === "auth" && (
          <Link
            to={`/${lang ?? "zh"}/settings`}
            onClick={onDismiss}
            className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
          >
            <KeyRound className="h-3.5 w-3.5" />
            {copy.settings}
          </Link>
        )}
        {canRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {dict.chat.retry}
          </Button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs underline underline-offset-4"
        >
          {dict.chat.dismiss}
        </button>
      </AlertDescription>
    </Alert>
  );
}
