import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { Button } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  getSpaceErrorMessage,
  useCancelBooking,
  useMyBookings,
  type Booking,
} from "./api";

const formatTime = (value: string, lang: string) =>
  new Intl.DateTimeFormat(
    lang === "en" ? "en" : lang === "zh-cn" ? "zh-CN" : "zh-TW",
    { timeZone: "Asia/Taipei", dateStyle: "medium", timeStyle: "short" },
  ).format(new Date(value));

const MyBookingsPage = () => {
  const dict = useDictionary();
  const auth = useAuth();
  const { lang } = useParams<{ lang: string }>();
  const query = useMyBookings();
  const cancel = useCancelBooking();
  const [error, setError] = useState("");

  if (!auth.isAuthenticated) {
    return (
      <div className="flex flex-col items-start gap-3 px-4 py-4">
        <h1 className="font-bold">{dict.spaces.myBookings}</h1>
        <p className="text-sm text-muted-foreground">
          {dict.spaces.signInPrompt}
        </p>
        <Button size="sm" onClick={() => void auth.signinRedirect()}>
          {dict.spaces.signIn}
        </Button>
      </div>
    );
  }
  if (query.isLoading)
    return (
      <p className="px-4 py-4 text-sm text-muted-foreground">
        {dict.spaces.loading}
      </p>
    );
  if (query.error)
    return (
      <div className="flex flex-col gap-2 px-4 py-4 text-sm">
        <p className="text-destructive">{dict.spaces.error}</p>
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => void query.refetch()}
        >
          {dict.spaces.tryAgain}
        </Button>
      </div>
    );

  const now = Date.now();
  const bookings = query.data?.bookings ?? [];
  const upcoming = bookings.filter(
    (booking) => new Date(booking.endAt).getTime() >= now,
  );
  const past = bookings.filter(
    (booking) => new Date(booking.endAt).getTime() < now,
  );
  const statusLabel: Record<Booking["status"], string> = {
    REQUESTED: dict.spaces.requested,
    APPROVED: dict.spaces.approved,
    REJECTED: dict.spaces.rejectedStatus,
    CANCELLED: dict.spaces.cancelled,
    NO_SHOW: dict.spaces.noShow,
  };

  const renderBooking = (booking: Booking) => {
    const canCancel =
      ["REQUESTED", "APPROVED"].includes(booking.status) &&
      new Date(booking.startAt).getTime() > now;
    return (
      <div key={booking.id} className="flex flex-row items-center gap-3 py-4">
        <div className="min-w-0 flex-1">
          {booking.space ? (
            <Link
              className="font-medium hover:text-primary"
              to={`/${lang}/spaces/${booking.space.organisation?.slug}/${booking.space.slug}`}
            >
              {booking.space.name}
            </Link>
          ) : (
            <span className="font-medium">{dict.spaces.title}</span>
          )}
          <div className="text-sm text-muted-foreground">
            {formatTime(booking.startAt, lang ?? "zh")} –{" "}
            {formatTime(booking.endAt, lang ?? "zh")}
          </div>
          {booking.space?.organisation?.name && (
            <div className="text-sm text-muted-foreground">
              {booking.space.organisation.name}
            </div>
          )}
        </div>
        <span className="whitespace-nowrap text-right text-sm font-medium">
          {statusLabel[booking.status]}
        </span>
        {canCancel && (
          <details className="relative shrink-0">
            <summary
              className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-md border border-border text-foreground"
              aria-label={dict.spaces.cancelBooking}
            >
              ⋯
            </summary>
            <div className="absolute right-0 top-full z-10 flex min-w-36 flex-col border border-border bg-background p-1">
              <button
                type="button"
                className="min-h-10 px-3 text-left text-sm text-destructive hover:bg-muted"
                onClick={async () => {
                  if (!window.confirm(dict.spaces.cancelConfirm)) return;
                  setError("");
                  try {
                    await cancel.mutateAsync({ input: booking.id });
                  } catch (error) {
                    setError(getSpaceErrorMessage(error, dict.spaces));
                  }
                }}
              >
                {dict.spaces.cancelBooking}
              </button>
            </div>
          </details>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col px-4">
      <div className="flex flex-row flex-wrap items-center gap-2 py-2">
        <h1 className="flex-1 font-bold">{dict.spaces.myBookings}</h1>
        <Button asChild variant="outline" size="sm">
          <Link to={`/${lang}/spaces`}>{dict.spaces.browse}</Link>
        </Button>
      </div>
      {error && (
        <p role="alert" className="py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {bookings.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          {dict.spaces.emptyBookings}
        </p>
      ) : (
        <>
          <h2 className="border-b border-border py-3 font-medium">
            {dict.spaces.upcoming}
          </h2>
          {upcoming.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              {dict.spaces.emptyBookings}
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {upcoming.map(renderBooking)}
            </div>
          )}
          <h2 className="border-b border-border py-3 font-medium">
            {dict.spaces.past}
          </h2>
          {past.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              {dict.spaces.emptyBookings}
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {past.map(renderBooking)}
            </div>
          )}
        </>
      )}
      <div className="h-6" />
    </div>
  );
};

export default MyBookingsPage;
