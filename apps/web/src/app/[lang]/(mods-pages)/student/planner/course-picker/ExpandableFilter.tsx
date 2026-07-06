import { useMemo, useState } from "react";
import { useRefinementList } from "react-instantsearch";
import { Input } from "@courseweb/ui";
import { cn } from "@courseweb/ui";
import { Badge } from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import { Checkbox } from "@courseweb/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@courseweb/ui";
import { X } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";

type ExpandableFilterMode = "checkbox" | "simple";

type ExpandableFilterProps = {
  attribute: string;
  /**
   * "simple" (default): clicking an option immediately selects it and closes
   * the popover. "checkbox" keeps the popover open so multiple options can be
   * toggled in one interaction.
   */
  mode?: ExpandableFilterMode;
  searchable?: boolean;
  limit?: number;
  clientSearch?: boolean;
  synonyms?: Record<string, string>;
  /** @deprecated use `synonyms` (kept for older call sites that still pass `synonms`) */
  synonms?: Record<string, string>;
  placeholder?: string;
  isClassType?: boolean;
};

const ExpandableFilter = ({
  attribute,
  mode = "simple",
  searchable = false,
  limit = 10,
  clientSearch = false,
  synonyms,
  synonms,
  placeholder,
  isClassType = false,
}: ExpandableFilterProps) => {
  const dict = useDictionary();
  const resolvedSynonyms = synonyms ?? synonms ?? {};
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Use the refinement list hook
  const { refine, items, canToggleShowMore, isShowingMore, toggleShowMore } =
    useRefinementList({
      attribute,
      limit,
      escapeFacetValues: true,
    });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchQuery("");
    }
  };

  const handleItemSelect = (value: string) => {
    refine(value);
    if (mode === "simple") {
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  // For class type, handle "Required" and "Elective" separately
  const handleClassTypeSelect = (value: string) => {
    if (isClassType) {
      // Toggle off any current refinement first
      items.forEach((item) => {
        if (item.isRefined) {
          refine(item.value);
        }
      });
      // Then apply the new refinement if it's not already refined
      const selectedItem = items.find((item) => item.value === value);
      if (selectedItem && !selectedItem.isRefined) {
        refine(value);
      }
      if (mode === "simple") {
        setIsOpen(false);
        setSearchQuery("");
      }
    } else {
      handleItemSelect(value);
    }
  };

  // Memoize the filtered items to prevent unnecessary re-renders
  const filteredItems = useMemo(() => {
    if (searchable && searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase();
      return items.filter((item) => {
        const itemLabel = resolvedSynonyms[item.label] || item.label;
        return itemLabel.toLowerCase().includes(lowercaseQuery);
      });
    }
    return items;
  }, [items, searchable, searchQuery, resolvedSynonyms]);

  // Memoize the refined items to prevent re-renders
  const refinedItems = useMemo(() => {
    return items.filter((item) => item.isRefined);
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
            {refinedItems.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {refinedItems.map((item) => {
                  const label = resolvedSynonyms[item.label] || item.label;
                  return (
                    <Badge
                      key={item.value}
                      variant="outline"
                      className="mr-1 mb-1 break-words"
                    >
                      <span className="break-all whitespace-normal">
                        {label}
                      </span>
                      <button
                        type="button"
                        aria-label={`${dict.planner.coursePicker.removeFilter} ${label}`}
                        title={dict.planner.coursePicker.removeFilter}
                        className="ml-0.5 -mr-1 flex-shrink-0 flex items-center justify-center p-2 -m-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          refine(item.value);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">
                {isOpen ? "" : dict.planner.coursePicker.clickToSelect}
              </span>
            )}
            {isOpen && (
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder={placeholder ?? dict.planner.coursePicker.search}
              />
            )}
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-1 max-h-[300px] overflow-y-auto"
        align="start"
      >
        {filteredItems.length > 0 ? (
          <div className="w-full">
            {filteredItems.map((item) => {
              const label = resolvedSynonyms[item.label] || item.label;
              return mode === "checkbox" ? (
                <div
                  key={item.value}
                  className={cn(
                    "flex items-center px-2 py-1.5 text-sm rounded-sm w-full",
                    item.isRefined
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted",
                  )}
                >
                  <div className="flex items-center space-x-2 w-full">
                    <Checkbox
                      id={`${attribute}-${item.value}`}
                      checked={item.isRefined}
                      onCheckedChange={() => handleClassTypeSelect(item.value)}
                    />
                    <label
                      htmlFor={`${attribute}-${item.value}`}
                      className="flex-1 cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 break-words whitespace-normal py-1"
                    >
                      {label}{" "}
                      <span className="text-muted-foreground whitespace-normal">
                        ({item.count})
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
                <div
                  key={item.value}
                  className={cn(
                    "flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer w-full",
                    item.isRefined
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted",
                  )}
                  onClick={() => handleClassTypeSelect(item.value)}
                >
                  <div className="flex-1 break-words whitespace-normal">
                    {label}{" "}
                    <span className="text-muted-foreground whitespace-normal">
                      ({item.count})
                    </span>
                  </div>
                </div>
              );
            })}
            {canToggleShowMore && filteredItems.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleShowMore();
                }}
              >
                {isShowingMore
                  ? dict.planner.coursePicker.showLess
                  : dict.planner.coursePicker.showMore}
              </Button>
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

export default ExpandableFilter;
