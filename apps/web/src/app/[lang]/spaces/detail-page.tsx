import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { Button } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  useCreateBooking,
  useSpaceDetail,
  useSpaceWeek,
  type BusySlot,
  type Space,
} from "./api";

const weekdayIndex = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).getUTCDay();
const taipeiDateKey = (value: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
};
const addDays = (date: string, amount: number) => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
};
export const getTaipeiWeekStart = (shiftWeeks = 0) => {
  const today = taipeiDateKey(new Date());
  const date = new Date(`${today}T00:00:00.000Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset + shiftWeeks * 7);
  return date.toISOString().slice(0, 10);
};
const toIsoInTaipei = (date: string, hourMinute: string) =>
  new Date(`${date}T${hourMinute}:00+08:00`).toISOString();
const getTaipeiMinute = (value: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  return (
    Number(parts.find((part) => part.type === "hour")?.value) * 60 +
    Number(parts.find((part) => part.type === "minute")?.value)
  );
};
const timeLabel = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

const WeekGrid = ({
  space,
  busy,
  weekStart,
  selectedStart,
  onSelect,
  locale,
  labels,
}: {
  space: Space;
  busy: BusySlot[];
  weekStart: string;
  selectedStart: string;
  onSelect: (value: string) => void;
  locale: string;
  labels: { weekdays: string[]; free: string; booked: string; closed: string };
}) => {
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        timeZone: "Asia/Taipei",
        weekday: "short",
        day: "numeric",
        month: "numeric",
      }),
    [locale],
  );

  return (
    <div
      className="grid min-w-0 grid-cols-7 gap-1"
      aria-label={labels.weekdays.join(" ")}
    >
      {days.map((date) => {
        const weekday = weekdayIndex(date);
        const hours = space.openingHours.find(
          (entry) => entry.weekday === weekday,
        );
        const blackout = space.blackouts.some(
          (range) => date >= range.startDate && date <= range.endDate,
        );
        const cells: Array<{
          minute: number;
          status: "free" | "booked" | "closed";
          iso: string;
        }> = [];
        const openStart = hours
          ? Number(hours.opensAt.slice(0, 2)) * 60 +
            Number(hours.opensAt.slice(3))
          : 0;
        const openEnd = hours
          ? Number(hours.closesAt.slice(0, 2)) * 60 +
            Number(hours.closesAt.slice(3))
          : 0;
        for (
          let minute = openStart;
          hours && !blackout && minute + space.slotLengthMinutes <= openEnd;
          minute += space.slotLengthMinutes
        ) {
          const iso = toIsoInTaipei(date, timeLabel(minute));
          const slotEnd = new Date(
            new Date(iso).getTime() + space.slotLengthMinutes * 60_000,
          );
          const startsAt = new Date(iso).getTime();
          const meetsNotice =
            startsAt >= Date.now() + space.minNoticeHours * 3_600_000;
          const isOpen = meetsNotice;
          const booked = busy.some(
            (slot) =>
              new Date(slot.startAt).getTime() < slotEnd.getTime() &&
              new Date(slot.endAt).getTime() > new Date(iso).getTime(),
          );
          cells.push({
            minute,
            status: isOpen ? (booked ? "booked" : "free") : "closed",
            iso,
          });
        }
        const dateLabel = formatter.format(new Date(`${date}T12:00:00+08:00`));
        return (
          <div
            key={date}
            className="flex min-w-0 flex-col gap-1 border-l border-border pl-1"
          >
            <div className="min-h-10 text-xs font-medium">
              <div>{labels.weekdays[weekday]}</div>
              <div className="text-muted-foreground">{dateLabel}</div>
            </div>
            {cells.length === 0 ? (
              <div className="flex min-h-10 items-center border border-border px-1 text-xs text-muted-foreground">
                {labels.closed}
              </div>
            ) : (
              cells.map((cell) =>
                cell.status === "free" ? (
                  <button
                    type="button"
                    key={cell.iso}
                    onClick={() => onSelect(cell.iso)}
                    aria-label={`${labels.free} ${date} ${timeLabel(cell.minute)}`}
                    className={`min-h-10 border px-1 text-xs ${selectedStart === cell.iso ? "border-primary bg-primary/10 text-foreground" : "border-border text-foreground hover:bg-muted"}`}
                  >
                    {timeLabel(cell.minute)}
                  </button>
                ) : (
                  <div
                    key={cell.iso}
                    className={`flex min-h-10 items-center border px-1 text-xs text-muted-foreground ${cell.status === "booked" ? "border-border bg-muted" : "border-transparent"}`}
                    title={
                      cell.status === "booked" ? labels.booked : labels.closed
                    }
                  >
                    {timeLabel(cell.minute)}
                  </div>
                ),
              )
            )}
          </div>
        );
      })}
    </div>
  );
};

const SpaceDetailPage = () => {
  const {
    lang,
    org,
    space: spaceSlug,
  } = useParams<{ lang: string; org: string; space: string }>();
  const dict = useDictionary();
  const auth = useAuth();
  const detail = useSpaceDetail(org, spaceSlug);
  const [weekShift, setWeekShift] = useState(0);
  const weekStart = getTaipeiWeekStart(weekShift);
  const week = useSpaceWeek(org ?? "", spaceSlug ?? "", weekStart);
  const [selectedStart, setSelectedStart] = useState("");
  const [duration, setDuration] = useState(0);
  const [borrowingUnit, setBorrowingUnit] = useState("");
  const [purpose, setPurpose] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const createBooking = useCreateBooking();
  const bookingErrorMessage = (reason: unknown) => {
    const raw = reason instanceof Error ? reason.message : "";
    if (raw.includes("booking_conflict")) return dict.spaces.errorConflict;
    if (raw.includes("booking_rules_failed")) {
      const labels: Record<string, string> = {
        too_soon: dict.spaces.errorTooSoon,
        too_long: dict.spaces.errorTooLong,
        slot_alignment: dict.spaces.errorSlot,
        outside_opening_hours: dict.spaces.errorHours,
        blackout: dict.spaces.errorBlackout,
        active_booking_limit: dict.spaces.errorLimit,
        nthu_only: dict.spaces.errorNthu,
        members_only: dict.spaces.errorMembers,
        allow_list_only: dict.spaces.errorAllowList,
        borrowing_unit_required: dict.spaces.errorBorrowingUnit,
        purpose_required: dict.spaces.errorPurpose,
        headcount_required: dict.spaces.errorHeadcount,
        invalid_headcount: dict.spaces.errorHeadcountInvalid,
      };
      const codes = raw
        .split(":")
        .slice(1)
        .join(":")
        .split(",")
        .map((value) => value.trim());
      const messages = codes.map((code) => labels[code]).filter(Boolean);
      return (
        messages.join(lang === "en" ? ", " : "、") || dict.spaces.bookingFailed
      );
    }
    return dict.spaces.bookingFailed;
  };

  if (detail.isLoading)
    return (
      <p className="px-4 py-4 text-sm text-muted-foreground">
        {dict.spaces.loading}
      </p>
    );
  if (detail.error || !detail.data) {
    return (
      <div className="flex flex-col gap-2 px-4 py-4 text-sm">
        <p className="text-destructive">{dict.spaces.error}</p>
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => void detail.refetch()}
        >
          {dict.spaces.tryAgain}
        </Button>
      </div>
    );
  }
  const { space, organisation } = detail.data;
  const busy = week.data?.busy ?? [];
  const selectedDate = selectedStart
    ? taipeiDateKey(new Date(selectedStart))
    : "";
  const selectedMinute = selectedStart
    ? getTaipeiMinute(new Date(selectedStart))
    : 0;
  const opening = space.openingHours.find(
    (entry) =>
      entry.weekday === (selectedDate ? weekdayIndex(selectedDate) : -1),
  );
  const closeMinute = opening
    ? Number(opening.closesAt.slice(0, 2)) * 60 +
      Number(opening.closesAt.slice(3))
    : 0;
  const busyStart = busy
    .map((slot) => new Date(slot.startAt).getTime())
    .filter((time) => time > new Date(selectedStart).getTime())
    .sort((a, b) => a - b)[0];
  const freeDuration = selectedStart
    ? Math.max(
        0,
        Math.min(
          space.maxLengthMinutes,
          closeMinute - selectedMinute,
          busyStart
            ? (busyStart - new Date(selectedStart).getTime()) / 60_000
            : space.maxLengthMinutes,
        ),
      )
    : 0;
  const durations = Array.from(
    { length: Math.floor(freeDuration / space.slotLengthMinutes) },
    (_, index) => (index + 1) * space.slotLengthMinutes,
  );

  const submit = async () => {
    setError("");
    if (!auth.isAuthenticated) {
      void auth.signinRedirect();
      return;
    }
    if (!selectedStart || duration < space.slotLengthMinutes) return;
    try {
      await createBooking.mutateAsync({
        input: undefined,
        body: {
          spaceId: space.id,
          startAt: selectedStart,
          endAt: new Date(
            new Date(selectedStart).getTime() + duration * 60_000,
          ).toISOString(),
          borrowingUnit: borrowingUnit || undefined,
          purpose: purpose || undefined,
          headcount: headcount ? Number(headcount) : undefined,
          notes: notes || undefined,
        },
      });
      setConfirmed(true);
    } catch (reason) {
      setError(bookingErrorMessage(reason));
    }
  };

  return (
    <div className="flex flex-col px-4">
      <div className="flex flex-row flex-wrap items-baseline gap-2 py-2">
        <Link to={`/${lang}/spaces`} className="text-sm text-muted-foreground">
          {dict.spaces.browse}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{organisation.name}</span>
        <span className="flex-1" />
        <Button asChild variant="outline" size="sm">
          <Link to={`/${lang}/spaces/mine`}>{dict.spaces.myBookings}</Link>
        </Button>
      </div>
      <div className="flex flex-col gap-2 border-b border-border py-4">
        <h1 className="font-bold">{space.name}</h1>
        <p className="text-sm text-muted-foreground">{space.location}</p>
        {space.venueId && (
          <Link
            className="w-fit text-sm text-muted-foreground underline underline-offset-2"
            to={`/${lang}/venues/${encodeURIComponent(space.venueId)}`}
          >
            {dict.spaces.viewVenue}
          </Link>
        )}
        {space.description && (
          <p className="leading-relaxed">{space.description}</p>
        )}
        {space.rules && (
          <p className="text-sm leading-relaxed">{space.rules}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {dict.spaces.whoCanBook}:{" "}
          {space.whoCanBook === "NTHU_ONLY"
            ? dict.spaces.nthuOnly
            : space.whoCanBook === "MEMBERS"
              ? dict.spaces.membersOnly
              : space.whoCanBook === "ALLOW_LIST"
                ? dict.spaces.allowListOnly
                : dict.spaces.anyone}
          {" ・ "}
          {space.approvalMode === "INSTANT"
            ? dict.spaces.instantApproval
            : dict.spaces.approvalRequired}
          {" ・ "}
          {space.slotLengthMinutes} {dict.spaces.slotLength.toLowerCase()}
        </p>
        <p className="text-sm text-muted-foreground">
          {dict.spaces.minNotice}: {space.minNoticeHours}h{" ・ "}
          {dict.spaces.maxLength}: {space.maxLengthMinutes}m{" ・ "}
          {dict.spaces.maxActive}: {space.maxActiveBookingsPerUser}
        </p>
        <p className="text-sm text-muted-foreground">
          {dict.spaces.openingHours}:{" "}
          {space.openingHours.length
            ? space.openingHours
                .map(
                  (hours) =>
                    `${dict.spaces.weekdays[hours.weekday]} ${hours.opensAt}–${hours.closesAt}`,
                )
                .join(" ・ ")
            : dict.spaces.closed}
        </p>
      </div>
      <div className="flex flex-row items-center gap-2 py-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setWeekShift((value) => value - 1);
            setSelectedStart("");
          }}
        >
          {"‹"}
        </Button>
        <span className="flex-1 text-sm font-medium">
          {dict.spaces.weekOf}: {weekStart}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setWeekShift((value) => value + 1);
            setSelectedStart("");
          }}
        >
          {"›"}
        </Button>
      </div>
      {week.error ? (
        <div className="flex flex-row items-center gap-2 py-3 text-sm">
          <span className="text-destructive">{dict.spaces.error}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void week.refetch()}
          >
            {dict.spaces.tryAgain}
          </Button>
        </div>
      ) : week.isLoading ? (
        <p className="py-3 text-sm text-muted-foreground">
          {dict.spaces.loading}
        </p>
      ) : (
        <>
          <div className="flex flex-row flex-wrap gap-3 py-2 text-xs text-muted-foreground">
            <span>{dict.spaces.free}</span>
            <span>{dict.spaces.booked}</span>
            <span>{dict.spaces.closed}</span>
          </div>
          <WeekGrid
            space={space}
            busy={busy}
            weekStart={weekStart}
            selectedStart={selectedStart}
            onSelect={(start) => {
              setSelectedStart(start);
              setDuration(space.slotLengthMinutes);
              setConfirmed(false);
            }}
            locale={lang === "en" ? "en" : lang === "zh-cn" ? "zh-CN" : "zh-TW"}
            labels={{
              weekdays: dict.spaces.weekdays,
              free: dict.spaces.free,
              booked: dict.spaces.booked,
              closed: dict.spaces.closed,
            }}
          />
        </>
      )}
      <div className="mt-4 flex flex-col gap-3 border-t border-border py-4">
        <div className="font-bold">{dict.spaces.requestBooking}</div>
        {confirmed ? (
          <p role="status" className="text-sm font-medium text-primary">
            {space.approvalMode === "INSTANT"
              ? dict.spaces.instantConfirmed
              : dict.spaces.bookingSent}
          </p>
        ) : !auth.isAuthenticated ? (
          <div className="flex flex-row flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {dict.spaces.signInPrompt}
            </span>
            <Button size="sm" onClick={() => void auth.signinRedirect()}>
              {dict.spaces.signIn}
            </Button>
          </div>
        ) : selectedStart ? (
          <>
            <p className="text-sm text-muted-foreground">
              {dict.spaces.selected}:{" "}
              {new Intl.DateTimeFormat(lang === "en" ? "en" : "zh-TW", {
                timeZone: "Asia/Taipei",
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(selectedStart))}
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span>{dict.spaces.duration}</span>
              <select
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="min-h-10 w-full rounded-md border border-border bg-background px-3 text-foreground"
              >
                {durations.map((value) => (
                  <option key={value} value={value}>
                    {value} {dict.spaces.slotLength.toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>
                {dict.spaces.borrowingUnit}
                {space.requireBorrowingUnit ? "" : ` (${dict.spaces.optional})`}
              </span>
              <input
                required={space.requireBorrowingUnit}
                className="min-h-10 rounded-md border border-border bg-background px-3"
                value={borrowingUnit}
                onChange={(event) => setBorrowingUnit(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>
                {dict.spaces.purpose}
                {space.requirePurpose ? "" : ` (${dict.spaces.optional})`}
              </span>
              <input
                required={space.requirePurpose}
                className="min-h-10 rounded-md border border-border bg-background px-3"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>
                {dict.spaces.headcount}
                {space.requireHeadcount ? "" : ` (${dict.spaces.optional})`}
              </span>
              <input
                required={space.requireHeadcount}
                className="min-h-10 rounded-md border border-border bg-background px-3"
                type="number"
                min="1"
                value={headcount}
                onChange={(event) => setHeadcount(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>{dict.spaces.notes}</span>
              <textarea
                className="min-h-20 rounded-md border border-border bg-background px-3 py-2"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              className="w-fit"
              disabled={
                createBooking.isPending || duration < space.slotLengthMinutes
              }
              onClick={() => void submit()}
            >
              {createBooking.isPending
                ? dict.spaces.loading
                : dict.spaces.requestBooking}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {dict.spaces.requestPrompt}
          </p>
        )}
      </div>
      <div className="h-6" />
    </div>
  );
};

export default SpaceDetailPage;
