import {
  CalendarClock,
  Trash,
  ExternalLink,
  MapPin,
  Plus,
  Star,
  ChevronRight,
} from "lucide-react";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { PropsWithChildren, useEffect, useState, type ReactNode } from "react";
import { hasTimes } from "@/helpers/courses";
import { MinimalCourse, RawCourseID } from "@/types/courses";
import {
  getCourseMeetingGroups,
  getNextCourseMeeting,
} from "@/helpers/nextCourseMeeting";
import { useDefaultSemesterId, useSemesters } from "@/hooks/useSemesters";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@courseweb/ui";
import Compact from "@uiw/react-color-compact";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import DateContributeForm from "@/components/CourseDetails/DateContributeForm";
import { useQuery } from "@tanstack/react-query";
import useDictionary from "@/dictionaries/useDictionary";
import { useMediaQuery } from "usehooks-ts";
import client from "@/config/api";
import { useCourseLink } from "@/components/Courses/CourseDialog";
import {
  CUSTOM_TIMETABLE_DAYS,
  CustomTimetableDay,
  CustomTimetableItem,
} from "@/types/timetable";
import { useNavigate, useParams } from "react-router-dom";
import { getCampusMapHref } from "@/features/campusMap/navigation";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";
import { isEnglishCourseLanguage } from "@/lib/course-language";
import { safeCreateModuleKey } from "@/lib/modules";
import { useMyReviews } from "@/lib/reviews";

