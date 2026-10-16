import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@courseweb/ui";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import { useAccountActions } from "@/hooks/useAccountActions";
import { useSettings } from "@/hooks/contexts/settings";
import useUserTimetable, {
  type CourseLocalStorage,
} from "@/hooks/contexts/useUserTimetable";
import {
  getSyncedStorageNamespace,
  listCourseBackups,
  restoreCourseBackup,
  saveCourseBackup,
} from "@/hooks/syncedStorage";
import { AccountLogoutDialog } from "@/components/AccountLogoutDialog";
import { SettingItem } from "./SettingItem";
import { SettingsSection } from "./SettingsSection";

export type TimetableSyncStatus = "signed-out" | "syncing" | "synced" | "error";

type TimetableSyncState = {
  uploading: boolean;
  uploadFailed: boolean;
  lastSyncedAt: number | null;
};

export const getTimetableSyncStatus = ({
  signedIn,
  timetableDataReady,
  timetableSyncError,
  timetableSyncStatus,
}: {
  signedIn: boolean;
  timetableDataReady: boolean;
  timetableSyncError: boolean;
  timetableSyncStatus: TimetableSyncState;
}): TimetableSyncStatus => {
  if (!signedIn) return "signed-out";
  if (timetableSyncError || timetableSyncStatus.uploadFailed) return "error";
  if (timetableSyncStatus.uploading || !timetableDataReady) return "syncing";
  return "synced";
};

const getIntlLocale = (language: string) =>
  language === "en" ? "en" : language === "zh-cn" ? "zh-CN" : "zh-TW";

const formatRelativeTime = (timestamp: number, language: string) => {
  const elapsedSeconds = (timestamp - Date.now()) / 1000;
  const relativeTime = new Intl.RelativeTimeFormat(getIntlLocale(language), {
    numeric: "auto",
  });
  const absoluteSeconds = Math.abs(elapsedSeconds);

  if (absoluteSeconds < 60) return relativeTime.format(0, "second");
  if (absoluteSeconds < 60 * 60) {
    return relativeTime.format(Math.round(elapsedSeconds / 60), "minute");
  }
  if (absoluteSeconds < 60 * 60 * 24) {
    return relativeTime.format(Math.round(elapsedSeconds / (60 * 60)), "hour");
  }
  return relativeTime.format(
    Math.round(elapsedSeconds / (60 * 60 * 24)),
    "day",
  );
};

const formatBackupDate = (timestamp: number, language: string) =>
  new Intl.DateTimeFormat(getIntlLocale(language), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);

const getBackupSummary = (value: CourseLocalStorage) => {
  const semesters = Object.values(value).filter(
    (courseIDs) => Array.isArray(courseIDs) && courseIDs.length > 0,
  );
  return {
    semesters: semesters.length,
    courses: semesters.reduce((total, courseIDs) => total + courseIDs.length, 0),
  };
};

