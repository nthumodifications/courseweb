import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useClearRefinements, useRefinementList } from "react-instantsearch"
import type { RefinementListItem } from 'instantsearch.js/es/connectors/refinement-list/connectRefinementList';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Check, Trash, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react";
import TimeslotSelector from "@/components/Courses/TimeslotSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  let {
    items,
    refine,
    searchForItems,
    canToggleShowMore,
    isShowingMore,
    toggleShowMore,
  } = useRefinementList({
    attribute: 'separate_times',
    limit: 500,
  })


  const [mode, setMode] = useState('includes')

  // useEffect(() => {
  //   ({
  //     items,
  //     refine,
  //     searchForItems,
  //     canToggleShowMore,
  //     isShowingMore,
  //     toggleShowMore,
  //   } = useRefinementList({
  //     attribute: mode == 'within' ? 'times' : 'separate_times',
  //     limit: 500,
  //   }))
  // }, [mode])

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
      console.log('hello')
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

  const [timeslotValue, setTimeslotValue] = useState<string[]>([])

  useEffect(() => {
    clearRefine()
    for (let i = 0; i < timeslotValue.length; i++) {
      refine(timeslotValue[i])
    }
  }, [timeslotValue])

  return <div className="flex flex-col w-full">
    <Popover modal={true} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`w-full text-left justify-start h-max`}>
          <span className="w-56 truncate">
          {searching ?
            "Selecting..." :
            (selected.length == 0 ?
              'All' :
              <div className="flex flex-col gap-1">
                {selected.join('')}
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

    <div className="flex">
      <Button variant="outline">
        Empty time
      </Button>

      <Select value={mode} onValueChange={setMode}>
        <SelectTrigger>
          <SelectValue placeholder="Mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="includes">Includes</SelectItem>
          <SelectItem value="within">Within</SelectItem>
        </SelectContent>
      </Select>

      <div>
        <Button variant="outline" size="icon" onClick={() => {
          setTimeslotValue([])
          setSelected([])
          clearRefine()
        }}>
          <Trash size="16" />
        </Button>
      </div>
      
    </div>

  </div>
}