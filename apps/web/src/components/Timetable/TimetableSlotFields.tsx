import { useSettings } from "@/hooks/contexts/settings";
import useUserTimetable, {
  DEFAULT_FIELD_ORDER,
  TIMETABLE_FONT_FAMILIES,
  TIMETABLE_FONT_SIZE_PIXELS,
  TimetableFieldKey,
} from "@/hooks/contexts/useUserTimetable";
import { resolveTimetableContentLanguage } from "@/helpers/contentLanguage";
import {
  getCustomSlotTimeRange,
  getTimetableSlotTimes,
  timetableGridEnd,
  timetableGridStart,
} from "@/helpers/timetable";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";
import { CourseTimeslotData } from "@/types/timetable";
import { scheduleTimeSlots } from "@courseweb/shared";
import { cn } from "@courseweb/ui";
import { CalendarClock } from "lucide-react";
import { cloneElement } from "react";
import { VenueChip } from "./VenueChip";
import { useTimetableSlotFitText } from "./FitText";

type TimetableSlotFieldOptions = {
  course: CourseTimeslotData;
  titleClassName: string;
  customTitleClassName: string;
  alignVenueChip?: boolean;
  customVenueBreakWords?: boolean;
};

export const useTimetableSlotFields = ({
  course,
  titleClassName,
  customTitleClassName,
  alignVenueChip = false,
  customVenueBreakWords = false,
}: TimetableSlotFieldOptions) => {
  const { language } = useSettings();
  const localizeData = useLocalizedZhData();
  const { preferences } = useUserTimetable();
  const displayLang = resolveTimetableContentLanguage(
    preferences.language,
    language,
  );
  const flexAlign =
    preferences.align == "left"
      ? "items-start"
      : preferences.align == "center"
        ? "items-center"
        : "items-end";
  const textAlign =
    preferences.align == "left"
      ? "text-left"
      : preferences.align == "center"
        ? "text-center"
        : "text-right";
  const justifyContent =
    (preferences.verticalAlign ?? "top") == "top"
      ? "justify-start"
      : (preferences.verticalAlign ?? "top") == "center"
        ? "justify-center"
        : "justify-end";

  const fieldOrder: TimetableFieldKey[] =
    preferences.fieldOrder ?? DEFAULT_FIELD_ORDER;
  const display = preferences.display;
  const customItem = course.customItem;
  const titleBehavior = preferences.titleBehavior ?? "fit";
  const titleLineClamp =
    titleBehavior === "fit"
      ? undefined
      : {
          display: "-webkit-box",
          WebkitBoxOrient: "vertical" as const,
          WebkitLineClamp: Number(titleBehavior),
          overflow: "hidden",
        };
  const fullTitle = customItem
    ? customItem.title
    : displayLang == "zh"
      ? localizeData(course.course.name_zh)
      : course.course.name_en;
  const baseFontSize = TIMETABLE_FONT_SIZE_PIXELS[preferences.fontSize ?? "sm"];
  const fontFamily =
    TIMETABLE_FONT_FAMILIES[preferences.fontFamily ?? "system"];
  const customSlot = course.customSlot;
  const { start: startSlot, end: endSlot } = getTimetableSlotTimes(course);
  const customRange = customSlot ? getCustomSlotTimeRange(customSlot) : null;
  const showCustomTime =
    customRange !== null &&
    (customRange.start < timetableGridStart ||
      customRange.end > timetableGridEnd);
  const teacherName =
    displayLang == "zh"
      ? course.course.teacher_zh?.map(localizeData).join(", ")
      : course.course.teacher_en?.join(", ");

  const {
    containerRef: fitTextRef,
    overflowsAtMinimum,
    style: fitTextStyle,
  } = useTimetableSlotFitText({
    baseFontSize,
    display,
    displayLanguage: displayLang,
    fieldOrder,
    fontFamily,
    showCustomTime,
    slot: course,
    titleBehavior,
  });
  const fitField = (field: string, content: JSX.Element | null) =>
    content ? cloneElement(content, { key: field }) : null;

  const renderField = (field: TimetableFieldKey) => {
    switch (field) {
      case "code":
        return fitField(
          field,
          display.code ? (
            <span className={cn("font-medium", textAlign)}>
              {course.course.department + course.course.course}
            </span>
          ) : null,
        );
      case "title":
        return fitField(
          field,
          display.title ? (
            <span
              className={cn(titleClassName, textAlign)}
              data-fit-text-title
              style={titleLineClamp}
            >
              {displayLang == "zh"
                ? localizeData(course.course.name_zh)
                : course.course.name_en}
            </span>
          ) : null,
        );
      case "time":
        return fitField(
          field,
          display.time && startSlot && endSlot ? (
            <span className={cn("whitespace-nowrap", textAlign)}>
              {startSlot.start}–{endSlot.end}
            </span>
          ) : null,
        );
      case "teacher":
        return fitField(
          field,
          display.teacher && teacherName ? (
            <span className={cn("break-words", textAlign)}>{teacherName}</span>
          ) : null,
        );
      case "venue":
        return fitField(
          field,
          display.venue ? (
            <div className={alignVenueChip ? cn("flex", flexAlign) : undefined}>
              <VenueChip
                venue={course.venue}
                color={course.textColor}
                textColor={course.textColor}
                fitText
              />
            </div>
          ) : null,
        );
      case "credits":
        return fitField(
          field,
          display.credits ? (
            <span className={textAlign}>{course.course.credits} cr</span>
          ) : null,
        );
      default:
        return null;
    }
  };

  const fields = customItem ? (
    <>
      {display.title &&
        fitField(
          "title",
          <span
            className={cn(customTitleClassName, textAlign)}
            data-fit-text-title
            style={titleLineClamp}
          >
            <CalendarClock
              className="inline-block mr-0.5 align-[-0.1em]"
              style={{ width: "0.86em", height: "0.86em" }}
            />
            {customItem.title}
          </span>,
        )}
      {display.code &&
        customItem.shortCode &&
        fitField(
          "code",
          <span className={cn("font-medium", textAlign)}>
            {customItem.shortCode}
          </span>,
        )}
      {(display.time || showCustomTime) &&
        fitField(
          "time",
          <span className={cn("whitespace-nowrap", textAlign)}>
            {customSlot
              ? `${customSlot.start}–${customSlot.end}`
              : `${scheduleTimeSlots[course.startTime]?.start ?? ""}–${scheduleTimeSlots[course.endTime]?.end ?? ""}`}
          </span>,
        )}
      {display.venue &&
        customItem.venue &&
        fitField(
          "venue",
          <span
            className={cn(customVenueBreakWords && "break-words", textAlign)}
          >
            {customItem.venue}
          </span>,
        )}
      {customItem.note &&
        fitField(
          "note",
          <span className={cn("opacity-85 break-words", textAlign)}>
            {customItem.note}
          </span>,
        )}
    </>
  ) : (
    fieldOrder.map((field) => renderField(field))
  );

  return {
    fields,
    fullTitle,
    flexAlign,
    fontFamily,
    fitTextRef,
    fitTextStyle,
    justifyContent,
    overflowsAtMinimum,
  };
};
