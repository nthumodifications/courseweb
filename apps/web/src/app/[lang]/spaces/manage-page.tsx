import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { Button, Input } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  downloadBookingsCsv,
  useAddOrganisationMember,
  useArchiveSpace,
  useBulkDecideBookings,
  useCreateOrganisation,
  useCreateSpace,
  useDecideBooking,
  useManageOrganisations,
  useManageSpaceWeek,
  useMarkBookingNoShow,
  useOrganisationRequests,
  useRemoveOrganisationMember,
  useUpdateOrganisation,
  useUpdateSpace,
  type Booking,
  type Organisation,
  type Space,
  type SpaceOpeningHour,
} from "./api";
import { getTaipeiWeekStart } from "./detail-page";

const formatTaipeiTime = (value: string, lang: string, withDate = true) =>
  new Intl.DateTimeFormat(
    lang === "en" ? "en" : lang === "zh-cn" ? "zh-CN" : "zh-TW",
    {
      timeZone: "Asia/Taipei",
      ...(withDate ? { dateStyle: "medium" as const } : {}),
      timeStyle: "short",
    },
  ).format(new Date(value));
const weekdays = (dict: ReturnType<typeof useDictionary>) =>
  dict.spaces.weekdays as string[];
const statusText = (
  status: Organisation["status"],
  dict: ReturnType<typeof useDictionary>,
) =>
  ({
    PENDING: dict.spaces.pending,
    VERIFIED: dict.spaces.verified,
    REJECTED: dict.spaces.rejectedStatus,
    SUSPENDED: dict.spaces.suspended,
  })[status];

const SignInPrompt = () => {
  const dict = useDictionary();
  const auth = useAuth();
  return (
    <div className="flex flex-col items-start gap-3 px-4 py-4">
      <h1 className="font-bold">{dict.spaces.manage}</h1>
      <p className="text-sm text-muted-foreground">
        {dict.spaces.signInPrompt}
      </p>
      <Button size="sm" onClick={() => void auth.signinRedirect()}>
        {dict.spaces.signIn}
      </Button>
    </div>
  );
};

const CreateOrganisation = () => {
  const dict = useDictionary();
  const create = useCreateOrganisation();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [webhook, setWebhook] = useState("");
  const [error, setError] = useState("");
  const submit = async () => {
    setError("");
    try {
      await create.mutateAsync({
        input: undefined,
        body: {
          name,
          slug,
          description,
          contact,
          discordWebhookUrl: webhook || null,
        },
      });
      setName("");
      setSlug("");
      setDescription("");
      setContact("");
      setWebhook("");
    } catch {
      setError(dict.spaces.saveFailed);
    }
  };
  return (
    <details className="border-b border-border py-3" open>
      <summary className="cursor-pointer font-medium">
        {dict.spaces.createOrganisation}
      </summary>
      <div className="flex flex-col gap-3 py-3">
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.organisationName}</span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.organisationSlug}</span>
          <Input
            value={slug}
            onChange={(event) =>
              setSlug(
                event.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]+/gu, "-")
                  .replace(/^-|-$/gu, ""),
              )
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.description}</span>
          <textarea
            className="min-h-20 rounded-md border border-border bg-background px-3 py-2"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.contact}</span>
          <Input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.discordWebhook}</span>
          <Input
            type="url"
            value={webhook}
            onChange={(event) => setWebhook(event.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          className="w-fit"
          size="sm"
          disabled={
            create.isPending || !name.trim() || !slug.trim() || !contact.trim()
          }
          onClick={() => void submit()}
        >
          {dict.spaces.create}
        </Button>
      </div>
    </details>
  );
};

