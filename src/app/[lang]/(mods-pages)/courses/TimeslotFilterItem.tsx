import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useClearRefinements } from "react-instantsearch";
import { Trash } from "lucide-react";
import { Button } from "@/components/ui/button"
import { useCallback, useEffect, useState } from "react";
import TimeslotSelector from "@/components/Courses/TimeslotSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useCustomRefinementList from "./useCustomRefinementList";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { scheduleTimeSlots } from "@/const/timetable";
import useDictionary from "@/dictionaries/useDictionary";

export default ({
  searchable = false,
  clientSearch = false,
  synonms = {},
  placeholder = 'Search ...',
}: {
  searchable?: boolean;
  clientSearch?: boolean;
  synonms?: Record<string, string>;
  placeholder?: string;
}) => {

  const [mode, setMode] = useState('includes')
  const {
    items: timesItems,
    refine: timesRefine,
    searchForItems: timesSearchForItems,
  } = useCustomRefinementList({
    attribute: 'times', 
    limit: 500,
  })
  const {
    items: separateItems,
    refine: separateRefine,
    searchForItems: separateSearchForItems,
  } = useCustomRefinementList({
    attribute: 'separate_times', 
    limit: 500,
  })

  const items = mode == 'exact' ? timesItems : separateItems
  const refine = mode == 'exact' ? timesRefine : separateRefine
  const searchForItems = mode == 'exact' ? timesSearchForItems : separateSearchForItems

  const customSort = (a: string, b: string) => {
    if (a[0] == b[0]) {
      return parseInt(a.slice(1)) - parseInt(b.slice(1))
    }
    const arr = ['M', 'T', 'W', 'R', 'F', 'S']
    return arr.indexOf(a[0]) - arr.indexOf(b[0])
  }

  useEffect(() => {
    if (timeslotValue.length > 0) {
      clearRefine()
      if(mode == 'includes') {
        for (let i = 0; i < timeslotValue.length; i++) {
          refine(timeslotValue[i])
        }
      } else {
        refine([...timeslotValue].sort(customSort).join(''))
      }
    }
  }, [mode])

  const { canRefine: canClearRefine, refine: clearRefine } = useClearRefinements({
    includedAttributes: ['times', 'separate_times'],
  });

  const [searchValue, setSearchValue] = useState('')
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const search = (name: string) => {
    setSearchValue(name)
    if (!clientSearch) {
      searchForItems(name)
    }
    if (name == '') {
      const refinedItems = items.filter((item) => item.isRefined)
      setSelected(refinedItems.map((item) => item.value))
    }
  }

  const openChange = (open: boolean) => {
    if (open == true) {
      setSearching(true)
    }
    else {
      setSearching(false)
      search('')
    }
  }

  const select = (value: string) => {
    setSearchValue('')
    refine(value)
  }

  const clear = () => {
    setTimeslotValue([])
    setSelected([])
    clearRefine()
  }

  const [timeslotValue, setTimeslotValue] = useState<string[]>([])

  useEffect(() => {
    clearRefine()
    if(mode == 'includes') {
      for (let i = 0; i < timeslotValue.length; i++) {
        refine(timeslotValue[i])
      }
    } else {
      refine([...timeslotValue].sort(customSort).join(''))
    }
  }, [timeslotValue])

  const { getSemesterCourses, semester, setSemester } = useUserTimetable();
  const dict = useDictionary();

  const handleFillTimes = useCallback(() => {
    const timeslots = getSemesterCourses(semester).map(course => course.times.map(time => time.match(/.{1,2}/g) ?? [] as unknown as string[]).flat()).flat();
    const timeslotSet = new Set(timeslots);
    const timeslotList = Array.from(timeslotSet);
    const days = ['M', 'T', 'W', 'R', 'F', 'S'];
    const selectDays: string[] = [];
    scheduleTimeSlots.forEach(timeSlot => {
        days.forEach(day => {
            if (!timeslotList.includes(day + timeSlot.time)) {
                selectDays.push(day + timeSlot.time);
            }
        })
    })
    setTimeslotValue(selectDays);
  }, [getSemesterCourses, semester]);

  return <div className="flex flex-col w-full gap-1">
    <Popover modal={true} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`w-full text-left justify-start h-max`}>
          <span className="truncate">
          {searching ?
            "Selecting..." :
            (selected.length == 0 ?
              'All' :
              <div className="flex flex-col gap-1">
                {[...timeslotValue].sort(customSort).slice(0, 8).join('')}
                {timeslotValue.length > 8 && '...'}
              </div>
            )
          }
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
          <SelectValue placeholder="Mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="includes">Includes</SelectItem>
          <SelectItem value="exact">Exact</SelectItem>
        </SelectContent>
      </Select>

      <div>
        <Button variant="outline" size="icon" onClick={clear}>
          <Trash size="16" />
        </Button>
      </div>
      
    </div>

  </div>
}