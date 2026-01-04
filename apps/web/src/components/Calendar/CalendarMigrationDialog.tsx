"use client";

import { useState, useEffect } from "react";
import { useRxDB } from "rxdb-hooks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import { Progress } from "@courseweb/ui";
import { Alert, AlertDescription } from "@courseweb/ui";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import {
  migrateCalendarV1ToV2,
  rollbackMigration,
  isMigrationNeeded,
  type MigrationProgress,
  type MigrationResult,
} from "@/lib/migrations/calendar-v1-to-v2";

type MigrationPhase =
  | "check"
  | "prompt"
  | "migrating"
  | "success"
  | "error"
  | "rollback";

export function CalendarMigrationDialog() {
  const db = useRxDB();
  const [phase, setPhase] = useState<MigrationPhase>("check");
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);

  // Check if migration is needed on mount
  useEffect(() => {
    if (!db) return;

    isMigrationNeeded(db).then((needed) => {
      setNeedsMigration(needed);
      if (needed) {
        setPhase("prompt");
      } else {
        setPhase("check"); // No migration needed, don't show dialog
      }
    });
  }, [db]);

  const handleStartMigration = async () => {
    if (!db) return;

    setPhase("migrating");

    try {
      const migrationResult = await migrateCalendarV1ToV2(db, setProgress);
      setResult(migrationResult);

      if (migrationResult.success) {
        setPhase("success");
      } else {
        setPhase("error");
      }
    } catch (error) {
      console.error("[Migration UI] Migration failed:", error);
      setPhase("error");
      setResult({
        success: false,
        migratedEvents: 0,
        errorCount: 1,
        errors: [
          {
            eventId: "FATAL",
            error: error instanceof Error ? error.message : String(error),
          },
        ],
        defaultCalendarId: "",
      });
    }
  };

  const handleRollback = async () => {
    if (!db) return;

    setPhase("rollback");
    const success = await rollbackMigration(db);

    if (success) {
      setPhase("prompt");
      setProgress(null);
      setResult(null);
    } else {
      alert("Rollback failed. Please contact support.");
    }
  };

  const handleComplete = () => {
    // Reload the page to use the new schema
    window.location.reload();
  };

  // Don't show dialog if migration is not needed
  if (!needsMigration || phase === "check") {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {phase === "prompt" && (
          <>
            <DialogHeader>
              <DialogTitle>Calendar Upgrade Available</DialogTitle>
              <DialogDescription>
                We&apos;re upgrading your calendar to a new version with better
                performance and features.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">What&apos;s new:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Multiple calendars support for better organization</li>
                  <li>Improved event search functionality</li>
                  <li>Better timezone support</li>
                  <li>10x faster performance with large event lists</li>
                  <li>
                    Standard recurrence format (compatible with other calendar
                    apps)
                  </li>
                </ul>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This upgrade will migrate your existing calendar events to the
                  new format. A backup will be created automatically before the
                  migration.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button onClick={handleStartMigration}>Start Upgrade</Button>
            </DialogFooter>
          </>
        )}

        {phase === "migrating" && progress && (
          <>
            <DialogHeader>
              <DialogTitle>Upgrading Calendar...</DialogTitle>
              <DialogDescription>
                Please wait while we upgrade your calendar data.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{progress.message}</span>
                  <span className="font-medium">
                    {progress.total > 0
                      ? `${progress.current}/${progress.total}`
                      : ""}
                  </span>
                </div>
                {progress.total > 0 && (
                  <Progress
                    value={(progress.current / progress.total) * 100}
                    className="h-2"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {progress.phase === "backup" && "Creating backup..."}
                  {progress.phase === "creating-calendar" &&
                    "Setting up calendars..."}
                  {progress.phase === "migrating" && "Migrating events..."}
                  {progress.phase === "validating" && "Validating data..."}
                </span>
              </div>
            </div>
          </>
        )}

        {phase === "success" && result && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Upgrade Complete!
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  ✓ Successfully migrated {result.migratedEvents} events
                  {result.errorCount > 0 && (
                    <span className="block mt-1 text-yellow-700">
                      ⚠ {result.errorCount} events need review
                    </span>
                  )}
                </p>
              </div>

              {result.errorCount > 0 && result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">
                      Some events could not be migrated:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs max-h-32 overflow-y-auto">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>
                          Event {err.eventId}: {err.error}
                        </li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>... and {result.errors.length - 5} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <h4 className="font-medium text-sm">What&apos;s next?</h4>
                <p className="text-sm text-gray-600">
                  Click &quot;Get Started&quot; to start using your upgraded
                  calendar. You can now create multiple calendars and enjoy
                  better performance!
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              {result.errorCount > 0 && (
                <Button variant="outline" onClick={handleRollback}>
                  Rollback
                </Button>
              )}
              <Button onClick={handleComplete}>Get Started</Button>
            </DialogFooter>
          </>
        )}

        {phase === "error" && result && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Upgrade Failed
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">
                    The calendar upgrade encountered errors:
                  </p>
                  {result.errors.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-xs max-h-32 overflow-y-auto">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>
                          {err.eventId}: {err.error}
                        </li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>... and {result.errors.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>

              <p className="text-sm text-gray-600">
                Your original calendar data is safe. You can try the upgrade
                again or rollback to the previous version.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleRollback}>
                Rollback
              </Button>
              <Button onClick={handleStartMigration}>Try Again</Button>
            </DialogFooter>
          </>
        )}

        {phase === "rollback" && (
          <>
            <DialogHeader>
              <DialogTitle>Rolling Back...</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
