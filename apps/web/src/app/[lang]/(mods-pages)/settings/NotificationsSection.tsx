import { Button, Switch } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { useAccountActions } from "@/hooks/useAccountActions";
import { useSettings } from "@/hooks/contexts/settings";
import { usePushNotifications } from "@/lib/push/usePushNotifications";
import { SettingItem } from "./SettingItem";
import { SettingsSection } from "./SettingsSection";

export const NotificationsSection = () => {
  const dict = useDictionary();
  const { language } = useSettings();
  const { handleLogin } = useAccountActions();
  const notifications = usePushNotifications();
  const copy = dict.settings.notifications;
  const controlsDisabled =
    notifications.status !== "ready" || notifications.isBusy;
  const dependentControlsDisabled =
    controlsDisabled || !notifications.subscribed;

  const stateDescription = (() => {
    switch (notifications.status) {
      case "signed-out":
        return copy.states.signed_out;
      case "unsupported":
        return copy.states.unsupported;
      case "ios-not-installed":
        return copy.states.ios_not_installed;
      case "permission-denied":
        return copy.states.permission_denied;
      case "not-configured":
        return copy.states.not_configured;
      case "error":
        return copy.states.error;
      case "loading":
        return copy.states.loading;
      default:
        return undefined;
    }
  })();

  const deviceControl =
    notifications.status === "signed-out" ? (
      <div className="flex items-center gap-2">
        <Switch checked={false} disabled />
        <Button variant="outline" size="sm" onClick={handleLogin}>
          {dict.settings.account.signin}
        </Button>
      </div>
    ) : notifications.status === "error" ? (
      <div className="flex items-center gap-2">
        <Switch checked={false} disabled />
        <Button
          variant="outline"
          size="sm"
          onClick={() => void notifications.retry()}
        >
          {copy.retry}
        </Button>
      </div>
    ) : (
      <Switch
        checked={notifications.subscribed}
        disabled={controlsDisabled}
        onCheckedChange={(checked) =>
          void (checked
            ? notifications.subscribe()
            : notifications.unsubscribe())
        }
      />
    );

  return (
    <SettingsSection id="notifications" title={copy.title}>
      <SettingItem
        id="setting-notifications-device"
        title={copy.device.title}
        description={stateDescription}
        searchKeywords={[copy.device.title, ...Object.values(copy.states)]}
        control={deviceControl}
      />
      <SettingItem
        id="setting-notifications-course-changes"
        title={copy.course_changes.title}
        description={copy.course_changes.description}
        searchKeywords={[
          copy.course_changes.title,
          copy.course_changes.description,
        ]}
        control={
          <Switch
            checked={notifications.preferences.courseChanges}
            disabled={dependentControlsDisabled}
            onCheckedChange={notifications.setCourseChanges}
          />
        }
      />
      <SettingItem
        id="setting-notifications-announcement-digest"
        title={copy.announcement_digest.title}
        description={
          <>
            {copy.announcement_digest.description}{" "}
            <a
              className="text-primary underline underline-offset-4"
              href={`/${language}/announcements`}
            >
              {copy.announcement_digest.announcements_link}
            </a>
          </>
        }
        searchKeywords={[
          copy.announcement_digest.title,
          copy.announcement_digest.description,
          copy.announcement_digest.announcements_link,
        ]}
        control={
          <Switch
            checked={notifications.announcementDigestEnabled}
            disabled={dependentControlsDisabled}
            onCheckedChange={notifications.setAnnouncementDigest}
          />
        }
      />
      <SettingItem
        id="setting-notifications-test"
        title={copy.test.title}
        description={notifications.testSent ? copy.test.sent : undefined}
        searchKeywords={[copy.test.title, copy.test.sent]}
        control={
          <Button
            variant="outline"
            size="sm"
            disabled={dependentControlsDisabled}
            onClick={() => void notifications.sendTest()}
          >
            {copy.test.action}
          </Button>
        }
      />
    </SettingsSection>
  );
};
