import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import useCustomRefinementList from "./useCustomRefinementList";
import { getFormattedClassCode } from "@/helpers/courses";
import useCustomMenu from '@/app/[lang]/(mods-pages)/courses/useCustomMenu';
import { lastSemester } from "@/const/semester";

const ClassRefinementItem =  ({
  limit = 10,
  searchable = false,
  clientSearch = false,
  placeholder = 'Search ...',
  defaultSearch = '',
}: {
  limit?: number;
  searchable?: boolean;
  clientSearch?: boolean;
  placeholder?: string;
  defaultSearch?: string;
}) => {

  const {
    items: compulsoryItems,
    refine: refineCompulsory,
    searchForItems: searchForCompulsory,
    canToggleShowMore: canToggleShowMoreCompulsory,
    isShowingMore: isShowingMoreCompulsory,
    toggleShowMore: toggleShowMoreCompulsory,
  } = useCustomRefinementList({
    attribute: 'compulsory_for',
    limit: limit,
  })

  const {
    items: electiveItems,
    refine: refineElective,
    searchForItems: searchForElective,
    canToggleShowMore: canToggleShowMoreElective,
    isShowingMore: isShowingMoreElective,
    toggleShowMore: toggleShowMoreElective,
  } = useCustomRefinementList({
    attribute: 'elective_for',
    limit: limit,
  })
  
  const { 
    items: semesterItem,
    refine,
    canRefine,
   } = useCustomMenu({
    attribute: 'semester',
  });

  const selectedSemester = semesterItem.find(item => item.isRefined)?.value ?? lastSemester.id;
  
  const searchParams = useSearchParams()
  useEffect(() => {
    const refinedCompulsory = compulsoryItems.filter((item) => item.isRefined)
    const refinedElective = electiveItems.filter((item) => item.isRefined)
    // const merged = [...refinedCompulsory, ...refinedElective]
    // merge but remove duplicates
    const merged = [...refinedCompulsory, ...refinedElective.filter((item) => !refinedCompulsory.some((i) => i.value == item.value))]
    setSelected(merged.map((item) => item.value))
  }, [compulsoryItems, electiveItems, searchParams])

  //sort by name
  const items = [...compulsoryItems, ...electiveItems.filter((item) => !compulsoryItems.some((i) => i.value == item.value))].sort((a, b) => {
    if (a.label < b.label) return -1
    if (a.label > b.label) return 1
    return 0
  })
  
  const [searchValue, setSearchValue] = useState('')
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const search = (name: string) => {
    setSearchValue(name)
    if (!clientSearch) {
    //   searchForItems(name)
        searchForCompulsory(name)
        searchForElective(name)
    }
    if (name == '') {
        const refinedCompulsory = compulsoryItems.filter((item) => item.isRefined)
        const refinedElective = electiveItems.filter((item) => item.isRefined)
        const merged = [...refinedCompulsory, ...refinedElective.filter((item) => !refinedCompulsory.some((i) => i.value == item.value))]
        setSelected(merged.map((item) => item.value))
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
    // refine(value)
    refineCompulsory(value)
    refineElective(value)
  }

  const clear = () => {
    selected.forEach((value) => {
    //   refine(value)
        refineCompulsory(value)
        refineElective(value)
    })
  }

  return <Popover modal={true} onOpenChange={openChange}>
      <Button variant="outline" className={`w-full justify-start h-max p-0`}>
        <PopoverTrigger asChild>
          <div className="flex-1 text-left px-4 py-2">
          {searching ?
            "Selecting..." :
            (selected.length == 0 ? 
              'All' :
              <div className="flex flex-col gap-1">
                {selected.map(i => 
                  <Badge variant="outline" className="">
                    {getFormattedClassCode(i, selectedSemester)}
                  </Badge>
                )}
              </div>
            )
          }
          </div>
        </PopoverTrigger>
        {selected.length > 0 && <X className="px-2 w-8 h-6 cursor-pointer" onClick={clear}/>}
      </Button>
      
    
    <PopoverContent className="p-0" align="start">
      <Command shouldFilter={clientSearch}>
        {searchable && 
          <CommandInput
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={512}
            value={searchValue}
            onValueChange={(value) => search(value)}
            placeholder={placeholder}
          />
        }
        <ScrollArea className="h-[300px]">
          <CommandList className="max-h-none">
            <CommandEmpty>No results found.</CommandEmpty>
            {items.sort((a, b) => {
              if (a.isRefined) return -1
              if (b.isRefined) return 1
              return 0
            }).map((item) => (
              <CommandItem
                className="cursor-pointer"
                key={item.label}
                onSelect={() => select(item.value)}
              >
                <div className="flex w-full items-center">
                  <div className="ml-1 mr-2">
                    <Check size={16} className={`${item.isRefined ? '' : 'opacity-0'}`} />
                  </div>
                  <span className="mr-4">
                    {getFormattedClassCode(item.label, selectedSemester)}
                  </span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </ScrollArea>
      </Command>
    </PopoverContent>
  </Popover>
}

export default ClassRefinementItem;