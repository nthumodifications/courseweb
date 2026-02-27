import * as Sentry from "@sentry/browser";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertOctagon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@courseweb/ui";
import { Button } from "@courseweb/ui";
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

  // use sumting wong? 10% chance
  const isSumtingWong = Math.random() < 0.1;

  return (
    <div className="h-[--content-height] w-screen overflow-x-clip grid place-items-center px-4">
      <Alert variant="destructive" color="danger">
        <AlertOctagon />
        <AlertTitle>
          {isSumtingWong ? "Sumting wong?" : "Something went wrong"}
        </AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        <div className="flex flex-row justify-end gap-1">
          <a href="https://github.com/nthumodifications/courseweb/issues/new/choose">
            <Button variant="destructive" size="sm">
              Report issue
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
            Try again
          </Button>
        </div>
      </Alert>
    </div>
  );
}