const SpaceCreateForm = ({ organisationId }: { organisationId: string }) => {
  const dict = useDictionary();
  const create = useCreateSpace();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [location, setLocation] = useState("");
  const [whoCanBook, setWhoCanBook] =
    useState<Space["whoCanBook"]>("ANYONE_SIGNED_IN");
  const [approvalMode, setApprovalMode] =
    useState<Space["approvalMode"]>("APPROVAL");
  const [slotLengthMinutes, setSlotLengthMinutes] = useState(60);
  const [minNoticeHours, setMinNoticeHours] = useState(0);
  const [maxLengthMinutes, setMaxLengthMinutes] = useState(240);
  const [maxActiveBookingsPerUser, setMaxActiveBookingsPerUser] = useState(3);
  const [requireBorrowingUnit, setRequireBorrowingUnit] = useState(false);
  const [requirePurpose, setRequirePurpose] = useState(true);
  const [requireHeadcount, setRequireHeadcount] = useState(false);
  const [error, setError] = useState("");
  const openingHours: SpaceOpeningHour[] = [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    opensAt: "09:00",
    closesAt: "17:00",
  }));
  const submit = async () => {
    setError("");
    try {
      await create.mutateAsync({
        input: organisationId,
        body: {
          name,
          slug,
          description: "",
          location,
          isPublic: true,
          venueId: null,
          rules: "",
          whoCanBook,
          approvalMode,
          slotLengthMinutes,
          minNoticeHours,
          maxLengthMinutes,
          maxActiveBookingsPerUser,
          requireBorrowingUnit,
          requirePurpose,
          requireHeadcount,
          openingHours,
          blackouts: [],
          allowList: [],
        },
      });
      setName("");
      setSlug("");
      setLocation("");
    } catch {
      setError(dict.spaces.saveFailed);
    }
  };
  return (
    <details className="py-2">
      <summary className="min-h-10 cursor-pointer py-2 text-sm font-medium">
        {dict.spaces.addSpace}
      </summary>
      <div className="flex flex-col gap-3 py-2">
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.name}</span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.slug}</span>
          <Input
            value={slug}
            onChange={(event) =>
              setSlug(
                event.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]+/gu, "-")
                  .replace(/^-|-$/gu, ""),
              )
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.location}</span>
          <Input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </label>
        <RuleSelect
          label={dict.spaces.whoCanBook}
          value={whoCanBook}
          onChange={(value) => setWhoCanBook(value as Space["whoCanBook"])}
          options={[
            ["ANYONE_SIGNED_IN", dict.spaces.anyone],
            ["NTHU_ONLY", dict.spaces.nthuOnly],
            ["MEMBERS", dict.spaces.membersOnly],
            ["ALLOW_LIST", dict.spaces.allowListOnly],
          ]}
        />
        <RuleSelect
          label={dict.spaces.approvalMode}
          value={approvalMode}
          onChange={(value) => setApprovalMode(value as Space["approvalMode"])}
          options={[
            ["APPROVAL", dict.spaces.approvalRequired],
            ["INSTANT", dict.spaces.instantApproval],
          ]}
        />
        <NumberField
          label={dict.spaces.slotLength}
          value={slotLengthMinutes}
          onChange={setSlotLengthMinutes}
          min={5}
          step={5}
        />
        <NumberField
          label={dict.spaces.minNotice}
          value={minNoticeHours}
          onChange={setMinNoticeHours}
          min={0}
        />
        <NumberField
          label={dict.spaces.maxLength}
          value={maxLengthMinutes}
          onChange={setMaxLengthMinutes}
          min={5}
          step={5}
        />
        <NumberField
          label={dict.spaces.maxActive}
          value={maxActiveBookingsPerUser}
          onChange={setMaxActiveBookingsPerUser}
          min={1}
        />
        <CheckField
          label={dict.spaces.requireBorrowingUnit}
          checked={requireBorrowingUnit}
          onChange={setRequireBorrowingUnit}
        />
        <CheckField
          label={dict.spaces.requirePurpose}
          checked={requirePurpose}
          onChange={setRequirePurpose}
        />
        <CheckField
          label={dict.spaces.requireHeadcount}
          checked={requireHeadcount}
          onChange={setRequireHeadcount}
        />
        <p className="text-sm font-medium">
          {dict.spaces.openingHours}:{" "}
          {dict.spaces.weekdays.slice(1, 6).join(" ・ ")} 09:00–17:00
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          size="sm"
          className="w-fit"
          disabled={
            create.isPending || !name.trim() || !slug.trim() || !location.trim()
          }
          onClick={() => void submit()}
        >
          {dict.spaces.create}
        </Button>
      </div>
    </details>
  );
};

const RuleSelect = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) => (
  <label className="flex flex-col gap-1 text-sm">
    <span>{label}</span>
    <select
      className="min-h-10 rounded-md border border-border bg-background px-3"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
    </select>
  </label>
);
const NumberField = ({
  label,
  value,
  onChange,
  min,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  step?: number;
}) => (
  <label className="flex flex-col gap-1 text-sm">
    <span>{label}</span>
    <Input
      type="number"
      min={min}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </label>
);
const CheckField = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => (
  <label className="flex min-h-10 flex-row items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
    {label}
  </label>
);

