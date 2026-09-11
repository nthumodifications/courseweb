import TimeslotHeader from "@/components/Timetable/TimeslotHeader";
import TimetableSlotVertical from "@/components/Timetable/TimetableSlotVertical";
import { scheduleTimeSlots } from "@courseweb/shared";
import { addDays, format } from "date-fns";
import {
  CourseTimeslotData,
  CourseTimeslotDataWithFraction,
  TimeSlot,
  TimetableDim,
} from "@/types/timetable";
import {
  FC,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import TimetableSlotHorizontal from "@/components/Timetable/TimetableSlotHorizontal";
import { Link } from "react-router-dom";
import { useSettings } from "@/hooks/contexts/settings";
import { BlankTimeslotBody } from "./BlankTimeslotBody";
import { getLocale } from "@/helpers/dateLocale";
import {
  addTimetableFractions,
  isTimetableGridSlot,
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
    setTableDim({
      header: {
        width: headerRow.current?.offsetWidth || 0,
        height: headerRow.current?.offsetHeight || 0,
      },
      timetable: {
        width: timetableCell.current?.offsetWidth || 0,
        height: timetableCell.current?.offsetHeight || 0,
      },
    });
  };

  // Check if containerRef is is resized, then update the size
  useLayoutEffect(() => {
    if (typeof window == "undefined" || !containerRef.current) return;
    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [vertical, timetableData]);

  const gridTimetableData = useMemo(
    () => timetableData.filter(isTimetableGridSlot),
    [timetableData],
  );
  const timetableDataWithFraction = useMemo(
    () => addTimetableFractions(gridTimetableData),
    [gridTimetableData],
  );
  const showSaturday = gridTimetableData.some(
    (course) => course.dayOfWeek >= 5,
  );
  const showSunday = gridTimetableData.some((course) => course.dayOfWeek == 6);

  const dayLabels = Array.from(
    { length: showSunday ? 7 : showSaturday ? 6 : 5 },
    (_, index) =>
      format(addDays(new Date(2024, 0, 1), index), "EEE", {
        locale: getLocale(language),
      }).toUpperCase(),
  );
  const days = dayLabels;

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
                {scheduleTimeSlots.map((time, index) => (
                  <td className="min-w-[120px] px-2" key={index}>
                    <div className="flex flex-row justify-between items-baseline  text-muted-foreground">
                      <span className="text-xs">{time.start}</span>
                      <span className="text-sm font-bold">{time.time}</span>
                      <span className="text-xs">{time.end}</span>
                    </div>
                  </td>
                ))}
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
                  {scheduleTimeSlots.map((time, slot) => (
                    <td
                      key={time.time}
                      className="w-28 p-0.5 h-[inherit]"
                      ref={timetableCell}
                    >
                      <BlankTimeslotBody />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="absolute top-0 left-0 w-full h-full">
            {timetableDataWithFraction.map((data, index) =>
              renderTimetableSlot
                ? renderTimetableSlot(data, tableDim, vertical)
                : _renderTimetableSlot(data, tableDim, vertical),
            )}
          </div>
        </div>
      </div>
    );

  return (
    <div
      className="text-center lg:mb-0 w-full overflow-hidden"
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
            {scheduleTimeSlots.map((time, index) => (
              <TimeslotHeader
                key={index}
                time={time.time}
                start={time.start}
                end={time.end}
                firstRow={index == 0}
                ref={timetableCell}
                showSaturday={showSaturday}
              />
            ))}
          </tbody>
        </table>
        <div className="absolute top-0 left-0 w-full h-full">
          {timetableDataWithFraction.map((data, index) =>
            renderTimetableSlot
              ? renderTimetableSlot(data, tableDim, vertical)
              : _renderTimetableSlot(data, tableDim, vertical),
          )}
        </div>
      </div>
    </div>
  );
};

export default Timetable;
