"use client";

import { useMemo } from "react";
import { useRefinementList } from "react-instantsearch";
import { Checkbox } from "@courseweb/ui";
import { cn } from "@courseweb/ui";
import { Button } from "@courseweb/ui";

type RefinementItem = {
  label: string;
  value: string;
  count: number;
  isRefined: boolean;
};

type InlineCheckboxFilterProps = {
  attribute: string;
  limit?: number;
  synonms?: Record<string, string>;
  isClassType?: boolean;
  // Custom filter function to filter items
  filterFn?: (items: RefinementItem[]) => RefinementItem[];
  // Custom sort function to sort items
  sortFn?: (items: RefinementItem[]) => RefinementItem[];
};

const InlineCheckboxFilter = ({
  attribute,
  limit = 10,
  synonms = {},
  isClassType = false,
  filterFn,
  sortFn,
}: InlineCheckboxFilterProps) => {
  // Use the refinement list hook
  const { refine, items, canToggleShowMore, isShowingMore, toggleShowMore } =
    useRefinementList({
      attribute,
      limit,
      escapeFacetValues: true,
    });

  const handleItemToggle = (value: string) => {
    refine(value);
  };

  // For class type, handle "Required" and "Elective" separately
  const handleClassTypeToggle = (value: string) => {
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
    } else {
      handleItemToggle(value);
    }
  };

  // Apply custom filtering and sorting if provided
  const processedItems = useMemo(() => {
    let result = [...items];

    // Apply custom filter if provided
    if (filterFn) {
      result = filterFn(result);
    }

    // Apply custom sort if provided
    if (sortFn) {
      result = sortFn(result);
    }

    return result;
  }, [items, filterFn, sortFn]);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {processedItems.map((item) => (
          <div
            key={item.value}
            className={cn(
              "flex items-center space-x-2 py-1",
              item.isRefined && "text-primary",
            )}
          >
            <Checkbox
              id={`${attribute}-${item.value}`}
              checked={item.isRefined}
              onCheckedChange={() => handleClassTypeToggle(item.value)}
            />
            <label
              htmlFor={`${attribute}-${item.value}`}
              className="text-sm cursor-pointer flex items-center"
            >
              <span className="mr-1">{synonms[item.label] || item.label}</span>
              <span className="text-muted-foreground text-xs">
                ({item.count})
              </span>
            </label>
          </div>
        ))}
      </div>
      {canToggleShowMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-1"
          onClick={() => toggleShowMore()}
        >
          {isShowingMore ? "Show less" : "Show more"}
        </Button>
      )}
    </div>
  );
};

export default InlineCheckboxFilter;