const ImportantDates = ({ courseId }: { courseId: RawCourseID }) => {
  const { data: dates = [] } = useQuery({
    queryKey: ["contrib_dates", courseId],
    queryFn: async () => {
      const res = await client.course[":courseId"].dates.$get({
        param: {
          courseId,
        },
      });
      if (!res.ok) throw new Error("Failed to load course dates");
      const dates = await res.json();
      return (dates ?? []) as { date: string; type: string; title: string }[];
    },
  });
  const dict = useDictionary();
  const dialogDict = dict.timetable.item_dialog;
  const today = startOfDay(new Date());
  const upcomingDates = dates
    .map((date) => ({ ...date, parsedDate: parseISO(date.date) }))
    .filter(
      (date) =>
        !Number.isNaN(date.parsedDate.getTime()) &&
        !isBefore(startOfDay(date.parsedDate), today),
    )
    .sort(
      (left, right) => left.parsedDate.getTime() - right.parsedDate.getTime(),
    )
    .slice(0, 3);

  return (
    <InformationRow
      label={dialogDict.important_dates}
      action={
        <DateContributeForm courseId={courseId}>
          <Button variant="ghost" size="sm" className="h-7 px-1">
            {dialogDict.add_date}
          </Button>
        </DateContributeForm>
      }
    >
      {upcomingDates.length === 0 ? (
        <span className="text-muted-foreground">{dialogDict.no_dates}</span>
      ) : (
        <div className="flex flex-col gap-1">
          {upcomingDates.map((date) => {
            const typeLabels = dict.dialogs.DateContributeForm.types;
            const typeLabel =
              typeLabels[date.type as keyof typeof typeLabels] ?? date.type;

            return (
              <div
                key={`${date.date}-${date.type}-${date.title}`}
                className="flex flex-wrap items-baseline gap-2"
              >
                <span className="whitespace-nowrap font-medium">
                  {format(date.parsedDate, "M/d")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {typeLabel}
                </span>
                <span>{date.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </InformationRow>
  );
};

const InformationRow = ({
  label,
  action,
  children,
}: PropsWithChildren<{ label: string; action?: ReactNode }>) => (
  <div className="flex items-center gap-2 py-2">
    <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">
      {label}
    </span>
    <div className="min-w-0 flex-1 text-sm">{children}</div>
    {action}
  </div>
);

const WEEKDAY_KEY = {
  0: "U",
  1: "M",
  2: "T",
  3: "W",
  4: "R",
  5: "F",
  6: "S",
} as const;

const TimetableCourseQuickAccess = ({ course }: { course: MinimalCourse }) => {
  const { deleteCourse, colorMap, setColor, currentColors } =
    useUserTimetable();
  const { openCourse } = useCourseLink();
  const dict = useDictionary();
  const dialogDict = dict.timetable.item_dialog;
  const localizeData = useLocalizedZhData();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const defaultSemesterId = useDefaultSemesterId();
  const semesters = useSemesters();
  const currentSemester = semesters.find(
    (semester) => semester.id === defaultSemesterId,
  );
  const campusMapHref = getCampusMapHref(lang, course.venues);
  const courseColor =
    colorMap[course.raw_id] ?? currentColors[0] ?? "hsl(var(--muted))";
  const hasCustomColor =
    /^#[0-9a-f]{6}$/i.test(courseColor) &&
    !currentColors.some(
      (color) => color.toLowerCase() === courseColor.toLowerCase(),
    );
  const hasCourseTimes = hasTimes(course);
  const meetingGroups = hasCourseTimes
    ? getCourseMeetingGroups(course.times, course.venues)
    : [];
  const now = new Date();
  const nextMeeting =
    course.semester === defaultSemesterId &&
    currentSemester &&
    now <= currentSemester.ends &&
    hasCourseTimes
      ? getNextCourseMeeting(course.times, course.venues, now)
      : undefined;
  const moduleKey = safeCreateModuleKey(course.department, course.course);
  const { data: myReviews } = useMyReviews();
  const ownReview = myReviews?.reviews
    .filter((review) => review.moduleKey === moduleKey)
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime(),
    )[0];

  const openReviews = () => {
    navigate(
      `/${lang ?? "zh"}/courses/${encodeURIComponent(course.raw_id)}#reviews`,
    );
  };

  const getWeekdayName = (dayOfWeek: number) =>
    dict.timetable.custom_items.days[
      WEEKDAY_KEY[dayOfWeek as keyof typeof WEEKDAY_KEY]
    ];

  const getRelativeDayLabel = (daysFromToday: number) => {
    if (daysFromToday === 0) return dialogDict.today;
    if (daysFromToday === 1) return dialogDict.tomorrow;
    return dialogDict.days_later.replace("{count}", String(daysFromToday));
  };

  return (
    <>
      <div
        className="relative p-4"
        style={{
          background: `color-mix(in srgb, ${courseColor} 35%, hsl(var(--background)))`,
        }}
      >
        <div className="mb-1 flex max-w-[calc(100%_-_2rem)] flex-wrap items-baseline text-xs">
          <span className="font-medium">
            {course.department} {course.course}-{course.class.padStart(2, "0")}
          </span>
          <span className="text-muted-foreground">
            {dialogDict.metadata_separator}
            {`${course.credits} ${dict.course.credits}`}
            {dialogDict.metadata_separator}
            {isEnglishCourseLanguage(course.language)
              ? dict.course.tags.english
              : dict.course.tags.chinese}
          </span>
        </div>
        <div className="flex flex-wrap items-baseline gap-1">
          <span className="text-base font-bold">
            {localizeData(course.name_zh)}
          </span>
          <span className="font-medium">
            {course.teacher_zh.map(localizeData).join(", ")}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {course.name_en} - {course.teacher_en.join(", ")}
        </div>
        <div className="mt-1 flex flex-col gap-1">
          {meetingGroups.length > 0 ? (
            meetingGroups.map((meeting, index) => (
              <div
                key={`${meeting.dayOfWeek}-${meeting.start}-${meeting.venue}-${index}`}
                className="text-sm"
              >
                <span className="font-medium">
                  {getWeekdayName(meeting.dayOfWeek)} {meeting.start}–
                  {meeting.end}
                </span>
                <span className="text-muted-foreground">
                  {dialogDict.meeting_separator}
                  {meeting.venue
                    ? localizeData(meeting.venue)
                    : dict.course.details.no_venues}
                </span>
              </div>
            ))
          ) : course.venues.length > 0 ? (
            course.venues.map((venue, index) => (
              <div key={`${venue}-${index}`} className="text-sm">
                <span className="text-muted-foreground">
                  {localizeData(venue)}
                  {dialogDict.meeting_separator}
                  {dict.course.details.missing_time}
                </span>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">
              {dict.course.details.no_venues}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-4 pb-3 pt-3">
        {currentColors.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={dialogDict.color_option.replace("{color}", color)}
            aria-pressed={courseColor === color}
            className={`h-5 w-5 shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${courseColor === color ? "outline outline-2 outline-foreground outline-offset-2" : ""}`}
            style={{ backgroundColor: color }}
            onClick={() => setColor(course.raw_id, color)}
          />
        ))}
        <label
          className={`relative flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground ${hasCustomColor ? "outline outline-2 outline-foreground outline-offset-2" : "border border-dashed border-muted-foreground"}`}
          style={hasCustomColor ? { backgroundColor: courseColor } : undefined}
        >
          {!hasCustomColor && <Plus className="h-3 w-3" aria-hidden="true" />}
          <input
            type="color"
            aria-label={dialogDict.custom_color}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={
              /^#[0-9a-f]{6}$/i.test(courseColor) ? courseColor : "#000000"
            }
            onChange={(event) => setColor(course.raw_id, event.target.value)}
          />
        </label>
        <span className="ml-1 text-xs text-muted-foreground">
          {dialogDict.custom_color}
        </span>
      </div>
      <div className="divide-y divide-border border-t px-4">
        {nextMeeting && (
          <InformationRow
            label={dialogDict.next_class}
            action={
              <span className="shrink-0 rounded-full bg-primary/10 px-2 text-xs font-medium leading-[22px] text-primary">
                {getRelativeDayLabel(nextMeeting.daysFromToday)}
              </span>
            }
          >
            <span className="font-medium">
              {getWeekdayName(nextMeeting.dayOfWeek)} {nextMeeting.start}
            </span>
            <span className="text-muted-foreground">
              {dialogDict.meeting_separator}
              {nextMeeting.venue
                ? localizeData(nextMeeting.venue)
                : dict.course.details.no_venues}
            </span>
          </InformationRow>
        )}
        <ImportantDates courseId={course.raw_id} />
        <InformationRow
          label={dialogDict.my_review}
          action={
            ownReview ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 px-1"
                onClick={openReviews}
              >
                {dialogDict.edit_review}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="h-8 shrink-0 rounded-md bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/15"
                onClick={openReviews}
              >
                <Star className="h-4 w-4" aria-hidden="true" />
                {dialogDict.write_review}
              </Button>
            )
          }
        >
          {ownReview ? (
            <>
              <div className="flex flex-wrap gap-2">
                <span>
                  <span className="text-muted-foreground">
                    {dialogDict.coolness}
                  </span>{" "}
                  <strong className="font-bold">
                    {ownReview.coolness ?? "—"}
                  </strong>
                </span>
                <span>
                  <span className="text-muted-foreground">
                    {dialogDict.sweetness}
                  </span>{" "}
                  <strong className="font-bold">
                    {ownReview.sweetness ?? "—"}
                  </strong>
                </span>
                <span>
                  <span className="text-muted-foreground">
                    {dialogDict.learning}
                  </span>{" "}
                  <strong className="font-bold">
                    {ownReview.learning ?? "—"}
                  </strong>
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(ownReview.updatedAt), "M/d")}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">
              {dialogDict.not_reviewed}
            </span>
          )}
        </InformationRow>
      </div>
      <div className="flex items-center gap-2 border-t px-4 pb-4 pt-3">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 px-3"
          onClick={() => openCourse(course.raw_id)}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {dialogDict.details}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 px-3"
          disabled={!campusMapHref}
          title={
            !campusMapHref
              ? dict.timetable.course_actions.location_unavailable
              : undefined
          }
          onClick={() => campusMapHref && navigate(campusMapHref)}
        >
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {dialogDict.location}
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label={dict.course.item.remove_from_semester}
          onClick={() => deleteCourse(course.raw_id)}
        >
          <Trash className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </>
  );
};

export const TimetableItemDrawer = ({
  course,
  children,
}: PropsWithChildren<{ course: MinimalCourse }>) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const localizeData = useLocalizedZhData();

  if (isDesktop)
    return (
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent
          className="w-[420px] max-w-[calc(100vw_-_2rem)] gap-0 overflow-hidden p-0 sm:max-w-[420px]"
          // Focusing the first colour swatch on open draws a ring that reads
          // as the selected colour; keep focus on the dialog itself.
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogTitle className="sr-only">
            {localizeData(course.name_zh)} -{" "}
            {course.teacher_zh.map(localizeData).join(",")}
          </DialogTitle>
          <TimetableCourseQuickAccess course={course} />
        </DialogContent>
      </Dialog>
    );
  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerTitle className="sr-only">
          {localizeData(course.name_zh)} -{" "}
          {course.teacher_zh.map(localizeData).join(",")}
        </DrawerTitle>
        <TimetableCourseQuickAccess course={course} />
      </DrawerContent>
    </Drawer>
  );
};

const CustomTimetableItemEditor = ({
  item,
  onSave,
  onDelete,
}: {
  item: CustomTimetableItem;
  onSave: (item: CustomTimetableItem) => void;
  onDelete?: () => void;
}) => {
  const dict = useDictionary();
  const { currentColors } = useUserTimetable();
  const firstSlot = item.slots[0] ?? {
    day: 0,
    start: "08:00",
    end: "08:50",
  };
  const initialDays = [
    ...new Set(
      item.slots
        .map((slot) => CUSTOM_TIMETABLE_DAYS[slot.day])
        .filter((day): day is CustomTimetableDay => day !== undefined),
    ),
  ];

  const [title, setTitle] = useState(item.title);
  const [shortCode, setShortCode] = useState(item.shortCode ?? "");
  const [venue, setVenue] = useState(item.venue ?? "");
  const [note, setNote] = useState(item.note ?? "");
  const [color, setColor] = useState(item.color);
  const [selectedDays, setSelectedDays] = useState<CustomTimetableDay[]>(
    initialDays.length > 0 ? initialDays : ["M"],
  );
  const [startTime, setStartTime] = useState(firstSlot.start);
  const [endTime, setEndTime] = useState(firstSlot.end);
  const [timeError, setTimeError] = useState(false);

  useEffect(() => {
    setTitle(item.title);
    setShortCode(item.shortCode ?? "");
    setVenue(item.venue ?? "");
    setNote(item.note ?? "");
    setColor(item.color);
    const days = [
      ...new Set(
        item.slots
          .map((slot) => CUSTOM_TIMETABLE_DAYS[slot.day])
          .filter((day): day is CustomTimetableDay => day !== undefined),
      ),
    ];
    setSelectedDays(days.length > 0 ? days : ["M"]);
    setStartTime(item.slots[0]?.start ?? "08:00");
    setEndTime(item.slots[0]?.end ?? "08:50");
    setTimeError(false);
  }, [item]);

  const toggleDay = (day: CustomTimetableDay) => {
    setSelectedDays((days) =>
      days.includes(day)
        ? days.length === 1
          ? days
          : days.filter((current) => current !== day)
        : [...days, day],
    );
  };

  const handleSave = () => {
    if (!title.trim() || selectedDays.length === 0) return;
    if (!startTime || !endTime || endTime <= startTime) {
      setTimeError(true);
      return;
    }
    setTimeError(false);

    onSave({
      ...item,
      title: title.trim(),
      shortCode: shortCode.trim() || undefined,
      venue: venue.trim() || undefined,
      note: note.trim() || undefined,
      color,
      slots: selectedDays.map((day) => ({
        day: CUSTOM_TIMETABLE_DAYS.indexOf(day),
        start: startTime,
        end: endTime,
      })),
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">
          {dict.timetable.custom_items.editor_title}
        </h2>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          {dict.timetable.custom_items.title_label}
        </label>
        <Input
          aria-label={dict.timetable.custom_items.title_label}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={dict.timetable.custom_items.title_placeholder}
          maxLength={80}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            {dict.timetable.custom_items.short_code_label}
          </label>
          <Input
            aria-label={dict.timetable.custom_items.short_code_label}
            value={shortCode}
            onChange={(event) => setShortCode(event.target.value)}
            placeholder={dict.timetable.custom_items.short_code_placeholder}
            maxLength={20}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            {dict.timetable.custom_items.venue_label}
          </label>
          <Input
            aria-label={dict.timetable.custom_items.venue_label}
            value={venue}
            onChange={(event) => setVenue(event.target.value)}
            placeholder={dict.timetable.custom_items.venue_placeholder}
            maxLength={80}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">
          {dict.timetable.custom_items.days_label}
        </label>
        <div className="grid grid-cols-6 gap-1">
          {CUSTOM_TIMETABLE_DAYS.map((day) => (
            <Button
              key={day}
              type="button"
              size="sm"
              variant={selectedDays.includes(day) ? "default" : "outline"}
              onClick={() => toggleDay(day)}
              className="px-1"
            >
              {dict.timetable.custom_items.days[day]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="custom-start-time">
            {dict.timetable.custom_items.start_label}
          </label>
          <Input
            id="custom-start-time"
            type="time"
            value={startTime}
            onChange={(event) => {
              setStartTime(event.target.value);
              setTimeError(false);
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="custom-end-time">
            {dict.timetable.custom_items.end_label}
          </label>
          <Input
            id="custom-end-time"
            type="time"
            value={endTime}
            onChange={(event) => {
              setEndTime(event.target.value);
              setTimeError(false);
            }}
          />
        </div>
      </div>
      {timeError && (
        <p className="text-sm text-destructive" role="alert">
          {dict.timetable.custom_items.time_error}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          {dict.timetable.custom_items.note_label}
        </label>
        <textarea
          aria-label={dict.timetable.custom_items.note_label}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={dict.timetable.custom_items.note_placeholder}
          maxLength={200}
          className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium">
          {dict.timetable.custom_items.color_label}
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-8 w-8 rounded-full border border-border"
              style={{ backgroundColor: color }}
              aria-label={dict.timetable.custom_items.color_label}
            />
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-auto"
            aria-label={dict.timetable.custom_items.color_label}
          >
            <Compact
              color={color}
              onChange={(next) => setColor(next.hex)}
              colors={currentColors}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-2">
        {onDelete && (
          <Button type="button" variant="destructive" onClick={onDelete}>
            <Trash className="h-4 w-4 mr-2" />
            {dict.timetable.custom_items.delete}
          </Button>
        )}
        <Button
          type="button"
          className="ml-auto"
          onClick={handleSave}
          disabled={!title.trim() || selectedDays.length === 0}
        >
          {dict.timetable.custom_items.save}
        </Button>
      </div>
    </div>
  );
};

export const TimetableCustomItemDrawer = ({
  item,
  onSave,
  onDelete,
  editable = true,
  children,
}: PropsWithChildren<{
  item: CustomTimetableItem;
  onSave?: (item: CustomTimetableItem) => void;
  onDelete?: () => void;
  editable?: boolean;
}>) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const dict = useDictionary();
  const { updateCustomItem } = useUserTimetable();
  const [open, setOpen] = useState(false);
  if (!editable) return <>{children}</>;
  const handleSave = (nextItem: CustomTimetableItem) => {
    (onSave ?? updateCustomItem)(nextItem);
    setOpen(false);
  };

  if (isDesktop)
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[500px] p-0">
          <DialogTitle className="sr-only">
            {dict.timetable.custom_items.editor_title}
          </DialogTitle>
          <CustomTimetableItemEditor
            item={item}
            onSave={handleSave}
            onDelete={
              onDelete
                ? () => {
                    onDelete();
                    setOpen(false);
                  }
                : undefined
            }
          />
        </DialogContent>
      </Dialog>
    );

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerTitle className="sr-only">
          {dict.timetable.custom_items.editor_title}
        </DrawerTitle>
        <CustomTimetableItemEditor
          item={item}
          onSave={handleSave}
          onDelete={
            onDelete
              ? () => {
                  onDelete();
                  setOpen(false);
                }
              : undefined
          }
        />
      </DrawerContent>
    </Drawer>
  );
};
