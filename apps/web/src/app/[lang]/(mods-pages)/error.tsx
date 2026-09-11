import * as Sentry from "@sentry/browser";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertOctagon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import { reloadApp } from "@/lib/chunk-recovery";
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

  // use sumting wong? 10% chance
  const isSumtingWong = Math.random() < 0.1;

  return (
    <div
      data-nosnippet
      className="h-[--content-height] w-full overflow-x-hidden grid place-items-center px-4"
    >
      <Alert variant="destructive" color="danger">
        <AlertOctagon />
        <AlertTitle>
          {isSumtingWong ? dict.error.message_3 : dict.error.something_wong}
        </AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        <div className="flex flex-row justify-end gap-1">
          <a href="https://github.com/nthumodifications/courseweb/issues/new/choose">
            <Button variant="destructive" size="sm">
              {dict.error.report_issue}
            </Button>
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
          >
            {dict.error.try_again}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void reloadApp()}>
            {dict.error.reload_app}
          </Button>
        </div>
      </Alert>
    </div>
  );
}
