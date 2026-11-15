import { useSettings } from "@/hooks/contexts/settings";
import { CourseTimeslotData, TimetableDim } from "@/types/timetable";
import { cloneElement, forwardRef, HTMLAttributes } from "react";
import { VenueChip } from "./VenueChip";
import { scheduleTimeSlots } from "@courseweb/shared";
import useUserTimetable, {
  DEFAULT_FIELD_ORDER,
  TIMETABLE_FONT_FAMILIES,
  TIMETABLE_FONT_SIZE_PIXELS,
  TimetableFieldKey,
} from "@/hooks/contexts/useUserTimetable";
import { cn } from "@courseweb/ui";
import { resolveTimetableContentLanguage } from "@/helpers/contentLanguage";
import { CalendarClock } from "lucide-react";
import {
  getCustomSlotTimeRange,
  getTimetableSlotTimes,
  getTimetableTimeRangePosition,
  timetableGridEnd,
  timetableGridStart,
} from "@/helpers/timetable";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";
import { useTimetableSlotFitText } from "./FitText";

type TimetableSlotProps = {
  course: CourseTimeslotData;
  tableDim: TimetableDim;
  fraction?: number;
  fractionIndex?: number;
} & HTMLAttributes<HTMLDivElement>;

const TimetableSlotHorizontal = forwardRef<HTMLDivElement, TimetableSlotProps>(
  ({ course, tableDim, fraction = 1, fractionIndex = 1, ...props }, ref) => {
    const { language } = useSettings();
    const localizeData = useLocalizedZhData();
    const { preferences } = useUserTimetable();
    const displayLang = resolveTimetableContentLanguage(
      preferences.language,
      language,
    );

    // In horizontal layout, "align" maps to vertical axis (top/center/bottom of the row)
    // and "verticalAlign" maps to horizontal axis (left/center/right along the row)
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
    const baseFontSize =
      TIMETABLE_FONT_SIZE_PIXELS[preferences.fontSize ?? "sm"];
    const fontFamily =
      TIMETABLE_FONT_FAMILIES[preferences.fontFamily ?? "system"];
    const customItem = course.customItem;
    const customSlot = course.customSlot;
    const { start: startSlot, end: endSlot } = getTimetableSlotTimes(course);
    const customRange = customSlot ? getCustomSlotTimeRange(customSlot) : null;
    const extendedHours = tableDim.extendedHours;
    const customPosition =
      customRange && extendedHours
        ? getTimetableTimeRangePosition(
            customRange.start,
            customRange.end,
            extendedHours,
          )
        : null;
    const preBandSize = extendedHours?.pre?.size ?? 0;
    const gridWidth = tableDim.timetable.width * scheduleTimeSlots.length;
    const gridMinutes = timetableGridEnd - timetableGridStart;
    const slotHeight =
      customSlot && customRange
        ? Math.max(tableDim.timetable.height / fraction - 4, 24)
        : tableDim.timetable.height / fraction - 4;
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
                className={cn(
                  "font-medium min-w-0 max-w-full break-words",
                  textAlign,
                )}
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
              <span className={textAlign}>
                {startSlot.start} - {endSlot.end}
              </span>
            ) : null,
          );
        case "teacher":
          return fitField(
            field,
            display.teacher && teacherName ? (
              <span className={cn("break-words", textAlign)}>
                {teacherName}
              </span>
            ) : null,
          );
        case "venue":
          return fitField(
            field,
            display.venue ? (
              <div>
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

    return (
      <div
        ref={ref}
        className="absolute transform translate-y-0.5"
        style={{
          ...(customSlot && customRange
            ? {
                left:
                  tableDim.header.width +
                  (customPosition?.start ??
                    preBandSize +
                      ((customRange.start - timetableGridStart) / gridMinutes) *
                        gridWidth) +
                  2,
                top:
                  tableDim.header.height +
                  course.dayOfWeek * tableDim.timetable.height +
                  (fractionIndex - 1) * (tableDim.timetable.height / fraction),
                width: Math.max(
                  (customPosition?.size ??
                    ((customRange.end - customRange.start) / gridMinutes) *
                      gridWidth) - 4,
                  40,
                ),
                height: slotHeight,
              }
            : {
                left:
                  tableDim.header.width +
                  preBandSize +
                  course.startTime * tableDim.timetable.width +
                  2,
                top:
                  tableDim.header.height +
                  course.dayOfWeek * tableDim.timetable.height +
                  (fractionIndex - 1) * (tableDim.timetable.height / fraction),
                width:
                  tableDim.timetable.width *
                    (course.endTime - course.startTime + 1) -
                  4,
                height: slotHeight,
              }),
          height: slotHeight,
          zIndex: overflowsAtMinimum ? 20 : undefined,
        }}
        {...props}
      >
        <div
          className={cn("rounded-md", customItem && "border border-dashed")}
          style={{
            height: overflowsAtMinimum ? "auto" : "100%",
            // At 6px, this slot grows over adjacent rows with its background while keeping all enabled fields visible.
            minHeight: overflowsAtMinimum ? "100%" : undefined,
            backgroundColor: course.color,
            color: course.textColor,
            borderColor: customItem ? course.textColor : undefined,
          }}
          data-fit-available-height={slotHeight}
        >
          <div
            ref={fitTextRef}
            className={cn(
              "flex flex-col min-w-0 select-none",
              !overflowsAtMinimum && "h-full min-h-0",
              flexAlign,
              justifyContent,
            )}
            style={{
              ...fitTextStyle,
              fontFamily,
              overflowWrap: "anywhere",
            }}
          >
            {customItem ? (
              <>
                {display.title &&
                  fitField(
                    "title",
                    <span
                      className={cn(
                        "font-medium min-w-0 max-w-full break-words",
                        textAlign,
                      )}
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
                    <span className={textAlign}>
                      {customSlot
                        ? `${customSlot.start}–${customSlot.end}`
                        : `${scheduleTimeSlots[course.startTime]?.start ?? ""}–${scheduleTimeSlots[course.endTime]?.end ?? ""}`}
                    </span>,
                  )}
                {display.venue &&
                  customItem.venue &&
                  fitField(
                    "venue",
                    <span className={textAlign}>{customItem.venue}</span>,
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
            )}
          </div>
        </div>
      </div>
    );
  },
);

TimetableSlotHorizontal.displayName = "TimetableSlotHorizontal";

export default TimetableSlotHorizontal;
