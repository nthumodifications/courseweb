import { useClearRefinements } from "react-instantsearch";
import { Trash } from "lucide-react";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { useCallback, useEffect, useState } from "react";
import TimeslotSelector from "@/components/Courses/TimeslotSelector";
import useCustomRefinementList from "./useCustomRefinementList";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { scheduleTimeSlots } from "@courseweb/shared";
import useDictionary from "@/dictionaries/useDictionary";

type TimeslotFilterItemProps = {
  searchable?: boolean;
  clientSearch?: boolean;
  synonms?: Record<string, string>;
  placeholder?: string;
};

const TimeslotFilterItem = ({
  searchable = false,
  clientSearch = false,
  synonms = {},
  placeholder,
}: TimeslotFilterItemProps) => {
  const { getSemesterCourses, semester } = useUserTimetable();
  const dict = useDictionary();
  const [mode, setMode] = useState("includes");
  const {
    items: timesItems,
    refine: timesRefine,
    searchForItems: timesSearchForItems,
  } = useCustomRefinementList({
    attribute: "times",
    limit: 500,
  });
  const {
    items: separateItems,
    refine: separateRefine,
    searchForItems: separateSearchForItems,
  } = useCustomRefinementList({
    attribute: "separate_times",
    limit: 500,
  });
  const [timeslotValue, setTimeslotValue] = useState<string[]>([]);

  const { refine: clearRefine } = useClearRefinements({
    includedAttributes: ["times", "separate_times"],
  });

  const [, setSearchValue] = useState("");
  const [searching, setSearching] = useState(false);

  const items = mode == "exact" ? timesItems : separateItems;
  const refine = mode == "exact" ? timesRefine : separateRefine;
  const searchForItems =
    mode == "exact" ? timesSearchForItems : separateSearchForItems;

  const customSort = (a: string, b: string) => {
    if (a[0] == b[0]) {
      return Number.parseInt(a.slice(1)) - Number.parseInt(b.slice(1));
    }
    const arr = ["M", "T", "W", "R", "F", "S"];
    return arr.indexOf(a[0]) - arr.indexOf(b[0]);
  };

  useEffect(() => {
    clearRefine();
    if (mode == "includes") {
      for (let i = 0; i < timeslotValue.length; i++) {
        refine(timeslotValue[i]);
      }
    } else {
      refine([...timeslotValue].sort(customSort).join(""));
    }
  }, [mode, timeslotValue, clearRefine, refine]);

  const search = (name: string) => {
    setSearchValue(name);
    if (!clientSearch) {
      searchForItems(name);
    }
  };

  const openChange = (open: boolean) => {
    if (open == true) {
      setSearching(true);
    } else {
      setSearching(false);
      search("");
    }
  };

  const clear = () => {
    setTimeslotValue([]);
    clearRefine();
  };

  const handleFillTimes = useCallback(() => {
    const timeslots = getSemesterCourses(semester).flatMap((course) =>
      course.times.flatMap(
        (time) => time.match(/.{1,2}/g) ?? ([] as unknown as string[]),
      ),
    );
    const timeslotSet = new Set(timeslots);
    const timeslotList = Array.from(timeslotSet);
    const days = ["M", "T", "W", "R", "F", "S"];
    const selectDays: string[] = [];
    scheduleTimeSlots.forEach((timeSlot) => {
      days.forEach((day) => {
        if (!timeslotList.includes(day + timeSlot.time)) {
          selectDays.push(day + timeSlot.time);
        }
      });
    });
    setTimeslotValue(selectDays);
  }, [getSemesterCourses, semester]);

  return (
    <div className="flex flex-col w-full gap-1">
      <Popover modal={true} onOpenChange={openChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="min-w-0 w-full justify-start h-max text-left"
          >
            <span className="min-w-0 whitespace-normal">
              {searching ? (
                dict.common.selecting
              ) : timeslotValue.length == 0 ? (
                dict.common.all
              ) : (
                <div className="flex flex-col gap-1">
                  {[...timeslotValue].sort(customSort).slice(0, 8).join("")}
                  {timeslotValue.length > 8 && "..."}
                </div>
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-4 w-max h-max" align="start">
          <TimeslotSelector value={timeslotValue} onChange={setTimeslotValue} />
        </PopoverContent>
      </Popover>

      <div className="flex gap-1">
        <Button variant="outline" onClick={handleFillTimes}>
          {dict.course.refine.timetable_empty}
        </Button>

        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger>
            <SelectValue placeholder={dict.course.refine.mode} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="includes">
              {dict.course.refine.includes}
            </SelectItem>
            <SelectItem value="exact">{dict.course.refine.exact}</SelectItem>
          </SelectContent>
        </Select>

        <div>
          <Button variant="outline" size="icon" onClick={clear}>
            <Trash size="16" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TimeslotFilterItem;
