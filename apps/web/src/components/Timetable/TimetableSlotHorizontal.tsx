import { scheduleTimeSlots } from "@courseweb/shared";
import { cn } from "@courseweb/ui";
import {
  getCustomSlotTimeRange,
  getTimetableTimeRangePosition,
  timetableGridEnd,
  timetableGridStart,
} from "@/helpers/timetable";
import { CourseTimeslotData, TimetableDim } from "@/types/timetable";
import { forwardRef, HTMLAttributes } from "react";
import { useTimetableSlotFields } from "./TimetableSlotFields";

type TimetableSlotProps = {
  course: CourseTimeslotData;
  tableDim: TimetableDim;
  fraction?: number;
  fractionIndex?: number;
} & HTMLAttributes<HTMLDivElement>;

const TimetableSlotHorizontal = forwardRef<HTMLDivElement, TimetableSlotProps>(
  ({ course, tableDim, fraction = 1, fractionIndex = 1, ...props }, ref) => {
    const {
      fields,
      flexAlign,
      fontFamily,
      fitTextRef,
      fitTextStyle,
      justifyContent,
      overflowsAtMinimum,
    } = useTimetableSlotFields({
      course,
      titleClassName: "font-medium min-w-0 max-w-full break-words",
      customTitleClassName: "font-medium min-w-0 max-w-full break-words",
    });
    const customItem = course.customItem;
    const customSlot = course.customSlot;
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
            {fields}
          </div>
        </div>
      </div>
    );
  },
);

TimetableSlotHorizontal.displayName = "TimetableSlotHorizontal";

export default TimetableSlotHorizontal;
