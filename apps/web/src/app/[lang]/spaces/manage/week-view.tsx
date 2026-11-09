import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@courseweb/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { ConfirmedActionMenuItem } from "../ConfirmedActionMenuItem";
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
              {booking.status === "APPROVED" &&
                new Date(booking.endAt).getTime() <= Date.now() && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        aria-label={`${dict.spaces.moreActions}: ${formatTaipeiTime(booking.startAt, lang ?? "zh")}`}
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <ConfirmedActionMenuItem
                        label={dict.spaces.markNoShow}
                        description={dict.spaces.noShowConfirm}
                        confirmLabel={dict.spaces.markNoShow}
                        cancelLabel={dict.spaces.cancel}
                        disabled={markNoShow.isPending}
                        onConfirm={async () => {
                          try {
                            await markNoShow.mutateAsync({ input: booking.id });
                          } catch (error) {
                            setError(getSpaceErrorMessage(error, dict.spaces));
                          }
                        }}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
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
