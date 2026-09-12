import TimeslotHeader from "@/components/Timetable/TimeslotHeader";
import TimetableSlotVertical from "@/components/Timetable/TimetableSlotVertical";
import { scheduleTimeSlots } from "@courseweb/shared";
import { addDays, format } from "date-fns";
import {
  CourseTimeslotData,
  CourseTimeslotDataWithFraction,
  TimetableDim,
} from "@/types/timetable";
import {
  FC,
  ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import TimetableSlotHorizontal from "@/components/Timetable/TimetableSlotHorizontal";
import { useSettings } from "@/hooks/contexts/settings";
import { BlankTimeslotBody } from "./BlankTimeslotBody";
import { getLocale } from "@/helpers/dateLocale";
import {
  addTimetableFractions,
  formatTimetableClock,
  getTimetableExtendedHoursGeometry,
} from "@/helpers/timetable";

const Timetable: FC<{
  timetableData: CourseTimeslotData[];
  vertical?: boolean;
  renderTimetableSlot?: (
    course: CourseTimeslotDataWithFraction,
    tableDim: TimetableDim,
    vertical?: boolean,
  ) => ReactNode;
}> = ({ timetableData = [], vertical = true, renderTimetableSlot }) => {
  const { language } = useSettings();
  const headerRow = useRef<HTMLTableCellElement>(null);
  const timetableCell = useRef<HTMLTableCellElement>(null);
  const [tableDim, setTableDim] = useState({
    header: { width: 0, height: 0 },
    timetable: { width: 0, height: 0 },
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSize = () => {
    const next = {
      header: {
        width: headerRow.current?.offsetWidth || 0,
        height: headerRow.current?.offsetHeight || 0,
      },
      timetable: {
        width: timetableCell.current?.offsetWidth || 0,
        height: timetableCell.current?.offsetHeight || 0,
      },
    };
    // Keep the previous object when nothing actually moved. Storing a fresh
    // object on every ResizeObserver callback re-renders the table, which the
    // observer then sees again.
    setTableDim((previous) =>
      previous.header.width === next.header.width &&
      previous.header.height === next.header.height &&
      previous.timetable.width === next.timetable.width &&
      previous.timetable.height === next.timetable.height
        ? previous
        : next,
    );
  };

  // Check if containerRef is is resized, then update the size
  useLayoutEffect(() => {
    if (typeof window == "undefined" || !containerRef.current) return;
    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [vertical, timetableData]);

  const timetableDataWithFraction = useMemo(
    () => addTimetableFractions(timetableData),
    [timetableData],
  );
  const showSaturday = timetableData.some((course) => course.dayOfWeek >= 5);
  const showSunday = timetableData.some((course) => course.dayOfWeek == 6);

  const dayLabels = Array.from(
    { length: showSunday ? 7 : showSaturday ? 6 : 5 },
    (_, index) =>
      format(addDays(new Date(2024, 0, 1), index), "EEE", {
        locale: getLocale(language),
      }).toUpperCase(),
  );
  const days = dayLabels;
  const gridSize =
    tableDim.timetable[vertical ? "height" : "width"] *
    scheduleTimeSlots.length;
  const timetableDim = useMemo(
    () => ({
      ...tableDim,
      extendedHours: getTimetableExtendedHoursGeometry(timetableData, gridSize),
    }),
    [gridSize, tableDim, timetableData],
  );

  const _renderTimetableSlot = (
    course: CourseTimeslotDataWithFraction,
    tableDim: TimetableDim,
    vertical: boolean,
  ) => {
    return vertical ? (
      <TimetableSlotVertical
        key={
          course.dayOfWeek +
          course.startTime +
          course.endTime +
          course.course.raw_id
        }
        course={course}
        tableDim={tableDim}
        fraction={course.fraction}
        fractionIndex={course.fractionIndex}
      />
    ) : (
      <TimetableSlotHorizontal
        key={
          course.dayOfWeek +
          course.startTime +
          course.endTime +
          course.course.raw_id
        }
        course={course}
        tableDim={tableDim}
        fraction={course.fraction}
        fractionIndex={course.fractionIndex}
      />
    );
  };

  const renderVerticalBand = (
    band: NonNullable<typeof timetableDim.extendedHours>["pre"],
    key: string,
  ) => {
    if (!band) return null;
    return (
      // The height lives on the cell only. Putting an inline height on the <tr>
      // as well — alongside the h-[inherit] day cells — made the browser
      // renegotiate row heights indefinitely and hung the page whenever an
      // end-of-day region appeared.
      <tr key={key}>
        <td
          className="flex flex-col py-1 justify-between"
          style={{ height: band.size, minHeight: band.size }}
        >
          <span className="text-[10px] text-muted-foreground">
            {formatTimetableClock(band.start)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatTimetableClock(band.end)}
          </span>
        </td>
        {days.map((_, index) => (
          <td key={index} className="p-0.5 h-[inherit]">
            <BlankTimeslotBody />
          </td>
        ))}
      </tr>
    );
  };

  const renderHorizontalBandHeader = (
    band: NonNullable<typeof timetableDim.extendedHours>["pre"],
    key: string,
  ) => {
    if (!band) return null;
    return (
      <td
        key={key}
        className="p-0.5"
        style={{ width: band.size, minWidth: band.size }}
      >
        <div className="flex flex-col justify-between text-[10px] text-muted-foreground">
          <span>{formatTimetableClock(band.start)}</span>
          <span>{formatTimetableClock(band.end)}</span>
        </div>
      </td>
    );
  };

  const renderHorizontalBandCell = (
    band: NonNullable<typeof timetableDim.extendedHours>["pre"],
    key: string,
  ) => {
    if (!band) return null;
    return (
      <td
        key={key}
        className="p-0.5 h-[inherit]"
        style={{ width: band.size, minWidth: band.size }}
      >
        <BlankTimeslotBody />
      </td>
    );
  };

  if (!vertical)
    return (
      <div
        className="text-center lg:mb-0 w-full overflow-x-auto overflow-y-hidden"
        ref={containerRef}
      >
        {/* Timetable, Relative overlay */}
        <div className="relative w-full">
          <table className="table-auto w-full">
            <thead>
              <tr>
                <td className="min-w-[60px]" ref={headerRow}></td>
                {renderHorizontalBandHeader(
                  timetableDim.extendedHours?.pre,
                  "pre-band-header",
                )}
                {scheduleTimeSlots.map((time, index) => (
                  <td className="min-w-[120px] px-2" key={index}>
                    <div className="flex flex-row justify-between items-baseline  text-muted-foreground">
                      <span className="text-xs">{time.start}</span>
                      <span className="text-sm font-bold">{time.time}</span>
                      <span className="text-xs">{time.end}</span>
                    </div>
                  </td>
                ))}
                {renderHorizontalBandHeader(
                  timetableDim.extendedHours?.late,
                  "late-band-header",
                )}
              </tr>
            </thead>
            <tbody>
              {days.map((dayStr, index) => (
                <tr key={index} className="h-0.5">
                  <td className="sticky left-0 z-10 w-28 p-0.5 h-[inherit]">
                    <div className="w-full text-xs font-semibold bg-muted rounded-md h-20 flex flex-col justify-center">
                      {dayStr}
                    </div>
                  </td>
                  {renderHorizontalBandCell(
                    timetableDim.extendedHours?.pre,
                    "pre-band-cell",
                  )}
                  {scheduleTimeSlots.map((time, slot) => (
                    <td
                      key={time.time}
                      className="w-28 p-0.5 h-[inherit]"
                      ref={timetableCell}
                    >
                      <BlankTimeslotBody />
                    </td>
                  ))}
                  {renderHorizontalBandCell(
                    timetableDim.extendedHours?.late,
                    "late-band-cell",
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="absolute top-0 left-0 w-full h-full">
            {timetableDataWithFraction.map((data, index) =>
              renderTimetableSlot
                ? renderTimetableSlot(data, timetableDim, vertical)
                : _renderTimetableSlot(data, timetableDim, vertical),
            )}
          </div>
        </div>
      </div>
    );

  return (
    <div
      className="text-center lg:mb-0 w-full overflow-x-auto overflow-y-hidden"
      ref={containerRef}
    >
      {/* Timetable, Relative overlay */}
      <div className="relative w-full">
        <table className="table-fixed w-full">
          <thead>
            <tr className="h-1">
              <td className="w-[40px] min-w-[40px]" ref={headerRow}></td>
              <td className="p-0.5 h-[inherit]">
                <div className="h-full w-full text-xs font-semibold bg-muted rounded-md py-2">
                  {dayLabels[0]}
                </div>
              </td>
              <td className="p-0.5 h-[inherit]">
                <div className="h-full w-full text-xs font-semibold bg-muted rounded-md py-2">
                  {dayLabels[1]}
                </div>
              </td>
              <td className="p-0.5 h-[inherit]">
                <div className="h-full w-full text-xs font-semibold bg-muted rounded-md py-2">
                  {dayLabels[2]}
                </div>
              </td>
              <td className="p-0.5 h-[inherit]">
                <div className="h-full w-full text-xs font-semibold bg-muted rounded-md py-2">
                  {dayLabels[3]}
                </div>
              </td>
              <td className="p-0.5 h-[inherit]">
                <div className="h-full w-full text-xs font-semibold bg-muted rounded-md py-2">
                  {dayLabels[4]}
                </div>
              </td>

              {showSaturday && (
                <td className="p-0.5 h-[inherit]">
                  <div className="h-full w-full text-xs font-semibold bg-muted rounded-md py-2">
                    {dayLabels[5]}
                  </div>
                </td>
              )}
              {showSunday && (
                <td className="p-0.5 h-[inherit]">
                  <div className="h-full w-full text-xs font-semibold bg-muted rounded-md py-2">
                    {dayLabels[6]}
                  </div>
                </td>
              )}
            </tr>
          </thead>
          <tbody>
            {timetableDim.extendedHours?.pre &&
              renderVerticalBand(
                timetableDim.extendedHours.pre,
                "pre-band-row",
              )}
            {scheduleTimeSlots.map((time, index) => (
              <TimeslotHeader
                key={index}
                time={time.time}
                start={time.start}
                end={time.end}
                firstRow={index == 0}
                ref={timetableCell}
                showSaturday={showSaturday}
                showSunday={showSunday}
              />
            ))}
            {timetableDim.extendedHours?.late &&
              renderVerticalBand(
                timetableDim.extendedHours.late,
                "late-band-row",
              )}
          </tbody>
        </table>
        <div className="absolute top-0 left-0 w-full h-full">
          {timetableDataWithFraction.map((data, index) =>
            renderTimetableSlot
              ? renderTimetableSlot(data, timetableDim, vertical)
              : _renderTimetableSlot(data, timetableDim, vertical),
          )}
        </div>
      </div>
    </div>
  );
};

export default Timetable;
