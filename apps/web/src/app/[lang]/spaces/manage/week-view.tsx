import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  getSpaceErrorMessage,
  useManageSpaceWeek,
  useMarkBookingNoShow,
  type Organisation,
  type Space,
} from "../api";
import { getTaipeiWeekStart } from "../detail-page";
import { formatTaipeiTime } from "./shared";

export const WeekView = ({
  organisation,
  spaces,
}: {
  organisation: Organisation;
  spaces: Space[];
}) => {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  const markNoShow = useMarkBookingNoShow();
  const [error, setError] = useState("");
  const [spaceId, setSpaceId] = useState(spaces[0]?.id ?? "");
  const [weekStart, setWeekStart] = useState(getTaipeiWeekStart());
  const selectedSpace = spaces.find((space) => space.id === spaceId);
  const query = useManageSpaceWeek(organisation.id, spaceId, weekStart);
  useEffect(() => {
    if (!spaceId && spaces[0]) setSpaceId(spaces[0].id);
  }, [spaceId, spaces]);
  return (
    <div className="flex flex-col gap-2 py-3">
      <h3 className="font-medium">{dict.spaces.weekView}</h3>
      <div className="flex flex-row flex-wrap gap-2">
        <select
          className="min-h-10 min-w-40 flex-1 rounded-md border border-border bg-background px-3"
          aria-label={dict.spaces.selectSpace}
          value={spaceId}
          onChange={(event) => setSpaceId(event.target.value)}
        >
          {spaces.map((space) => (
            <option key={space.id} value={space.id}>
              {space.name}
            </option>
          ))}
        </select>
        <input
          aria-label={dict.spaces.weekOf}
          className="min-h-10 rounded-md border border-border bg-background px-3"
          type="date"
          value={weekStart}
          onChange={(event) => setWeekStart(event.target.value)}
        />
      </div>
      {!selectedSpace ? (
        <p className="text-sm text-muted-foreground">
          {dict.spaces.emptySpaces}
        </p>
      ) : query.error ? (
        <p className="text-sm text-destructive">
          {dict.spaces.error}{" "}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            {dict.spaces.tryAgain}
          </Button>
        </p>
      ) : query.isLoading ? (
        <p className="text-sm text-muted-foreground">{dict.spaces.loading}</p>
      ) : (query.data?.bookings.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">
          {dict.spaces.emptyBookings}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {query.data!.bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex flex-row items-center gap-3 py-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium">
                  {formatTaipeiTime(booking.startAt, lang ?? "zh")}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  – {formatTaipeiTime(booking.endAt, lang ?? "zh", false)}
                </span>
                <div className="text-muted-foreground">
                  {booking.user?.name} ・ {booking.user?.userId}
                </div>
              </div>
              <span className="whitespace-nowrap text-right">
                {booking.status === "REQUESTED"
                  ? dict.spaces.requested
                  : dict.spaces.approved}
              </span>
              {booking.status === "APPROVED" && (
                <details className="relative shrink-0">
                  <summary
                    className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-md border border-border"
                    aria-label={dict.spaces.markNoShow}
                  >
                    ⋯
                  </summary>
                  <button
                    type="button"
                    disabled={
                      new Date(booking.endAt).getTime() > Date.now() ||
                      markNoShow.isPending
                    }
                    className="absolute right-0 top-full z-10 min-h-10 whitespace-nowrap border border-border bg-background px-3 text-sm text-destructive disabled:opacity-50"
                    onClick={async () => {
                      try {
                        await markNoShow.mutateAsync({ input: booking.id });
                      } catch (error) {
                        setError(getSpaceErrorMessage(error, dict.spaces));
                      }
                    }}
                  >
                    {dict.spaces.markNoShow}
                  </button>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
