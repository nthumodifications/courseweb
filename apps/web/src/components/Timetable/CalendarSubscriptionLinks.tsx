import { Calendar, Copy } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Checkbox,
  toast,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import authClient from "@/config/auth";
import { useAuth } from "react-oidc-context";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  buildCalendarSubscriptionLinks,
  CALENDAR_FEED_INCLUDE_STORAGE_KEY,
  CALENDAR_FEED_INCLUDES,
  DEFAULT_CALENDAR_FEED_INCLUDES,
  parseCalendarFeedIncludeSelection,
  type CalendarFeedInclude,
  type CalendarFeedIncludeSelection,
  type CalendarSubscriptionLinks as CalendarSubscriptionLinkUrls,
  toWebcalCalendarFeedUrl,
} from "@/lib/calendar-subscription";

export type CalendarSubscriptionLinkLabels = {
  google: string;
  apple: string;
  outlook: string;
  copy_link: string;
  copied: string;
  copied_description: string;
  calendar_name: string;
  subscription_hint: string;
  signed_out_hint?: string;
  reset_link?: string;
  resetting_link?: string;
  reset_hint?: string;
  reset_error?: string;
  live_feed_error?: string;
  live_feed_loading?: string;
  retry_live_feed?: string;
  reset_confirm_title?: string;
  reset_confirm_description?: string;
  reset_confirm_cancel?: string;
  reset_confirm_action?: string;
  include?: string;
  classes?: string;
  events?: string;
  academic?: string;
};

type CalendarFeedClient = {
  feed: {
    $get: (
      input: Record<string, never>,
      options: { headers: { Authorization: string }; signal?: AbortSignal },
    ) => Promise<Response>;
    rotate: {
      $post: (
        input: Record<string, never>,
        options: { headers: { Authorization: string }; signal?: AbortSignal },
      ) => Promise<Response>;
    };
  };
};

const requestCalendarFeed = (
  request:
    | CalendarFeedClient["feed"]["$get"]
    | CalendarFeedClient["feed"]["rotate"]["$post"],
  accessToken: string,
  signal?: AbortSignal,
) =>
  request(
    {},
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      ...(signal ? { signal } : {}),
    },
  );