const SpaceRulesEditor = ({ space }: { space: Space }) => {
  const dict = useDictionary();
  const update = useUpdateSpace();
  const [name, setName] = useState(space.name);
  const [slug, setSlug] = useState(space.slug);
  const [description, setDescription] = useState(space.description);
  const [location, setLocation] = useState(space.location);
  const [venueId, setVenueId] = useState(space.venueId ?? "");
  const [isPublic, setIsPublic] = useState(space.isPublic);
  const [rules, setRules] = useState(space.rules);
  const [whoCanBook, setWhoCanBook] = useState(space.whoCanBook);
  const [approvalMode, setApprovalMode] = useState(space.approvalMode);
  const [slotLengthMinutes, setSlotLengthMinutes] = useState(
    space.slotLengthMinutes,
  );
  const [minNoticeHours, setMinNoticeHours] = useState(space.minNoticeHours);
  const [maxLengthMinutes, setMaxLengthMinutes] = useState(
    space.maxLengthMinutes,
  );
  const [maxActiveBookingsPerUser, setMaxActiveBookingsPerUser] = useState(
    space.maxActiveBookingsPerUser,
  );
  const [requireBorrowingUnit, setRequireBorrowingUnit] = useState(
    space.requireBorrowingUnit,
  );
  const [requirePurpose, setRequirePurpose] = useState(space.requirePurpose);
  const [requireHeadcount, setRequireHeadcount] = useState(
    space.requireHeadcount,
  );
  const [openingHours, setOpeningHours] = useState(space.openingHours);
  const [blackoutText, setBlackoutText] = useState(
    space.blackouts
      .map((item) => `${item.startDate},${item.endDate},${item.reason ?? ""}`)
      .join("\n"),
  );
  const [allowText, setAllowText] = useState(
    space.allowListUserIds?.join("\n") ?? "",
  );
  const [error, setError] = useState("");
  const weekDays = weekdays(dict);

  const toggleWeekday = (weekday: number, enabled: boolean) =>
    setOpeningHours((current) => {
      if (!enabled) return current.filter((row) => row.weekday !== weekday);
      return [
        ...current,
        { weekday, opensAt: "09:00", closesAt: "17:00" },
      ].sort((a, b) => a.weekday - b.weekday);
    });
  const setHour = (
    weekday: number,
    key: "opensAt" | "closesAt",
    value: string,
  ) =>
    setOpeningHours((current) =>
      current.map((row) =>
        row.weekday === weekday ? { ...row, [key]: value } : row,
      ),
    );
  const submit = async () => {
    setError("");
    const blackouts = blackoutText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [startDate, endDate, reason] = line
          .split(",")
          .map((value) => value.trim());
        return { startDate, endDate, reason: reason || undefined };
      });
    try {
      await update.mutateAsync({
        input: space.id,
        body: {
          name,
          slug,
          description,
          location,
          venueId: venueId || null,
          isPublic,
          rules,
          whoCanBook,
          approvalMode,
          slotLengthMinutes,
          minNoticeHours,
          maxLengthMinutes,
          maxActiveBookingsPerUser,
          requireBorrowingUnit,
          requirePurpose,
          requireHeadcount,
          openingHours,
          blackouts,
          allowList: allowText
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
        },
      });
    } catch {
      setError(dict.spaces.saveFailed);
    }
  };

  return (
    <details className="border-t border-border py-2">
      <summary className="min-h-10 cursor-pointer py-2 text-sm font-medium">
        {dict.spaces.rules}
      </summary>
      <div className="flex flex-col gap-3 py-2">
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.name}</span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.slug}</span>
          <Input
            value={slug}
            onChange={(event) =>
              setSlug(
                event.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]+/gu, "-")
                  .replace(/^-|-$/gu, ""),
              )
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.description}</span>
          <textarea
            className="min-h-16 rounded-md border border-border bg-background px-3 py-2"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.location}</span>
          <Input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.venueId}</span>
          <Input
            value={venueId}
            onChange={(event) => setVenueId(event.target.value)}
          />
        </label>
        <CheckField
          label={dict.spaces.public}
          checked={isPublic}
          onChange={setIsPublic}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.rules}</span>
          <textarea
            className="min-h-16 rounded-md border border-border bg-background px-3 py-2"
            value={rules}
            onChange={(event) => setRules(event.target.value)}
          />
        </label>
        <RuleSelect
          label={dict.spaces.whoCanBook}
          value={whoCanBook}
          onChange={(value) => setWhoCanBook(value as Space["whoCanBook"])}
          options={[
            ["ANYONE_SIGNED_IN", dict.spaces.anyone],
            ["NTHU_ONLY", dict.spaces.nthuOnly],
            ["MEMBERS", dict.spaces.membersOnly],
            ["ALLOW_LIST", dict.spaces.allowListOnly],
          ]}
        />
        <RuleSelect
          label={dict.spaces.approvalMode}
          value={approvalMode}
          onChange={(value) => setApprovalMode(value as Space["approvalMode"])}
          options={[
            ["APPROVAL", dict.spaces.approvalRequired],
            ["INSTANT", dict.spaces.instantApproval],
          ]}
        />
        <NumberField
          label={dict.spaces.slotLength}
          value={slotLengthMinutes}
          onChange={setSlotLengthMinutes}
          min={5}
          step={5}
        />
        <NumberField
          label={dict.spaces.minNotice}
          value={minNoticeHours}
          onChange={setMinNoticeHours}
          min={0}
        />
        <NumberField
          label={dict.spaces.maxLength}
          value={maxLengthMinutes}
          onChange={setMaxLengthMinutes}
          min={5}
          step={5}
        />
        <NumberField
          label={dict.spaces.maxActive}
          value={maxActiveBookingsPerUser}
          onChange={setMaxActiveBookingsPerUser}
          min={1}
        />
        <CheckField
          label={dict.spaces.requireBorrowingUnit}
          checked={requireBorrowingUnit}
          onChange={setRequireBorrowingUnit}
        />
        <CheckField
          label={dict.spaces.requirePurpose}
          checked={requirePurpose}
          onChange={setRequirePurpose}
        />
        <CheckField
          label={dict.spaces.requireHeadcount}
          checked={requireHeadcount}
          onChange={setRequireHeadcount}
        />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            {dict.spaces.openingHours}
          </span>
          <div className="flex flex-col divide-y divide-border">
            {weekDays.map((day, weekday) => {
              const hours = openingHours.find((row) => row.weekday === weekday);
              return (
                <div
                  key={weekday}
                  className="flex flex-row flex-wrap items-center gap-2 py-2 text-sm"
                >
                  <label className="flex min-h-10 min-w-24 flex-row items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(hours)}
                      onChange={(event) =>
                        toggleWeekday(weekday, event.target.checked)
                      }
                    />
                    {day}
                  </label>
                  {hours && (
                    <>
                      <input
                        aria-label={`${day} ${dict.spaces.opensAt}`}
                        className="min-h-10 rounded-md border border-border bg-background px-2"
                        type="time"
                        value={hours.opensAt}
                        onChange={(event) =>
                          setHour(weekday, "opensAt", event.target.value)
                        }
                      />
                      <span>–</span>
                      <input
                        aria-label={`${day} ${dict.spaces.closesAt}`}
                        className="min-h-10 rounded-md border border-border bg-background px-2"
                        type="time"
                        value={hours.closesAt}
                        onChange={(event) =>
                          setHour(weekday, "closesAt", event.target.value)
                        }
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.blackouts}</span>
          <textarea
            className="min-h-20 rounded-md border border-border bg-background px-3 py-2"
            placeholder={dict.spaces.blackoutHint}
            value={blackoutText}
            onChange={(event) => setBlackoutText(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{dict.spaces.allowList}</span>
          <textarea
            className="min-h-20 rounded-md border border-border bg-background px-3 py-2"
            placeholder={dict.spaces.allowListHint}
            value={allowText}
            onChange={(event) => setAllowText(event.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          size="sm"
          className="w-fit"
          disabled={
            update.isPending || !name.trim() || !slug.trim() || !location.trim()
          }
          onClick={() => void submit()}
        >
          {dict.spaces.save}
        </Button>
      </div>
    </details>
  );
};

const RequestsPanel = ({ organisationId }: { organisationId: string }) => {
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
      setError(dict.spaces.decisionReason);
      return;
    }
    setError("");
    try {
      await decide.mutateAsync({ input: booking.id, body: { action, reason } });
    } catch {
      setError(dict.spaces.saveFailed);
    }
  };
  const updateSelected = async (action: "APPROVE" | "REJECT") => {
    if (action === "REJECT" && !reason.trim()) {
      setError(dict.spaces.decisionReason);
      return;
    }
    setError("");
    try {
      await bulk.mutateAsync({
        input: undefined,
        body: { bookingIds: selected, action, reason },
      });
      setSelected([]);
    } catch {
      setError(dict.spaces.saveFailed);
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

const ManageWeek = ({
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
                <details className="shrink-0">
                  <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-md border border-border">
                    ⋯
                  </summary>
                  <button
                    type="button"
                    disabled={
                      new Date(booking.endAt).getTime() > Date.now() ||
                      markNoShow.isPending
                    }
                    className="min-h-10 border border-border bg-background px-3 text-sm text-destructive disabled:opacity-50"
                    onClick={async () => {
                      try {
                        await markNoShow.mutateAsync({ input: booking.id });
                      } catch {
                        setError(dict.spaces.saveFailed);
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

const ManageOrganisation = ({
  organisation,
}: {
  organisation: Organisation;
}) => {
  const dict = useDictionary();
  const auth = useAuth();
  const { lang } = useParams<{ lang: string }>();
  const canManage =
    organisation.role === "OWNER" || organisation.role === "MANAGER";
  const addMember = useAddOrganisationMember();
  const removeMember = useRemoveOrganisationMember();
  const updateOrganisation = useUpdateOrganisation();
  const archive = useArchiveSpace();
  const [identifier, setIdentifier] = useState("");
  const [memberRole, setMemberRole] = useState<"MANAGER" | "APPROVER">(
    "APPROVER",
  );
  const [webhook, setWebhook] = useState("");
  const [error, setError] = useState("");
  const spaces = organisation.spaces ?? [];
  useEffect(
    () => setWebhook(organisation.discordWebhookUrl ?? ""),
    [organisation.discordWebhookUrl],
  );
  const download = async () => {
    try {
      const blob = await downloadBookingsCsv(
        organisation.id,
        auth.user?.access_token ?? "",
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "space-bookings.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(dict.spaces.saveFailed);
    }
  };
  return (
    <section className="flex flex-col border-b border-border py-4">
      <div className="flex flex-row flex-wrap items-baseline gap-3">
        <h2 className="font-bold">{organisation.name}</h2>
        <span className="text-sm text-muted-foreground">
          {organisation.role === "OWNER"
            ? dict.spaces.owner
            : organisation.role === "MANAGER"
              ? dict.spaces.manager
              : dict.spaces.approver}
        </span>
        <span className="flex-1" />
        <span className="whitespace-nowrap text-sm font-medium">
          {statusText(organisation.status, dict)}
        </span>
      </div>
      <div className="flex flex-row flex-wrap gap-2 py-3">
        <Button asChild size="sm" variant="outline">
          <Link to={`/${lang}/spaces`}>{dict.spaces.browse}</Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void download()}
          disabled={!auth.user?.access_token}
        >
          {dict.spaces.exportCsv}
        </Button>
      </div>
      {canManage && (
        <>
          <div className="flex flex-col gap-2 border-t border-border py-3">
            <h3 className="font-medium">{dict.spaces.discordWebhook}</h3>
            <div className="flex flex-row gap-2">
              <Input
                type="url"
                value={webhook}
                onChange={(event) => setWebhook(event.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={updateOrganisation.isPending}
                onClick={async () => {
                  setError("");
                  try {
                    await updateOrganisation.mutateAsync({
                      input: organisation.id,
                      body: { discordWebhookUrl: webhook || null },
                    });
                  } catch {
                    setError(dict.spaces.saveFailed);
                  }
                }}
              >
                {dict.spaces.save}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-border py-3">
            <h3 className="font-medium">{dict.spaces.members}</h3>
            <div className="flex flex-col divide-y divide-border">
              {organisation.members?.map((member) => (
                <div
                  key={member.user.userId}
                  className="flex flex-row items-center gap-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{member.user.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      ・ {member.user.userId} ・ {member.user.email}
                    </span>
                  </div>
                  <span className="whitespace-nowrap">
                    {member.role === "OWNER"
                      ? dict.spaces.owner
                      : member.role === "MANAGER"
                        ? dict.spaces.manager
                        : dict.spaces.approver}
                  </span>
                  {member.role !== "OWNER" && (
                    <details className="shrink-0">
                      <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-md border border-border">
                        ⋯
                      </summary>
                      <button
                        className="min-h-10 border border-border bg-background px-3 text-sm text-destructive"
                        type="button"
                        onClick={async () => {
                          try {
                            await removeMember.mutateAsync({
                              input: {
                                organisationId: organisation.id,
                                userId: member.user.userId,
                              },
                            });
                          } catch {
                            setError(dict.spaces.saveFailed);
                          }
                        }}
                      >
                        {dict.spaces.remove}
                      </button>
                    </details>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-row flex-wrap gap-2">
              <Input
                className="min-w-48 flex-1"
                placeholder={dict.spaces.memberIdentifier}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
              <select
                className="min-h-10 rounded-md border border-border bg-background px-3"
                value={memberRole}
                onChange={(event) =>
                  setMemberRole(event.target.value as "MANAGER" | "APPROVER")
                }
              >
                <option value="MANAGER">{dict.spaces.manager}</option>
                <option value="APPROVER">{dict.spaces.approver}</option>
              </select>
              <Button
                size="sm"
                variant="outline"
                disabled={addMember.isPending || !identifier.trim()}
                onClick={async () => {
                  setError("");
                  try {
                    await addMember.mutateAsync({
                      input: organisation.id,
                      body: { userIdentifier: identifier, role: memberRole },
                    });
                    setIdentifier("");
                  } catch {
                    setError(dict.spaces.saveFailed);
                  }
                }}
              >
                {dict.spaces.addMember}
              </Button>
            </div>
          </div>
        </>
      )}
      <div className="border-t border-border py-3">
        <h3 className="font-medium">{dict.spaces.spaces}</h3>
        {spaces.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            {dict.spaces.emptySpaces}
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {spaces.map((space) => (
              <div key={space.id} className="py-2">
                <div className="flex flex-row items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      className="font-medium hover:text-primary"
                      to={`/${lang}/spaces/${organisation.slug}/${space.slug}`}
                    >
                      {space.name}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {space.location} ・{" "}
                      {space.isPublic
                        ? dict.spaces.public
                        : dict.spaces.private}
                    </div>
                  </div>
                  {canManage && (
                    <details className="shrink-0">
                      <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-md border border-border">
                        ⋯
                      </summary>
                      <button
                        type="button"
                        className="min-h-10 border border-border bg-background px-3 text-sm text-destructive"
                        onClick={async () => {
                          try {
                            await archive.mutateAsync({ input: space.id });
                          } catch {
                            setError(dict.spaces.saveFailed);
                          }
                        }}
                      >
                        {dict.spaces.archive}
                      </button>
                    </details>
                  )}
                </div>
                {canManage && <SpaceRulesEditor key={space.id} space={space} />}
              </div>
            ))}
          </div>
        )}
        {canManage && <SpaceCreateForm organisationId={organisation.id} />}
      </div>
      <div className="border-t border-border">
        <RequestsPanel organisationId={organisation.id} />
        <ManageWeek organisation={organisation} spaces={spaces} />
      </div>
      {error && (
        <p role="alert" className="py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
};

const ManageSpacesPage = () => {
  const dict = useDictionary();
  const auth = useAuth();
  const { lang } = useParams<{ lang: string }>();
  const query = useManageOrganisations();
  if (!auth.isAuthenticated) return <SignInPrompt />;
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
          size="sm"
          variant="outline"
          className="w-fit"
          onClick={() => void query.refetch()}
        >
          {dict.spaces.tryAgain}
        </Button>
      </div>
    );
  return (
    <div className="flex flex-col px-4">
      <div className="flex flex-row flex-wrap items-center gap-3 py-2">
        <h1 className="flex-1 font-bold">{dict.spaces.manage}</h1>
        <Button asChild variant="outline" size="sm">
          <Link to={`/${lang}/spaces`}>{dict.spaces.browse}</Link>
        </Button>
      </div>
      <CreateOrganisation />
      {(query.data?.organisations.length ?? 0) === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          {dict.spaces.emptySpaces}
        </p>
      ) : (
        query.data!.organisations.map((organisation) => (
          <ManageOrganisation
            key={organisation.id}
            organisation={organisation}
          />
        ))
      )}
      <div className="h-6" />
    </div>
  );
};

export default ManageSpacesPage;
