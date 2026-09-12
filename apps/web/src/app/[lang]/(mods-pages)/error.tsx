import * as Sentry from "@sentry/browser";
import { useEffect } from "react";
import { AlertOctagon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
export default function Error({
  error,
  resetErrorBoundary: reset,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);
  }, [error]);
  const dict = useDictionary();

  return (
    <div
      data-nosnippet
      className="h-[--content-height] w-full overflow-x-hidden flex flex-col gap-4 px-4 pt-4 items-start"
    >
      <Alert variant="destructive">
        <AlertOctagon />
        <AlertTitle>{dict.error.something_wong}</AlertTitle>
        <AlertDescription className="leading-relaxed">
          {dict.error.client_description}
        </AlertDescription>
        <div className="flex flex-row gap-2">
          <Button variant="outline" size="sm" onClick={() => reset()}>
            {dict.error.try_again}
          </Button>
        </div>
      </Alert>
    </div>
  );
}
