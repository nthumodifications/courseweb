import { useEffect, useMemo, useState, useCallback } from "react";
import { X } from "lucide-react";
import { Input } from "@courseweb/ui";
import { cn } from "@courseweb/ui";
import { Badge } from "@courseweb/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@courseweb/ui";
import useCustomRefinementList from "@/app/[lang]/(mods-pages)/courses/useCustomRefinementList";
import useCustomMenu from "@/app/[lang]/(mods-pages)/courses/useCustomMenu";
import { lastSemester } from "@courseweb/shared";
import { getFormattedClassCode } from "@/helpers/courses";
import useDictionary from "@/dictionaries/useDictionary";

type ExpandableClassFilterProps = {
  limit?: number;
  placeholder?: string;
};

const ExpandableClassFilter = ({
  limit = 20,
  placeholder,
}: ExpandableClassFilterProps) => {
  const dict = useDictionary();
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Get classes and semester information
  const { items, refine, searchForItems } = useCustomRefinementList({
    attribute: "for_class",
    limit: limit,
  });

  const { items: semesterItems } = useCustomMenu({
    attribute: "semester",
  });

  const selectedSemester = useMemo(
    () =>
      semesterItems.find((item) => item.isRefined)?.value ?? lastSemester.id,
    [semesterItems],
  );

  // Track selected items
  const [selected, setSelected] = useState<string[]>([]);

  // Update selected items when items change
  useEffect(() => {
    const refinedItems = items.filter((item) => item.isRefined);
    setSelected(refinedItems.map((item) => item.value));
  }, [items]);

  // Handle search
  const handleSearch = useCallback(
    (query: string) => {
      setSearchValue(query);
      searchForItems(query);
    },
    [searchForItems],
  );

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchValue("");
      handleSearch("");
    }
  };

  const handleItemSelect = (value: string) => {
    refine(value);
    // Don't close the dropdown to allow multiple selections
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    selected.forEach((value) => {
      refine(value);
    });
  };

  // Filter items based on search
  const filteredItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.isRefined) return -1;
      if (b.isRefined) return 1;
      return 0;
    });
  }, [items]);

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center border rounded-md px-3 py-2 min-h-11 cursor-text w-full text-left",
            isOpen ? "ring-2 ring-primary" : "hover:border-primary/50",
          )}
        >
          <div className="flex flex-1 flex-wrap gap-1 items-center">
            {selected.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selected.map((value) => (
                  <Badge
                    key={value}
                    variant="outline"
                    className="mr-1 mb-1 whitespace-nowrap"
                  >
                    {getFormattedClassCode(value, selectedSemester, "zh")}
                    <button
                      type="button"
                      aria-label={dict.planner.coursePicker.removeFilter}
                      title={dict.planner.coursePicker.removeFilter}
                      className="ml-0.5 -mr-1 flex-shrink-0 flex items-center justify-center p-2 -m-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        refine(value);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">
                {isOpen ? "" : dict.planner.coursePicker.all}
              </span>
            )}
            {isOpen && (
              <Input
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder={
                  placeholder ?? dict.planner.coursePicker.searchForCourses
                }
              />
            )}
          </div>
          {selected.length > 0 && (
            <button
              type="button"
              aria-label={dict.planner.coursePicker.clearAll}
              title={dict.planner.coursePicker.clearAll}
              className="ml-2 flex-shrink-0 flex items-center justify-center p-2.5 -m-1.5"
              onClick={handleClearAll}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-1 max-h-60 overflow-y-auto"
        align="start"
      >
        {filteredItems.length > 0 ? (
          <div>
            {filteredItems.map((item) => (
              <div
                key={item.value}
                className={cn(
                  "flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer",
                  item.isRefined
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted",
                )}
                onClick={() => handleItemSelect(item.value)}
              >
                <div className="flex-1">
                  {getFormattedClassCode(item.label, selectedSemester, "zh")}{" "}
                  <span className="text-muted-foreground">({item.count})</span>
                </div>
              </div>
            ))}
            {filteredItems.length >= limit && (
              <div className="p-2 text-sm text-center text-muted-foreground">
                {dict.planner.coursePicker.typeToSearchForMoreOptions}
              </div>
            )}
          </div>
        ) : (
          <div className="p-2 text-sm text-center text-muted-foreground">
            {dict.planner.coursePicker.noResultsFound}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default ExpandableClassFilter;
