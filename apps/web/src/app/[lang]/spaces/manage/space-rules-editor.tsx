import { useState } from "react";
import { Button, Input } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  getSpaceErrorMessage,
  useCreateSpace,
  useUpdateSpace,
  type Space,
  type SpaceOpeningHour,
} from "../api";
import { weekdays } from "./shared";

export const SpaceCreateForm = ({
  organisationId,
}: {
  organisationId: string;
}) => {
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
    } catch (error) {
      setError(getSpaceErrorMessage(error, dict.spaces));
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

export const SpaceRulesEditor = ({ space }: { space: Space }) => {
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
    } catch (error) {
      setError(getSpaceErrorMessage(error, dict.spaces));
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
