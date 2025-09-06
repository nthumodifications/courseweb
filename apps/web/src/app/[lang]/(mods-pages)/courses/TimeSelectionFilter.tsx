"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  useRefinementList,
  useClearRefinements,
  useInstantSearch,
} from "react-instantsearch";
import { Check, Trash } from "lucide-react";
import { cn } from "@courseweb/ui";
import { Badge } from "@courseweb/ui";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { scheduleTimeSlots } from "@/const/timetable";
import { MinimalCourse } from "@/types/courses";

type TimeSelectionFilterProps = {
  attribute: string;
  selectedCourses?: MinimalCourse[];
};

const TimeSelectionFilter = ({
  attribute,
  selectedCourses = [],
}: TimeSelectionFilterProps) => {
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isRealDrag, setIsRealDrag] = useState(false);
  const [startCell, setStartCell] = useState<{
    day: number;
    period: string;
  } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    day: number;
    period: string;
  } | null>(null);
  const [mode, setMode] = useState("includes");

  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [pendingSlots, setPendingSlots] = useState<string[]>([]);

  const { refine, items, createURL } = useRefinementList({
    attribute,
    limit: 100,
    escapeFacetValues: true,
    operator: mode === "exact" ? "and" : "or",
  });

  const { setIndexUiState } = useInstantSearch();

  const days = useMemo(() => ["M", "T", "W", "R", "F", "S"], []);
  const periods = useMemo(() => scheduleTimeSlots.map((slot) => slot.time), []);

  useEffect(() => {
    const refinedValues = items
      .filter((item) => item.isRefined)
      .map((item) => item.value);
    setSelectedSlots(refinedValues);
    setPendingSlots(refinedValues);
  }, [items]);

  const formatTimeValue = useCallback(
    (day: number, period: string) => {
      return `${days[day]}${period}`;
    },
    [days],
  );

  const isPendingSelected = useCallback(
    (day: number, period: string) => {
      const value = formatTimeValue(day, period);
      return pendingSlots.includes(value);
    },
    [pendingSlots, formatTimeValue],
  );

  const isInDragSelection = useCallback(
    (day: number, period: string) => {
      if (!isDragging || !startCell || !hoveredCell) return false;

      const startDay = Math.min(startCell.day, hoveredCell.day);
      const endDay = Math.max(startCell.day, hoveredCell.day);

      const startPeriodIndex = periods.indexOf(startCell.period);
      const endPeriodIndex = periods.indexOf(hoveredCell.period);
      const minPeriodIndex = Math.min(startPeriodIndex, endPeriodIndex);
      const maxPeriodIndex = Math.max(startPeriodIndex, endPeriodIndex);

      const periodIndex = periods.indexOf(period);

      return (
        day >= startDay &&
        day <= endDay &&
        periodIndex >= minPeriodIndex &&
        periodIndex <= maxPeriodIndex
      );
    },
    [isDragging, startCell, hoveredCell, periods],
  );

  const toggleTimeSlot = useCallback((value: string) => {
    setPendingSlots((prev) =>
      prev.includes(value)
        ? prev.filter((slot) => slot !== value)
        : [...prev, value],
    );
  }, []);

  const handleMouseDown = (day: number, period: string) => {
    setIsDragging(true);
    setIsRealDrag(false);
    setStartCell({ day, period });
    setHoveredCell({ day, period });
  };

  const handleMouseMove = (day: number, period: string) => {
    if (isDragging) {
      if (startCell && (startCell.day !== day || startCell.period !== period)) {
        setIsRealDrag(true);
      }
      setHoveredCell({ day, period });
    }
  };

  const handleMouseUp = useCallback(() => {
    if (isDragging && startCell && hoveredCell) {
      if (isRealDrag) {
        const startDay = Math.min(startCell.day, hoveredCell.day);
        const endDay = Math.max(startCell.day, hoveredCell.day);

        const startPeriodIndex = periods.indexOf(startCell.period);
        const endPeriodIndex = periods.indexOf(hoveredCell.period);
        const minPeriodIndex = Math.min(startPeriodIndex, endPeriodIndex);
        const maxPeriodIndex = Math.max(startPeriodIndex, endPeriodIndex);

        const cellsToToggle: string[] = [];

        for (let day = startDay; day <= endDay; day++) {
          for (let i = minPeriodIndex; i <= maxPeriodIndex; i++) {
            const period = periods[i];
            const value = formatTimeValue(day, period);
            cellsToToggle.push(value);
          }
        }

        const firstCellSelected = isPendingSelected(
          startCell.day,
          startCell.period,
        );

        if (firstCellSelected) {
          setPendingSlots((currentPendingSlots) => {
            return currentPendingSlots.filter(
              (slot) => !cellsToToggle.includes(slot),
            );
          });
        } else {
          setPendingSlots((currentPendingSlots) => {
            const newPendingSlots = [...currentPendingSlots];
            cellsToToggle.forEach((cell) => {
              if (!newPendingSlots.includes(cell)) {
                newPendingSlots.push(cell);
              }
            });
            return newPendingSlots;
          });
        }
      } else {
        const value = formatTimeValue(startCell.day, startCell.period);
        toggleTimeSlot(value);
      }
    }

    setIsDragging(false);
    setIsRealDrag(false);
    setStartCell(null);
    setHoveredCell(null);
  }, [
    isDragging,
    isRealDrag,
    startCell,
    hoveredCell,
    periods,
    isPendingSelected,
    formatTimeValue,
    toggleTimeSlot,
  ]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("mousemove", handleGlobalMouseMove);

    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, [isDragging, handleMouseUp]);

  const handleApply = () => {
    setIndexUiState((prevUiState) => {
      return {
        ...prevUiState,
        refinementList: {
          ...prevUiState.refinementList,
          [attribute]: pendingSlots.length > 0 ? pendingSlots : [],
        },
      };
    });

    setSelectedSlots([...pendingSlots]);
    setOpen(false);
  };

  const handleCancel = () => {
    setPendingSlots(selectedSlots);
    setOpen(false);
  };

  const handleClear = () => {
    setPendingSlots([]);
  };

  const customSort = (a: string, b: string) => {
    if (a[0] === b[0]) {
      return periods.indexOf(a.substring(1)) - periods.indexOf(b.substring(1));
    }
    return days.indexOf(a[0]) - days.indexOf(b[0]);
  };

  const getSelectedTimesDisplay = () => {
    if (selectedSlots.length === 0) return null;

    const sortedTimes = [...selectedSlots].sort(customSort);

    const groupedByDay = days
      .map((day) => {
        const dayTimes = sortedTimes.filter((time) => time.startsWith(day));
        if (dayTimes.length === 0) return null;

        return {
          day,
          periods: dayTimes.map((time) => time.substring(1)),
        };
      })
      .filter(Boolean);

    return (
      <div className="flex flex-wrap gap-1">
        {groupedByDay.map((group) => (
          <Badge key={group?.day} variant="outline" className="mr-1 mb-1">
            {group?.day}: {group?.periods.join(", ")}
          </Badge>
        ))}
      </div>
    );
  };

  const occupiedTimeSlots = useMemo(() => {
    const occupied = new Set<string>();

    selectedCourses.forEach((course) => {
      course.times.forEach((timeString) => {
        const timeSlots = timeString.match(/.{1,2}/g) || [];
        timeSlots.forEach((slot) => {
          occupied.add(slot);
        });
      });
    });

    return occupied;
  }, [selectedCourses]);

  const handleFillEmpty = () => {
    const allTimeSlots: string[] = [];
    days.forEach((day, dayIndex) => {
      periods.forEach((period) => {
        const timeValue = formatTimeValue(dayIndex, period);
        if (!occupiedTimeSlots.has(timeValue)) {
          allTimeSlots.push(timeValue);
        }
      });
    });

    const availableEmptySlots = allTimeSlots.filter((slot) =>
      items.some((item) => item.value === slot),
    );

    setPendingSlots(availableEmptySlots);
  };

  return (
    <div className="relative w-full">
      <Dialog
        open={open}
        onOpenChange={(newOpen) => {
          if (newOpen) {
            setPendingSlots(selectedSlots);
          }
          setOpen(newOpen);
        }}
      >
        <DialogTrigger asChild>
          <div
            className={cn(
              "flex items-center border rounded-md px-3 py-2 cursor-pointer",
              open ? "ring-2 ring-primary" : "hover:border-primary/50",
              selectedSlots.length > 0 ? "bg-primary/10" : "bg-transparent",
            )}
          >
            <div className="flex flex-1 flex-wrap gap-1 items-center">
              {selectedSlots.length > 0 ? (
                <span className="text-sm text-primary">
                  {selectedSlots.length} Time Slots Selected
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">
                  Select class time...
                </span>
              )}
            </div>
          </div>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>上課時間</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1">
            <div className="flex flex-col rounded-lg border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-sm">嚴格搜尋時段</span>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger className="w-[80px] h-7">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="includes">否</SelectItem>
                      <SelectItem value="exact">是</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleFillEmpty}
                    size="sm"
                    className="text-xs h-7"
                    title="Fill all slots that aren't used by your selected courses"
                  >
                    Fill Empty Slots
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleClear}
                    className="h-7 w-7"
                  >
                    <Trash size="14" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-0 select-none">
                <div className="p-2 text-center font-medium text-sm text-muted-foreground border-b border-r"></div>
                {days.map((day) => (
                  <div
                    key={day}
                    className="p-2 text-center font-medium border-b"
                  >
                    {day}
                  </div>
                ))}

                {periods.map((period) => (
                  <Fragment key={period}>
                    <div className="p-2 text-center border-r text-xs font-medium">
                      {period}
                    </div>

                    {days.map((day, dayIndex) => {
                      const timeValue = formatTimeValue(dayIndex, period);
                      const selected = pendingSlots.includes(timeValue);
                      const inDragSelection = isInDragSelection(
                        dayIndex,
                        period,
                      );
                      const isOccupied = occupiedTimeSlots.has(timeValue);

                      return (
                        <div
                          key={`${day}${period}`}
                          className={cn(
                            "flex items-center justify-center border p-0 transition-colors text-neutral-500",
                            selected
                              ? "bg-primary/20"
                              : inDragSelection
                                ? "bg-primary/10"
                                : isOccupied
                                  ? "bg-gray-200 dark:bg-neutral-800"
                                  : "hover:bg-muted",
                            isDragging ? "cursor-crosshair" : "cursor-pointer",
                          )}
                          title={
                            isOccupied
                              ? "This time slot is used by a selected course"
                              : ""
                          }
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleMouseDown(dayIndex, period);
                          }}
                          onMouseEnter={() => {
                            handleMouseMove(dayIndex, period);
                          }}
                        >
                          {period}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="text-xs text-center text-muted-foreground mt-2">
            {pendingSlots.length > 0 && (
              <span>{pendingSlots.length} selected</span>
            )}
          </div>

          <DialogFooter className="flex justify-between gap-2 pt-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply <Check className="ml-1 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeSelectionFilter;
