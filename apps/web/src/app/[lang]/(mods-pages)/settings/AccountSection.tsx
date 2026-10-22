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
import { useState, type ReactNode } from "react";
import useDictionary from "@/dictionaries/useDictionary";
import { useAccountActions } from "@/hooks/useAccountActions";
import { useSettings } from "@/hooks/contexts/settings";
import useUserTimetable, {
  type CourseLocalStorage,
} from "@/hooks/contexts/useUserTimetable";
import {
  type CourseBackup,
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

const getIntlLocale = (language: string) => {
  if (language === "en") return "en";
  if (language === "zh-cn") return "zh-CN";
  return "zh-TW";
};

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
    courses: semesters.reduce(
      (total, courseIDs) => total + courseIDs.length,
      0,
    ),
  };
};

type AccountCopy = ReturnType<typeof useDictionary>["settings"]["account"];
type AccountUser = NonNullable<ReturnType<typeof useAccountActions>["user"]>;

const getSyncStatusText = ({
  status,
  lastSyncedAt,
  language,
  messages,
}: {
  status: TimetableSyncStatus;
  lastSyncedAt: number | null;
  language: string;
  messages: AccountCopy["syncStatus"];
}) => {
  if (status === "signed-out") return messages.signedOut;
  if (status === "syncing") return messages.syncing;
  if (status === "error") return messages.error;
  if (lastSyncedAt === null) return messages.syncedNoTime;
  return messages.synced.replace(
    "{time}",
    formatRelativeTime(lastSyncedAt, language),
  );
};

const getSyncStatusClassName = (status: TimetableSyncStatus) => {
  if (status === "error") {
    return "flex items-center gap-2 text-sm text-red-500";
  }
  return "flex items-center gap-2 text-sm text-muted-foreground";
};

const getRestoreDescription = ({
  selectedBackupIndex,
  currentTimetableEmpty,
  copy,
}: {
  selectedBackupIndex: number | null;
  currentTimetableEmpty: boolean;
  copy: AccountCopy;
}) => {
  if (selectedBackupIndex === null) return copy.restoreDescription;
  if (currentTimetableEmpty) return copy.restoreConfirmDescriptionEmpty;
  return copy.restoreConfirmDescription;
};

interface AccountIdentitySettingProps {
  copy: AccountCopy;
  signedIn: boolean;
  user: AccountUser | null | undefined;
  onLogin: () => void;
  onLogout: () => void;
}

const AccountIdentitySetting = ({
  copy,
  signedIn,
  user,
  onLogin,
  onLogout,
}: AccountIdentitySettingProps) => {
  let title: ReactNode = copy.title;
  let description: string | undefined = copy.syncDescription;
  let onClick = onLogin;
  let actionLabel = copy.signin;

  if (signedIn && user) {
    title = (
      <div className="flex flex-col font-normal">
        <div className="text-sm">{user.profile.name}</div>
        <div className="text-xs text-muted-foreground">{user.profile.sub}</div>
      </div>
    );
    description = undefined;
    onClick = onLogout;
    actionLabel = copy.signout;
  }

  return (
    <SettingItem
      id="setting-account"
      searchKeywords={[copy.signin, copy.signout, copy.title]}
      title={title}
      description={description}
      control={
        <Button variant="outline" size="sm" onClick={onClick}>
          {actionLabel}
        </Button>
      }
    />
  );
};

interface SyncStatusSettingProps {
  copy: AccountCopy;
  status: TimetableSyncStatus;
  statusText: string;
}