const useLiveCalendarFeed = ({
  accessToken,
  isAuthenticated,
  calendarFeedClient,
  resetError,
}: {
  accessToken?: string;
  isAuthenticated: boolean;
  calendarFeedClient: CalendarFeedClient;
  resetError?: string;
}) => {
  const [liveFeedUrl, setLiveFeedUrl] = useState<string | null>(null);
  const [liveFeedError, setLiveFeedError] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const resetInFlight = useRef(false);
  const sessionGeneration = useRef(0);
  const previousSession = useRef<{
    isAuthenticated: boolean;
    accessToken?: string;
  }>({ isAuthenticated, accessToken });

  if (
    previousSession.current.isAuthenticated !== isAuthenticated ||
    previousSession.current.accessToken !== accessToken
  ) {
    previousSession.current = { isAuthenticated, accessToken };
    sessionGeneration.current += 1;
  }

  useEffect(() => {
    const generation = sessionGeneration.current;
    let active = true;
    const isCurrent = () => active && generation === sessionGeneration.current;
    setLiveFeedUrl(null);
    setLiveFeedError(false);
    setIsResetting(false);
    setIsResetConfirmOpen(false);
    if (!isAuthenticated || !accessToken) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);

    void requestCalendarFeed(
      calendarFeedClient.feed.$get,
      accessToken,
      controller.signal,
    )
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Feed request failed: ${response.status}`);
        const payload = (await response.json()) as { webcalUrl?: unknown };
        if (!isCurrent()) return;
        if (typeof payload.webcalUrl !== "string")
          throw new Error("Missing feed URL");
        setLiveFeedUrl(toWebcalCalendarFeedUrl(payload.webcalUrl));
      })
      .catch((error: unknown) => {
        if (!isCurrent()) return;
        console.error(error);
        setLiveFeedError(true);
      });

    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [accessToken, calendarFeedClient, isAuthenticated, retryNonce]);

  const handleReset = async () => {
    if (!accessToken || resetInFlight.current) return;
    resetInFlight.current = true;
    const generation = sessionGeneration.current;
    setIsResetting(true);
    try {
      const response = await requestCalendarFeed(
        calendarFeedClient.feed.rotate.$post,
        accessToken,
      );
      if (!response.ok)
        throw new Error(`Feed rotation failed: ${response.status}`);
      const payload = (await response.json()) as { webcalUrl?: unknown };
      if (typeof payload.webcalUrl !== "string")
        throw new Error("Missing feed URL");
      if (generation !== sessionGeneration.current) return;
      setLiveFeedUrl(toWebcalCalendarFeedUrl(payload.webcalUrl));
      setIsResetConfirmOpen(false);
    } catch (error) {
      if (generation !== sessionGeneration.current) return;
      console.error(error);
      toast({ title: resetError });
    } finally {
      resetInFlight.current = false;
      if (generation === sessionGeneration.current) setIsResetting(false);
    }
  };

  const retry = () => {
    setLiveFeedError(false);
    setRetryNonce((nonce) => nonce + 1);
  };

  return {
    liveFeedUrl,
    liveFeedError,
    isResetting,
    isResetConfirmOpen,
    setIsResetConfirmOpen,
    handleReset,
    retry,
  };
};

const subscriptionHint = ({
  labels,
  isAuthenticated,
  accessToken,
  liveFeedUrl,
  liveFeedError,
}: {
  labels: CalendarSubscriptionLinkLabels;
  isAuthenticated: boolean;
  accessToken?: string;
  liveFeedUrl: string | null;
  liveFeedError: boolean;
}) => {
  if (liveFeedError) return labels.live_feed_error ?? labels.subscription_hint;
  if (isAuthenticated && accessToken) {
    return liveFeedUrl
      ? labels.subscription_hint
      : (labels.live_feed_loading ?? labels.subscription_hint);
  }
  return labels.signed_out_hint ?? labels.subscription_hint;
};

export const CalendarSubscriptionLinkList = ({
  links,
  labels,
  onCopy,
  onReset,
  onRetry,
  isResetting = false,
  subscriptionDisabled = false,
  includeSelection,
  onIncludeChange,
}: {
  links: CalendarSubscriptionLinkUrls;
  labels: CalendarSubscriptionLinkLabels;
  onCopy: () => void;
  onReset?: () => void;
  onRetry?: () => void;
  isResetting?: boolean;
  subscriptionDisabled?: boolean;
  includeSelection?: CalendarFeedIncludeSelection;
  onIncludeChange?: (include: CalendarFeedInclude, checked: boolean) => void;
}) => (
  <>
    {includeSelection && onIncludeChange && labels.include && (
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{labels.include}</legend>
        <div className="flex flex-col gap-2">
          {CALENDAR_FEED_INCLUDES.map((include) => {
            const label = labels[include];
            if (!label) return null;
            return (
              <label
                key={include}
                className="flex items-center space-x-2 py-1 text-sm"
              >
                <Checkbox
                  checked={includeSelection[include]}
                  onCheckedChange={(checked) =>
                    onIncludeChange(include, checked === true)
                  }
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    )}
    {[
      [links.google, labels.google],
      [links.apple, labels.apple],
      [links.outlook, labels.outlook],
    ].map(([href, label]) =>
      subscriptionDisabled ? (
        <Button
          key={href}
          variant="outline"
          className="w-full justify-start"
          disabled
        >
          <Calendar className="w-4 h-4 mr-2" />
          {label}
        </Button>
      ) : (
        <Button
          key={href}
          variant="outline"
          className="w-full justify-start"
          asChild
        >
          <a href={href} target="_blank" rel="noreferrer">
            <Calendar className="w-4 h-4 mr-2" />
            {label}
          </a>
        </Button>
      ),
    )}
    <Button
      variant="outline"
      className="w-full justify-start"
      onClick={onCopy}
      disabled={subscriptionDisabled}
    >
      <Copy className="w-4 h-4 mr-2" />
      {labels.copy_link}
    </Button>
    <p className="text-xs text-muted-foreground">{labels.subscription_hint}</p>
    {onRetry && labels.retry_live_feed && (
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-start"
        onClick={onRetry}
      >
        {labels.retry_live_feed}
      </Button>
    )}
    {onReset && labels.reset_link && (
      <>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start"
          onClick={onReset}
          disabled={isResetting}
        >
          {isResetting ? labels.resetting_link : labels.reset_link}
        </Button>
        {labels.reset_hint && (
          <p className="text-xs text-muted-foreground">{labels.reset_hint}</p>
        )}
      </>
    )}
  </>
);

const CalendarSubscriptionLinks = ({ feedUrl }: { feedUrl: string }) => {
  const dict = useDictionary();
  const labels = dict.dialogs.ShareSyncTimetableDialog.links;
  const { isAuthenticated, user } = useAuth();
  const accessToken = user?.access_token;
  // The generated secure-api client types lack these new routes until the api-types dist is rebuilt, so use this narrow adapter.
  const calendarFeedClient = useMemo(
    () =>
      Reflect.get(
        Reflect.get(authClient as object, "api"),
        "calendar",
      ) as CalendarFeedClient,
    [],
  );
  const {
    liveFeedUrl,
    liveFeedError,
    isResetting,
    isResetConfirmOpen,
    setIsResetConfirmOpen,
    handleReset,
    retry,
  } = useLiveCalendarFeed({
    accessToken,
    isAuthenticated,
    calendarFeedClient,
    resetError: labels.reset_error,
  });
  const [includeSelection, setIncludeSelection] =
    useLocalStorage<CalendarFeedIncludeSelection>(
      CALENDAR_FEED_INCLUDE_STORAGE_KEY,
      DEFAULT_CALENDAR_FEED_INCLUDES,
      { deserializer: parseCalendarFeedIncludeSelection },
    );
  const activeFeedUrl = liveFeedUrl ?? feedUrl;
  const isLiveState = Boolean(isAuthenticated && accessToken && liveFeedUrl);
  const links = buildCalendarSubscriptionLinks(
    activeFeedUrl,
    labels.calendar_name,
    isLiveState ? includeSelection : undefined,
  );
  const displayLabels = {
    ...labels,
    subscription_hint: subscriptionHint({
      labels,
      isAuthenticated,
      accessToken,
      liveFeedUrl,
      liveFeedError,
    }),
  };

  const isLiveLoading = Boolean(
    isAuthenticated && accessToken && !liveFeedUrl && !liveFeedError,
  );
  const hasIncludedContent = CALENDAR_FEED_INCLUDES.some(
    (include) => includeSelection[include],
  );

  const handleCopy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(links.copy).then(() => {
      toast({
        title: labels.copied,
        description: labels.copied_description,
      });
    });
  };

  return (
    <>
      <CalendarSubscriptionLinkList
        links={links}
        labels={displayLabels}
        onCopy={handleCopy}
        includeSelection={isLiveState ? includeSelection : undefined}
        onIncludeChange={
          isLiveState
            ? (include, checked) =>
                setIncludeSelection((current) => ({
                  ...current,
                  [include]: checked,
                }))
            : undefined
        }
        onRetry={liveFeedError ? retry : undefined}
        onReset={liveFeedUrl ? () => setIsResetConfirmOpen(true) : undefined}
        isResetting={isResetting}
        subscriptionDisabled={
          isLiveLoading || (isLiveState && !hasIncludedContent)
        }
      />
      {isResetConfirmOpen && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open && !isResetting) setIsResetConfirmOpen(false);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{labels.reset_confirm_title}</AlertDialogTitle>
              <AlertDialogDescription>
                {labels.reset_confirm_description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isResetting}>
                {labels.reset_confirm_cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isResetting}
                onClick={(event) => {
                  event.preventDefault();
                  void handleReset();
                }}
              >
                {isResetting
                  ? (labels.resetting_link ?? labels.reset_confirm_action)
                  : (labels.reset_confirm_action ?? labels.reset_link)}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default CalendarSubscriptionLinks;
