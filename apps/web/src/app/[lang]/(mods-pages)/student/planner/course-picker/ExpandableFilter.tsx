import { useMemo, useState } from "react";
import { useRefinementList } from "react-instantsearch";
import {
  Badge,
  Button,
  Checkbox,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from "@courseweb/ui";
import { X } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import { activateOnKey } from "@/lib/activate-on-key";

type ExpandableFilterMode = "checkbox" | "simple";

export type RefinementItem = {
  label: string;
  value: string;
  count: number;
  isRefined: boolean;
};

export type ExpandableFilterGroup = {
  group: string;
  items: RefinementItem[];
};

export const getVisibleExpandableFilterItems = (
  items: RefinementItem[],
  hideZeroCount: boolean,
) =>
  hideZeroCount
    ? items.filter((item) => item.count > 0 || item.isRefined)
    : items;

export const shouldHideExpandableFilter = (
  items: RefinementItem[],
  hideWhenEmpty: boolean,
  hideZeroCount: boolean,
) =>
  hideWhenEmpty &&
  getVisibleExpandableFilterItems(items, hideZeroCount).length === 0;

export const getExpandableFilterLabel = (
  item: RefinementItem,
  synonyms: Record<string, string>,
  synonymsOnly: boolean,
) => {
  const synonym = synonymsOnly
    ? (synonyms[item.value] ?? synonyms[item.label])
    : synonyms[item.label];
  return synonym ?? item.label;
};

export const groupExpandableFilterItems = (
  items: RefinementItem[],
  groupBy: (item: RefinementItem) => string,
  groupOrder?: readonly string[],
): ExpandableFilterGroup[] => {
  const groups = new Map<string, RefinementItem[]>();
  items.forEach((item) => {
    const group = groupBy(item);
    const groupItems = groups.get(group) ?? [];
    groupItems.push(item);
    groups.set(group, groupItems);
  });

  return (groupOrder ?? [...groups.keys()])
    .map((group) => ({ group, items: groups.get(group) ?? [] }))
    .filter(({ items: groupItems }) => groupItems.length > 0);
};

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
  title?: string;
  hideWhenEmpty?: boolean;
  hideZeroCount?: boolean;
  synonymsOnly?: boolean;
  selectedFirst?: boolean;
  sortFn?: (left: RefinementItem, right: RefinementItem) => number;
  groupBy?: (item: RefinementItem) => string;
  groupLabels?: Record<string, string>;
  groupOrder?: readonly string[];
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
  title,
  hideWhenEmpty = false,
  hideZeroCount = false,
  synonymsOnly = false,
  selectedFirst = false,
  sortFn,
  groupBy,
  groupLabels = {},
  groupOrder,
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

  const visibleItems = useMemo(
    () => getVisibleExpandableFilterItems(items, hideZeroCount),
    [items, hideZeroCount],
  );

  // Memoize the filtered items to prevent unnecessary re-renders
  const filteredItems = useMemo(() => {
    if (searchable && searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase();
      return visibleItems.filter((item) => {
        const itemLabel = getExpandableFilterLabel(
          item,
          resolvedSynonyms,
          synonymsOnly,
        );
        return itemLabel.toLowerCase().includes(lowercaseQuery);
      });
    }
    return visibleItems;
  }, [searchable, searchQuery, resolvedSynonyms, synonymsOnly, visibleItems]);

  const orderedItems = useMemo(() => {
    if (!selectedFirst && !sortFn) return filteredItems;

    return [...filteredItems].sort((left, right) => {
      if (selectedFirst && left.isRefined !== right.isRefined) {
        return left.isRefined ? -1 : 1;
      }
      return sortFn?.(left, right) ?? 0;
    });
  }, [filteredItems, selectedFirst, sortFn]);

  const groupedItems = useMemo(
    () =>
      groupBy
        ? groupExpandableFilterItems(orderedItems, groupBy, groupOrder)
        : null,
    [groupBy, groupOrder, orderedItems],
  );

  // Memoize the refined items to prevent unnecessary re-renders
  const refinedItems = useMemo(() => {
    return items.filter((item) => item.isRefined);
  }, [items]);

  if (shouldHideExpandableFilter(items, hideWhenEmpty, hideZeroCount)) {
    return null;
  }

  const getItemLabel = (item: RefinementItem) =>
    getExpandableFilterLabel(item, resolvedSynonyms, synonymsOnly);

  const renderGroupedItem = (item: RefinementItem) => (
    <CommandItem
      key={item.value}
      value={item.value}
      className="flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer w-full"
      onSelect={() => handleClassTypeSelect(item.value)}
    >
      <div className="flex-1 break-words whitespace-normal">
        {getItemLabel(item)}{" "}
        <span className="text-muted-foreground whitespace-normal">
          ({item.count})
        </span>
      </div>
    </CommandItem>
  );

  const filter = (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={isOpen}
          className={cn(
            "flex items-center border rounded-md px-3 py-2 min-h-11 cursor-text w-full text-left",
            isOpen ? "ring-2 ring-primary" : "hover:border-primary/50",
          )}
        >
          <div className="flex flex-1 flex-wrap gap-1 items-center">
            {refinedItems.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {refinedItems.map((item) => {
                  const label = getItemLabel(item);
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
                aria-label={placeholder ?? dict.planner.coursePicker.search}
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
          groupedItems ? (
            <Command
              shouldFilter={false}
              className="h-auto w-full overflow-visible rounded-none bg-transparent"
            >
              {groupedItems.length > 0 ? (
                groupedItems.map(({ group, items: groupItems }) => (
                  <CommandGroup
                    key={group}
                    heading={groupLabels[group] ?? group}
                  >
                    {groupItems.map(renderGroupedItem)}
                  </CommandGroup>
                ))
              ) : (
                <CommandEmpty>
                  {dict.planner.coursePicker.noResultsFound}
                </CommandEmpty>
              )}
            </Command>
          ) : (
            <div className="w-full">
              {filteredItems.map((item) => {
                const label = getItemLabel(item);
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
                        onCheckedChange={() =>
                          handleClassTypeSelect(item.value)
                        }
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
                    onKeyDown={activateOnKey(() =>
                      handleClassTypeSelect(item.value),
                    )}
                    role="button"
                    tabIndex={0}
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
          )
        ) : (
          <div className="p-2 text-sm text-center text-muted-foreground">
            {dict.planner.coursePicker.noResultsFound}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );

  return title ? (
    <div className="flex flex-col gap-2">
      <span className="text-sm">{title}</span>
      {filter}
    </div>
  ) : (
    filter
  );
};

export default ExpandableFilter;