const SyncStatusSetting = ({
  copy,
  status,
  statusText,
}: SyncStatusSettingProps) => (
  <SettingItem
    id="setting-sync-status"
    title={copy.syncTitle}
    searchKeywords={[
      copy.syncTitle,
      copy.syncDescription,
      copy.syncStatus.syncing,
      copy.syncStatus.synced,
      copy.syncStatus.syncedNoTime,
      copy.syncStatus.error,
    ]}
    control={
      <div className={getSyncStatusClassName(status)}>
        {status === "syncing" && (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        <span>{statusText}</span>
      </div>
    }
  />
);

interface RestoreSettingProps {
  copy: AccountCopy;
  restoreEnabled: boolean;
  onOpen: () => void;
  description: string;
}

const RestoreSetting = ({
  copy,
  restoreEnabled,
  onOpen,
  description,
}: RestoreSettingProps) => (
  <SettingItem
    id="setting-restore-backup"
    title={copy.restoreTitle}
    searchKeywords={[copy.restoreTitle, copy.restoreAction]}
    description={description}
    control={
      <Button
        variant="outline"
        size="sm"
        disabled={!restoreEnabled}
        onClick={onOpen}
      >
        {copy.restoreAction}
      </Button>
    }
  />
);

interface AccountSettingsSectionProps {
  copy: AccountCopy;
  signedIn: boolean;
  user: AccountUser | null | undefined;
  syncStatus: TimetableSyncStatus;
  syncStatusText: string;
  restoreEnabled: boolean;
  timetableSyncError: boolean;
  backups: CourseBackup<CourseLocalStorage>[];
  onLogin: () => void;
  onLogout: () => void;
  onOpenRestore: () => void;
}

const AccountSettingsSection = ({
  copy,
  signedIn,
  user,
  syncStatus,
  syncStatusText,
  restoreEnabled,
  timetableSyncError,
  backups,
  onLogin,
  onLogout,
  onOpenRestore,
}: AccountSettingsSectionProps) => {
  let restoreDescription = copy.restoreDescription;
  if (signedIn && timetableSyncError) {
    restoreDescription = copy.restoreSyncErrorDescription;
  }

  return (
    <SettingsSection id="account" title={copy.title}>
      <AccountIdentitySetting
        copy={copy}
        signedIn={signedIn}
        user={user}
        onLogin={onLogin}
        onLogout={onLogout}
      />
      <SyncStatusSetting
        copy={copy}
        status={syncStatus}
        statusText={syncStatusText}
      />
      {backups.length > 0 && (
        <RestoreSetting
          copy={copy}
          restoreEnabled={restoreEnabled}
          onOpen={onOpenRestore}
          description={restoreDescription}
        />
      )}
    </SettingsSection>
  );
};

interface AccountBackupDialogProps {
  copy: AccountCopy;
  cancelLabel: string;
  language: string;
  backups: CourseBackup<CourseLocalStorage>[];
  selectedBackupIndex: number | null;
  currentTimetableEmpty: boolean;
  restoreEnabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectedBackupIndexChange: (index: number | null) => void;
  onRestore: () => void;
}

const AccountBackupDialog = ({
  copy,
  cancelLabel,
  language,
  backups,
  selectedBackupIndex,
  currentTimetableEmpty,
  restoreEnabled,
  open,
  onOpenChange,
  onSelectedBackupIndexChange,
  onRestore,
}: AccountBackupDialogProps) => {
  const handleCancel = () => {
    if (selectedBackupIndex === null) {
      onOpenChange(false);
      return;
    }
    onSelectedBackupIndexChange(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:w-full">
        <DialogHeader>
          <DialogTitle>
            {selectedBackupIndex === null
              ? copy.restoreTitle
              : copy.restoreConfirmTitle}
          </DialogTitle>
          <DialogDescription>
            {getRestoreDescription({
              selectedBackupIndex,
              currentTimetableEmpty,
              copy,
            })}
          </DialogDescription>
        </DialogHeader>
        {selectedBackupIndex === null && (
          <div className="divide-y divide-border">
            {backups.map((backup, index) => {
              const summary = getBackupSummary(backup.value);
              return (
                <button
                  key={`${backup.savedAt}-${index}`}
                  type="button"
                  className="flex w-full flex-col gap-1 py-4 text-left hover:bg-accent"
                  onClick={() => onSelectedBackupIndexChange(index)}
                >
                  <span className="text-sm font-medium">
                    {copy.restoreSavedAt.replace(
                      "{time}",
                      formatBackupDate(backup.savedAt, language),
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {copy.restoreSummary
                      .replace("{semesters}", String(summary.semesters))
                      .replace("{courses}", String(summary.courses))}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleCancel}>
            {cancelLabel}
          </Button>
          {selectedBackupIndex !== null && (
            <Button disabled={!restoreEnabled} onClick={onRestore}>
              {copy.restoreConfirm}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const syncStatusText = getSyncStatusText({
    status: syncStatus,
    lastSyncedAt: timetableSyncStatus.lastSyncedAt,
    language,
    messages: dict.settings.account.syncStatus,
  });

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

  const handleOpenRestore = () => {
    setSelectedBackupIndex(null);
    setBackupDialogOpen(true);
  };

  return (
    <>
      <AccountSettingsSection
        copy={dict.settings.account}
        signedIn={signedInState}
        user={user}
        syncStatus={syncStatus}
        syncStatusText={syncStatusText}
        restoreEnabled={restoreEnabled}
        timetableSyncError={timetableSyncError}
        backups={backups}
        onLogin={handleLogin}
        onLogout={openLogoutDialog}
        onOpenRestore={handleOpenRestore}
      />
      <AccountLogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        keepLocalData={keepLocalData}
        onKeepLocalDataChange={setKeepLocalData}
        onConfirm={handleConfirmLogout}
      />
      <AccountBackupDialog
        copy={dict.settings.account}
        cancelLabel={dict.common.cancel}
        language={language}
        backups={backups}
        selectedBackupIndex={selectedBackupIndex}
        currentTimetableEmpty={currentTimetableEmpty}
        restoreEnabled={restoreEnabled}
        open={backupDialogOpen}
        onOpenChange={handleBackupDialogChange}
        onSelectedBackupIndexChange={setSelectedBackupIndex}
        onRestore={handleRestore}
      />
    </>
  );
};
