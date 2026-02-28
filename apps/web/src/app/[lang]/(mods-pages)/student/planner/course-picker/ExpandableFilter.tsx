import { useEffect, useRef, useState, useMemo } from "react";
import { useRefinementList } from "react-instantsearch";
import { Search } from "lucide-react";
import { Input } from "@courseweb/ui";
import { cn } from "@courseweb/ui";
import { Badge } from "@courseweb/ui";
import { Button } from "@courseweb/ui";

type ExpandableFilterProps = {
  attribute: string;
  searchable?: boolean;
  limit?: number;
  clientSearch?: boolean;
  synonms?: Record<string, string>;
  placeholder?: string;
  isClassType?: boolean;
};

const ExpandableFilter = ({
  attribute,
  searchable = false,
  limit = 10,
  clientSearch = false,
  synonms = {},
  placeholder = "Search...",
  isClassType = false,
}: ExpandableFilterProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use the refinement list hook
  const { refine, items, canToggleShowMore, isShowingMore, toggleShowMore } =
    useRefinementList({
      attribute,
      limit,
      escapeFacetValues: true,
    });

  // Handle outside clicks to collapse the filter
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  const handleInputClick = () => {
    setIsExpanded(true);
    // Use a setTimeout to ensure the DOM is updated before focusing
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleItemSelect = (value: string) => {
    refine(value);
    setIsExpanded(false);
    setSearchQuery("");
  };

  // Memoize the filtered items to prevent unnecessary re-renders
  const filteredItems = useMemo(() => {
    if (searchable && searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase();
      return items.filter((item) => {
        const itemLabel = synonms[item.label] || item.label;
        return itemLabel.toLowerCase().includes(lowercaseQuery);
      });
    }
    return items;
  }, [items, searchable, searchQuery, synonms]);

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
      setIsExpanded(false);
      setSearchQuery("");
    } else {
      handleItemSelect(value);
    }
  };

  // Memoize the refined items to prevent re-renders
  const refinedItems = useMemo(() => {
    return items.filter((item) => item.isRefined);
  }, [items]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={cn(
          "flex items-center border rounded-md px-3 py-2 cursor-text",
          isExpanded ? "ring-2 ring-primary" : "hover:border-primary/50",
        )}
        onClick={handleInputClick}
      >
        <div className="flex flex-1 flex-wrap gap-1 items-center">
          {refinedItems.length > 0 ? (
            <>
              {refinedItems.map((item) => (
                <Badge
                  key={item.value}
                  variant="outline"
                  className="mr-1 mb-1 break-words"
                >
                  <span className="break-all whitespace-normal">
                    {synonms[item.label] || item.label}
                  </span>
                  <button
                    className="ml-1 text-xs flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      refine(item.value);
                    }}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </>
          ) : (
            <span className="text-muted-foreground text-sm">
              {isExpanded ? "" : "Click to select..."}
            </span>
          )}
          {isExpanded && (
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder={placeholder}
            />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="absolute z-50 mt-1 w-full bg-background border rounded-md shadow-lg max-h-[300px] overflow-y-auto left-0 right-0">
          {filteredItems.length > 0 ? (
            <div className="p-1 w-full">
              {filteredItems.map((item) => (
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
                    {synonms[item.label] || item.label}{" "}
                    <span className="text-muted-foreground whitespace-normal">
                      ({item.count})
                    </span>
                  </div>
                </div>
              ))}
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
                  {isShowingMore ? "Show less" : "Show more"}
                </Button>
              )}
            </div>
          ) : (
            <div className="p-2 text-sm text-center text-muted-foreground">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpandableFilter;
