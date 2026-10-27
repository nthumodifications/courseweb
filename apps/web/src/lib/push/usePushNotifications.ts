import { useAuth } from "react-oidc-context";
import { useLocalStorage } from "usehooks-ts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@/hooks/contexts/settings";
import {
  ANNOUNCEMENT_FOLLOWS_KEY,
  getEffectiveFollowIds,
  isValidFollowIds,
  useAnnouncements,
} from "@/lib/announcements";
import type { Language } from "@/types/settings";
import {
  detectPushSupport,
  getPushConfig,
  getThisDeviceStatus,
  PushClientError,
  sendTest,
  subscribeThisDevice,
  unsubscribeThisDevice,
  updatePrefs,
  type PushPreferences,
  type PushSupportReason,
} from "./push";

export type PushViewStatus =
  | "loading"
  | "signed-out"
  | "unsupported"
  | "ios-not-installed"
  | "permission-denied"
  | "not-configured"
  | "error"
  | "ready";

const statusFromError = (error: unknown): PushViewStatus => {
  if (error instanceof PushClientError) {
    if (error.code === "permission_denied") return "permission-denied";
    if (error.code === "ios-not-installed") return "ios-not-installed";
    if (error.code === "unsupported") return "unsupported";
    if (error.status === 503 || error.code === "push_not_configured") {
      return "not-configured";
    }
  }
  return "error";
};

const supportStatus = (reason: PushSupportReason): PushViewStatus => {
  if (reason === "ios-not-installed") return "ios-not-installed";
  if (reason === "permission-denied") return "permission-denied";
  if (reason === "unsupported") return "unsupported";
  return "ready";
};

const usePushAuthToken = () => {
  const auth = useAuth();
  return auth.isAuthenticated && !auth.user?.expired
    ? (auth.user?.access_token ?? null)
    : null;
};

export const usePushNotifications = () => {
  const token = usePushAuthToken();
  const { language } = useSettings();
  const { data: announcements } = useAnnouncements();
  const [storedFollowIds] = useLocalStorage<unknown>(
    ANNOUNCEMENT_FOLLOWS_KEY,
    null,
  );
  const announcementSources = useMemo(() => {
    if (!announcements?.sources) {
      return isValidFollowIds(storedFollowIds) ? storedFollowIds : [];
    }
    return getEffectiveFollowIds(
      storedFollowIds,
      announcements.sources,
      language,
    );
  }, [announcements?.sources, language, storedFollowIds]);
  const defaultPreferences = useMemo<PushPreferences>(
    () => ({
      courseChanges: false,
      announcementSources,
      language,
    }),
    [announcementSources, language],
  );
  const [status, setStatus] = useState<PushViewStatus>("loading");
  const [subscribed, setSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<PushPreferences | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setStatus("signed-out");
      setSubscribed(false);
      setPreferences(null);
      return;
    }

    const support = detectPushSupport();
    if (!support.supported) {
      setStatus(supportStatus(support.reason));
      setSubscribed(false);
      setPreferences(null);
      return;
    }

    setStatus("loading");
    try {
      const config = await getPushConfig();
      if (!config.enabled) {
        setStatus("not-configured");
        setSubscribed(false);
        setPreferences(null);
        return;
      }
      const device = await getThisDeviceStatus(token);
      setSubscribed(device.subscribed);
      setPreferences(device.prefs ?? defaultPreferences);
      setStatus("ready");
    } catch (error) {
      setStatus(statusFromError(error));
      setSubscribed(false);
      setPreferences(null);
    }
  }, [defaultPreferences, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentPreferences = useCallback(
    (changes: Partial<PushPreferences> = {}): PushPreferences => ({
      ...(preferences ?? defaultPreferences),
      ...changes,
      announcementSources,
      language,
    }),
    [announcementSources, defaultPreferences, language, preferences],
  );

  const subscribe = useCallback(async () => {
    if (!token) return;
    setIsBusy(true);
    setTestSent(false);
    try {
      const nextPreferences = currentPreferences();
      const result = await subscribeThisDevice(nextPreferences, token);
      setSubscribed(true);
      setPreferences(result.prefs ?? nextPreferences);
      setStatus("ready");
    } catch (error) {
      setStatus(statusFromError(error));
    } finally {
      setIsBusy(false);
    }
  }, [currentPreferences, token]);

  const unsubscribe = useCallback(async () => {
    if (!token) return;
    setIsBusy(true);
    try {
      await unsubscribeThisDevice(token);
      setSubscribed(false);
      setPreferences(null);
      setStatus("ready");
    } catch (error) {
      setStatus(statusFromError(error));
    } finally {
      setIsBusy(false);
    }
  }, [token]);

  const changePreferences = useCallback(
    async (changes: Partial<PushPreferences>) => {
      if (!token || !subscribed) return;
      setIsBusy(true);
      try {
        const nextPreferences = currentPreferences(changes);
        const result = await updatePrefs(nextPreferences, token);
        setPreferences(result.prefs ?? nextPreferences);
        setStatus("ready");
      } catch (error) {
        setStatus(statusFromError(error));
      } finally {
        setIsBusy(false);
      }
    },
    [currentPreferences, subscribed, token],
  );

  const sendTestNotification = useCallback(async () => {
    if (!token || !subscribed) return;
    setIsBusy(true);
    setTestSent(false);
    try {
      await sendTest(token);
      setTestSent(true);
      setStatus("ready");
    } catch (error) {
      setStatus(statusFromError(error));
    } finally {
      setIsBusy(false);
    }
  }, [subscribed, token]);

  return {
    status,
    subscribed,
    preferences: preferences ?? defaultPreferences,
    isBusy,
    testSent,
    retry: load,
    subscribe,
    unsubscribe,
    setCourseChanges: (enabled: boolean) =>
      void changePreferences({ courseChanges: enabled }),
    setAnnouncementDigest: (enabled: boolean) =>
      void changePreferences({
        announcementSources: enabled ? announcementSources : [],
      }),
    sendTest: sendTestNotification,
  };
};

export const usePushAnnouncementPreferences = (
  announcementSources: readonly string[],
  language: Language,
) => {
  const token = usePushAuthToken();
  const previousSignature = useRef<string>();
  const sourcesSignature = announcementSources.join("\u0000");
  const signature = `${token ?? ""}\u0000${language}\u0000${sourcesSignature}`;

  useEffect(() => {
    if (previousSignature.current === undefined) {
      previousSignature.current = signature;
      return;
    }
    if (previousSignature.current === signature) return;
    previousSignature.current = signature;
    if (!token || !detectPushSupport().supported) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        const device = await getThisDeviceStatus(token);
        if (!device.subscription || !device.subscribed) return;
        await updatePrefs(
          {
            courseChanges: device.prefs?.courseChanges ?? false,
            announcementSources: device.prefs?.announcementSources.length
              ? [...announcementSources]
              : [],
            language,
          },
          token,
        );
      })().catch(() => {
        // Follow changes are local-first and must never block the page.
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [announcementSources, language, signature, token]);
};
