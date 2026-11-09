import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Input } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  getSpaceErrorMessage,
  useBulkDecideBookings,
  useDecideBooking,
  useOrganisationRequests,
  type Booking,
} from "../api";
import { formatTaipeiTime } from "./shared";

export const RequestsQueue = ({
  organisationId,
}: {
  organisationId: string;
}) => {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  const query = useOrganisationRequests(organisationId);
  const decide = useDecideBooking();
  const bulk = useBulkDecideBookings();
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const bookings = query.data?.bookings ?? [];
  const setAll = (checked: boolean) =>
    setSelected(checked ? bookings.map((item) => item.id) : []);
  const updateBooking = async (
    booking: Booking,
    action: "APPROVE" | "REJECT",
  ) => {
    if (action === "REJECT" && !reason.trim()) {
      setError(dict.spaces.errorReasonRequired);
      return;
    }
    setError("");
    try {
      await decide.mutateAsync({ input: booking.id, body: { action, reason } });
    } catch (error) {
      setError(getSpaceErrorMessage(error, dict.spaces));
    }
  };
  const updateSelected = async (action: "APPROVE" | "REJECT") => {
    if (action === "REJECT" && !reason.trim()) {
      setError(dict.spaces.errorReasonRequired);
      return;
    }
    setError("");
    try {
      await bulk.mutateAsync({
        input: undefined,
        body: { bookingIds: selected, action, reason },
      });
      setSelected([]);
    } catch (error) {
      setError(getSpaceErrorMessage(error, dict.spaces));
    }
  };
  if (query.error)
    return (
      <div className="py-2 text-sm text-destructive">
        {dict.spaces.error}{" "}
        <Button
          size="sm"
          variant="outline"
          onClick={() => void query.refetch()}
        >
          {dict.spaces.tryAgain}
        </Button>
      </div>
    );
  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex flex-row flex-wrap items-center gap-2">
        <h3 className="flex-1 font-medium">{dict.spaces.requests}</h3>
        {bookings.length > 0 && (
          <label className="flex min-h-10 flex-row items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.length === bookings.length}
              onChange={(event) => setAll(event.target.checked)}
            />
            {dict.spaces.selectAll}
          </label>
        )}
      </div>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">{dict.spaces.loading}</p>
      ) : bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {dict.spaces.emptyRequests}
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span>{dict.spaces.decisionReason}</span>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
            />
          </label>
          {selected.length > 0 && (
            <div className="flex flex-row flex-wrap items-center gap-2">
              <span className="flex-1 text-sm text-muted-foreground">
                {dict.spaces.selectedCount.replace(
                  "{count}",
                  String(selected.length),
                )}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={bulk.isPending}
                onClick={() => void updateSelected("APPROVE")}
              >
                {dict.spaces.approve}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulk.isPending}
                onClick={() => void updateSelected("REJECT")}
              >
                {dict.spaces.reject}
              </Button>
            </div>
          )}
          <div className="flex flex-col divide-y divide-border">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-row items-center gap-2 py-3"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(booking.id)}
                  aria-label={booking.user?.name ?? booking.id}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, booking.id]
                        : current.filter((id) => id !== booking.id),
                    )
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {booking.space?.name} ・ {booking.user?.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {booking.user?.userId} ・{" "}
                    {formatTaipeiTime(booking.startAt, lang ?? "zh")} –{" "}
                    {formatTaipeiTime(booking.endAt, lang ?? "zh", false)}
                  </div>
                  {booking.purpose && (
                    <div className="text-sm text-muted-foreground">
                      {booking.purpose}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() => void updateBooking(booking, "APPROVE")}
                  >
                    {dict.spaces.approve}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() => void updateBooking(booking, "REJECT")}
                  >
                    {dict.spaces.reject}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
