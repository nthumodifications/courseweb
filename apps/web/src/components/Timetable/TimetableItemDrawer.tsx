import { CalendarClock, Trash } from "lucide-react";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { PropsWithChildren, useEffect, useState } from "react";
import { hasTimes } from "@/helpers/courses";
import { MinimalCourse, RawCourseID } from "@/types/courses";
import { Popover, PopoverContent, PopoverTrigger } from "@courseweb/ui";
import Compact from "@uiw/react-color-compact";
import { Drawer, DrawerContent, DrawerTrigger } from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import { Input } from "@courseweb/ui";
import { ExternalLink, CalendarPlus, MapPin } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@courseweb/ui";
import DateContributeForm from "@/components/CourseDetails/DateContributeForm";
import { useQuery } from "@tanstack/react-query";
import useDictionary from "@/dictionaries/useDictionary";
import { useMediaQuery } from "usehooks-ts";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@courseweb/ui";
import { currentSemester } from "@courseweb/shared";
import client from "@/config/api";
import CourseTagList from "@/components/Courses/CourseTagsList";
import { CourseDefinition } from "@/config/supabase";
import { useCourseLink } from "@/components/Courses/CourseDialog";
import {
  CUSTOM_TIMETABLE_DAYS,
  CustomTimetableDay,
  CustomTimetableItem,
} from "@/types/timetable";
import { useNavigate, useParams } from "react-router-dom";
import { getCampusMapHref } from "@/features/campusMap/navigation";

const ImportantDates = ({ raw_id }: { raw_id: RawCourseID }) => {
  const {
    data: dates,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["contrib_dates", raw_id],
    queryFn: async () => {
      const res = await client.course[":courseId"].dates.$get({
        param: {
          courseId: raw_id,
        },
      });
      const dates = await res.json();
      const sortedDates = dates?.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      return sortedDates;
    },
  });
  const dict = useDictionary();

  return (
    <div className="flex flex-col gap-1 px-4">
      <div className="flex flex-row justify-between">
        <h3 className="font-semibold text-base">
          {dict.course.details.important_dates}
        </h3>
      </div>
      {dates && (
        <div className="flex flex-col gap-1">
          {dates.map((m, index) => (
            <div key={index} className="flex flex-row gap-2">
              <p className="text-sm min-w-20 tabular-nums">
                {format(new Date(m.date), "yyyy-MM-dd")}
              </p>
              <p className="text-sm font-semibold">
                <Badge variant="secondary" className="mr-2">
                  {
                    dict.dialogs.DateContributeForm.types[
                      m.type as keyof typeof dict.dialogs.DateContributeForm.types
                    ]
                  }
                </Badge>
                {m.title}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TimetableCourseQuickAccess = ({ course }: { course: MinimalCourse }) => {
  const { deleteCourse, colorMap, setColor, currentColors } =
    useUserTimetable();
  const { openCourse } = useCourseLink();
  const dict = useDictionary();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const campusMapHref = getCampusMapHref(lang, course.venues);

  return (
    <>
      <div className="relative @container">
        <div className="flex flex-row gap-4 p-4">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-md hover:outline outline-1 outline-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={dict.timetable.course_actions.color_label}
              >
                <span
                  className="h-4 w-4 rounded-sm"
                  style={{ backgroundColor: colorMap[course.raw_id] }}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <Compact
                color={colorMap[course.raw_id]}
                onChange={(color) => {
                  setColor(course.raw_id, color.hex);
                }}
                colors={currentColors}
              />
            </PopoverContent>
          </Popover>
          <div className="flex-1">
            <div className="mb-2 space-y-1">
              <div className="flex flex-row gap-2 items-center">
                <p className="text-sm font-medium tabular-nums text-muted-foreground">
                  {course.department} {course.course}-
                  {course.class.padStart(2, "0")}
                </p>
              </div>
              <div className="font-semibold">
                {course.name_zh} - {course.teacher_zh.join(",")}
              </div>
              <div className="text-sm mt-0 break-words">
                {course.name_en} - {course.teacher_en.join(",")}
              </div>
              <div className="space-y-1 self-start w-auto max-w-fit">
                {course.venues?.map((venue, index) => {
                  const time = course.times![index];
                  return (
                    <div key={index} className="text-muted-foreground text-xs tabular-nums">
                      {venue} /{" "}
                      {hasTimes(course as MinimalCourse)
                        ? time
                        : dict.course.details.missing_time}
                    </div>
                  );
                }) || (
                  <div className="text-muted-foreground text-xs">
                    {dict.course.details.no_venues}
                  </div>
                )}
              </div>
              <CourseTagList course={course as unknown as CourseDefinition} />
            </div>
          </div>
        </div>
      </div>
      <ImportantDates raw_id={course.raw_id} />
      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => openCourse(course.raw_id)}>
            <ExternalLink className="w-4 h-4 mr-2" />
            {dict.course.details.dialog_title}
          </Button>
          <Button
            variant="outline"
            disabled={!campusMapHref}
            title={
              !campusMapHref
                ? dict.timetable.course_actions.location_unavailable
                : undefined
            }
            onClick={() => campusMapHref && navigate(campusMapHref)}
          >
            <MapPin className="w-4 h-4 mr-2" />
            {dict.timetable.course_actions.course_location}
          </Button>
          <DateContributeForm courseId={course.raw_id}>
            <Button variant="outline">
              <CalendarPlus className="w-4 h-4 mr-2" />
              {dict.dialogs.DateContributeForm.add_date}
            </Button>
          </DateContributeForm>
          <Button
            variant="destructive"
            onClick={() => deleteCourse(course.raw_id)}
          >
            <Trash className="w-4 h-4 mr-2" />
            {dict.course.item.remove_from_semester}
          </Button>
        </div>
      </div>
    </>
  );
};

export const TimetableItemDrawer = ({
  course,
  children,
}: PropsWithChildren<{ course: MinimalCourse }>) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop)
    return (
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogTitle className="sr-only">
            {course.name_zh} - {course.teacher_zh.join(",")}
          </DialogTitle>
          <TimetableCourseQuickAccess course={course} />
        </DialogContent>
      </Dialog>
    );
  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
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
        <h2 className="text-lg font-semibold">
          {dict.timetable.custom_items.editor_title}
        </h2>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          {dict.timetable.custom_items.title_label}
        </label>
        <Input
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
              className="h-10 w-10 rounded-sm border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ backgroundColor: color }}
              aria-label={dict.timetable.custom_items.color_label}
            />
          </PopoverTrigger>
          <PopoverContent className="p-0 w-auto">
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
