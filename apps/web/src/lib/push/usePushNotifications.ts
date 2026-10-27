import { useAuth } from "react-oidc-context";
import { useLocalStorage } from "usehooks-ts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@/hooks/contexts/settings";
import {
  ANNOUNCEMENT_FOLLOWS_KEY,
  getEffectiveFollowIds,
  useAnnouncements,
} from "@/lib/announcements";
import type { Language } from "@/types/settings";
import {
  detectPushSupport,
  getPushConfig,
  getAnnouncementSourcesForPush,
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

export const PUSH_ANNOUNCEMENT_DIGEST_KEY = "push_announcement_digest";

export const statusFromError = (error: unknown): PushViewStatus => {
  if (error instanceof PushClientError) {
    if (error.status === 401) return "signed-out";
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
  const [announcementDigestEnabled, setAnnouncementDigestEnabled] =
    useLocalStorage<boolean>(PUSH_ANNOUNCEMENT_DIGEST_KEY, true);
  const announcementSourcesLoaded = announcements?.sources !== undefined;
  const announcementSources = useMemo(() => {
    return getEffectiveFollowIds(
      storedFollowIds,
      announcements?.sources ?? [],
      language,
    );
  }, [announcements?.sources, language, storedFollowIds]);
  const defaultPreferences = useMemo<PushPreferences>(
    () => ({
      courseChanges: false,
      announcementSources: getAnnouncementSourcesForPush(
        announcementDigestEnabled,
        announcementSources,
      ),
      language,
    }),
    [announcementDigestEnabled, announcementSources, language],
  );
  const [status, setStatus] = useState<PushViewStatus>("loading");
  const [subscribed, setSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<PushPreferences | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const generationRef = useRef(0);
  const previousTokenRef = useRef(token);
  const preferencesRef = useRef<PushPreferences | null>(null);
  const preferencesQueueRef = useRef<Promise<void>>(Promise.resolve());
  const defaultsRef = useRef({
    announcementDigestEnabled,
    announcementSources,
    defaultPreferences,
  });
  defaultsRef.current = {
    announcementDigestEnabled,
    announcementSources,
    defaultPreferences,
  };

  const applyError = useCallback((error: unknown) => {
    const nextStatus = statusFromError(error);
    setStatus(nextStatus);
    if (nextStatus === "signed-out") {
      setSubscribed(false);
      setPreferences(null);
      preferencesRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (previousTokenRef.current === token) return;
    previousTokenRef.current = token;
    generationRef.current += 1;
    preferencesRef.current = null;
    preferencesQueueRef.current = Promise.resolve();
    setIsBusy(false);
  }, [token]);

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    const isCurrent = () => generationRef.current === generation;
    if (!token) {
      preferencesRef.current = null;
      if (!isCurrent()) return;
      setStatus("signed-out");
      setSubscribed(false);
      setPreferences(null);
      setIsBusy(false);
      return;
    }

    const support = detectPushSupport();
    if (!support.supported) {
      if (!isCurrent()) return;
      setStatus(supportStatus(support.reason));
      setSubscribed(false);
      setPreferences(null);
      setIsBusy(false);
      return;
    }

    setIsBusy(false);
    setStatus("loading");
    try {
      const config = await getPushConfig();
      if (!isCurrent()) return;
      if (!config.enabled) {
        setStatus("not-configured");
        setSubscribed(false);
        setPreferences(null);
        setIsBusy(false);
        return;
      }
      const device = await getThisDeviceStatus(token);
      if (!isCurrent()) return;
      const {
        announcementDigestEnabled: currentDigestEnabled,
        announcementSources: currentAnnouncementSources,
        defaultPreferences: currentDefaultPreferences,
      } = defaultsRef.current;
      const loadedPreferences = device.prefs ?? currentDefaultPreferences;
      const nextPreferences = {
        ...loadedPreferences,
        announcementSources: getAnnouncementSourcesForPush(
          currentDigestEnabled,
          currentAnnouncementSources,
        ),
      } satisfies PushPreferences;
      setSubscribed(device.subscribed);
      preferencesRef.current = nextPreferences;
      setPreferences(nextPreferences);
      setStatus("ready");
    } catch (error) {
      if (!isCurrent()) return;
      setStatus(statusFromError(error));
      setSubscribed(false);
      setPreferences(null);
      preferencesRef.current = null;
      setIsBusy(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentPreferences = useCallback(
    (
      changes: Partial<PushPreferences> = {},
      digestEnabled = announcementDigestEnabled,
    ): PushPreferences => ({
      ...(preferencesRef.current ?? preferences ?? defaultPreferences),
      ...changes,
      announcementSources: getAnnouncementSourcesForPush(
        digestEnabled,
        announcementSources,
      ),
      language,
    }),
    [
      announcementDigestEnabled,
      announcementSources,
      defaultPreferences,
      language,
      preferences,
    ],
  );

  const subscribe = useCallback(async () => {
    if (!token || !announcementSourcesLoaded) return;
    const generation = ++generationRef.current;
    const isCurrent = () => generationRef.current === generation;
    setIsBusy(true);
    setTestSent(false);
    try {
      const nextPreferences = currentPreferences();
      const result = await subscribeThisDevice(nextPreferences, token);
      if (!isCurrent()) return;
      setSubscribed(true);
      const resolvedPreferences = result.prefs ?? nextPreferences;
      preferencesRef.current = resolvedPreferences;
      setPreferences(resolvedPreferences);
      setStatus("ready");
    } catch (error) {
      if (isCurrent()) applyError(error);
    } finally {
      if (isCurrent()) setIsBusy(false);
    }
  }, [announcementSourcesLoaded, applyError, currentPreferences, token]);

  const unsubscribe = useCallback(async () => {
    if (!token) return;
    const generation = ++generationRef.current;
    const isCurrent = () => generationRef.current === generation;
    setIsBusy(true);
    try {
      await unsubscribeThisDevice(token);
      if (!isCurrent()) return;
      setSubscribed(false);
      setPreferences(null);
      preferencesRef.current = null;
      setStatus("ready");
    } catch (error) {
      if (isCurrent()) applyError(error);
    } finally {
      if (isCurrent()) setIsBusy(false);
    }
  }, [applyError, token]);

  const changePreferences = useCallback(
    (
      changes: Partial<PushPreferences>,
      digestEnabled = announcementDigestEnabled,
    ) => {
      if (!token || !subscribed) return;
      const generation = ++generationRef.current;
      const nextPreferences = currentPreferences(changes, digestEnabled);
      preferencesRef.current = nextPreferences;
      setIsBusy(true);

      const update = preferencesQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (generationRef.current !== generation) return;
          try {
            const result = await updatePrefs(nextPreferences, token);
            if (generationRef.current !== generation) return;
            const resolvedPreferences = result.prefs ?? nextPreferences;
            preferencesRef.current = resolvedPreferences;
            setPreferences(resolvedPreferences);
            setStatus("ready");
          } catch (error) {
            if (generationRef.current === generation) {
              applyError(error);
            }
          } finally {
            if (generationRef.current === generation) setIsBusy(false);
          }
        });
      preferencesQueueRef.current = update;
      void update;
    },
    [
      announcementDigestEnabled,
      applyError,
      currentPreferences,
      subscribed,
      token,
    ],
  );

  const sendTestNotification = useCallback(async () => {
    if (!token || !subscribed) return;
    const generation = ++generationRef.current;
    const isCurrent = () => generationRef.current === generation;
    setIsBusy(true);
    setTestSent(false);
    try {
      await sendTest(token);
      if (!isCurrent()) return;
      setTestSent(true);
      setStatus("ready");
    } catch (error) {
      if (isCurrent()) applyError(error);
    } finally {
      if (isCurrent()) setIsBusy(false);
    }
  }, [applyError, subscribed, token]);

  return {
    status,
    subscribed,
    announcementDigestEnabled,
    preferences: preferences ?? defaultPreferences,
    isBusy,
    testSent,
    retry: load,
    subscribe,
    unsubscribe,
    setCourseChanges: (enabled: boolean) =>
      void changePreferences({ courseChanges: enabled }),
    setAnnouncementDigest: (enabled: boolean) => (
      setAnnouncementDigestEnabled(enabled), void changePreferences({}, enabled)
    ),
    sendTest: sendTestNotification,
  };
};

export const usePushAnnouncementPreferences = (
  announcementSources: readonly string[],
  language: Language,
  sourcesLoaded: boolean,
) => {
  const token = usePushAuthToken();
  const [announcementDigestEnabled] = useLocalStorage<boolean>(
    PUSH_ANNOUNCEMENT_DIGEST_KEY,
    true,
  );
  const previousSignature = useRef<string>();
  const syncGenerationRef = useRef(0);
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const sourcesSignature = announcementSources.join("\u0000");
  const signature = `${token ?? ""}\u0000${language}\u0000${sourcesLoaded ? "1" : "0"}\u0000${announcementDigestEnabled ? "1" : "0"}\u0000${sourcesSignature}`;

  useEffect(() => {
    if (previousSignature.current === undefined) {
      previousSignature.current = signature;
      return;
    }
    if (previousSignature.current === signature) return;
    previousSignature.current = signature;
    const generation = ++syncGenerationRef.current;
    if (!sourcesLoaded || !token || !detectPushSupport().supported) return;

    const timer = window.setTimeout(() => {
      const update = syncQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (syncGenerationRef.current !== generation) return;
          const device = await getThisDeviceStatus(token);
          if (
            syncGenerationRef.current !== generation ||
            !device.subscription ||
            !device.subscribed
          ) {
            return;
          }
          await updatePrefs(
            {
              courseChanges: device.prefs?.courseChanges ?? false,
              announcementSources: getAnnouncementSourcesForPush(
                announcementDigestEnabled,
                announcementSources,
              ),
              language,
            },
            token,
          );
        })
        .catch(() => {
          // Follow changes are local-first and must never block the page.
        });
      syncQueueRef.current = update;
      void update;
    }, 500);

    return () => window.clearTimeout(timer);
  }, [
    announcementDigestEnabled,
    announcementSources,
    language,
    signature,
    sourcesLoaded,
    token,
  ]);
};