export const AccountSection = () => {
  const dict = useDictionary();
  const { language } = useSettings();
  const {
    courses,
    timetableDataReady,
    timetableSyncError,
    timetableSyncStatus,
    restoreCourses,
  } = useUserTimetable();
  const {
    isAuthenticated,
    user,
    handleLogin,
    openLogoutDialog,
    logoutDialogOpen,
    setLogoutDialogOpen,
    keepLocalData,
    setKeepLocalData,
    handleConfirmLogout,
  } = useAccountActions();
  const signedIn = isAuthenticated && user;
  const signedInState = Boolean(signedIn);
  const currentNamespace = getSyncedStorageNamespace(user?.profile.sub);
  const backups = listCourseBackups<CourseLocalStorage>(currentNamespace);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [selectedBackupIndex, setSelectedBackupIndex] = useState<number | null>(
    null,
  );
  const syncStatus = getTimetableSyncStatus({
    signedIn: signedInState,
    timetableDataReady,
    timetableSyncError,
    timetableSyncStatus,
  });
  const restoreEnabled =
    !signedInState ||
    (timetableDataReady &&
      !timetableSyncError &&
      !timetableSyncStatus.uploading);
  const currentTimetableEmpty = Object.values(courses).every(
    (courseIDs) => courseIDs.length === 0,
  );

  const syncStatusText =
    syncStatus === "signed-out"
      ? dict.settings.account.syncStatus.signedOut
      : syncStatus === "synced"
        ? timetableSyncStatus.lastSyncedAt === null
          ? dict.settings.account.syncStatus.syncedNoTime
          : dict.settings.account.syncStatus.synced.replace(
              "{time}",
              formatRelativeTime(timetableSyncStatus.lastSyncedAt, language),
            )
        : syncStatus === "syncing"
          ? dict.settings.account.syncStatus.syncing
          : dict.settings.account.syncStatus.error;

  const handleBackupDialogChange = (open: boolean) => {
    setBackupDialogOpen(open);
    if (!open) setSelectedBackupIndex(null);
  };

  const handleRestore = () => {
    if (selectedBackupIndex === null || !restoreEnabled) {
      return;
    }
    const restoredCourses = restoreCourseBackup<CourseLocalStorage>(
      currentNamespace,
      selectedBackupIndex,
    );
    if (!restoredCourses) return;

    saveCourseBackup(currentNamespace, courses);
    restoreCourses(restoredCourses);
    handleBackupDialogChange(false);
  };

  return (
    <>
      <SettingsSection id="account" title={dict.settings.account.title}>
        <SettingItem
          title={
            signedIn ? (
              <div className="flex flex-col font-normal">
                <div className="text-sm">{user.profile.name}</div>
                <div className="text-xs text-muted-foreground">
                  {user.profile.sub}
                </div>
              </div>
            ) : (
              dict.settings.account.title
            )
          }
          description={
            signedIn ? undefined : dict.settings.account.syncDescription
          }
          control={
            <Button
              variant="outline"
              size="sm"
              onClick={signedIn ? openLogoutDialog : handleLogin}
            >
              {signedIn
                ? dict.settings.account.signout
                : dict.settings.account.signin}
            </Button>
          }
        />
        <SettingItem
          title={dict.settings.account.syncTitle}
          control={
            <div
              className={
                syncStatus === "error"
                  ? "flex items-center gap-2 text-sm text-red-500"
                  : "flex items-center gap-2 text-sm text-muted-foreground"
              }
            >
              {syncStatus === "syncing" && (
                <LoaderCircle
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              <span>{syncStatusText}</span>
            </div>
          }
        />
        {backups.length > 0 && (
          <SettingItem
            title={dict.settings.account.restoreTitle}
            description={
              signedInState && timetableSyncError
                ? dict.settings.account.restoreSyncErrorDescription
                : dict.settings.account.restoreDescription
            }
            control={
              <Button
                variant="outline"
                size="sm"
                disabled={!restoreEnabled}
                onClick={() => {
                  setSelectedBackupIndex(null);
                  setBackupDialogOpen(true);
                }}
              >
                {dict.settings.account.restoreAction}
              </Button>
            }
          />
        )}
      </SettingsSection>
      <AccountLogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        keepLocalData={keepLocalData}
        onKeepLocalDataChange={setKeepLocalData}
        onConfirm={handleConfirmLogout}
      />
      <Dialog open={backupDialogOpen} onOpenChange={handleBackupDialogChange}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:w-full">
          <DialogHeader>
            <DialogTitle>
              {selectedBackupIndex === null
                ? dict.settings.account.restoreTitle
                : dict.settings.account.restoreConfirmTitle}
            </DialogTitle>
            <DialogDescription>
              {selectedBackupIndex === null
                ? dict.settings.account.restoreDescription
                : currentTimetableEmpty
                  ? dict.settings.account.restoreConfirmDescriptionEmpty
                  : dict.settings.account.restoreConfirmDescription}
            </DialogDescription>
          </DialogHeader>
          {selectedBackupIndex === null ? (
            <div className="divide-y divide-border">
              {backups.map((backup, index) => {
                const summary = getBackupSummary(backup.value);
                return (
                  <button
                    key={`${backup.savedAt}-${index}`}
                    type="button"
                    className="flex w-full flex-col gap-1 py-4 text-left hover:bg-accent"
                    onClick={() => setSelectedBackupIndex(index)}
                  >
                    <span className="text-sm font-medium">
                      {dict.settings.account.restoreSavedAt.replace(
                        "{time}",
                        formatBackupDate(backup.savedAt, language),
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {dict.settings.account.restoreSummary
                        .replace("{semesters}", String(summary.semesters))
                        .replace("{courses}", String(summary.courses))}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() =>
                selectedBackupIndex === null
                  ? handleBackupDialogChange(false)
                  : setSelectedBackupIndex(null)
              }
            >
              {dict.common.cancel}
            </Button>
            {selectedBackupIndex !== null && (
              <Button
                disabled={!restoreEnabled}
                onClick={handleRestore}
              >
                {dict.settings.account.restoreConfirm}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
