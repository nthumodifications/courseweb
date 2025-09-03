"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@courseweb/ui";
import { cn } from "@courseweb/ui";
import { Badge } from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import useCustomRefinementList from "@/app/[lang]/(mods-pages)/courses/useCustomRefinementList";
import useCustomMenu from "@/app/[lang]/(mods-pages)/courses/useCustomMenu";
import { lastSemester } from "@/const/semester";
import { getFormattedClassCode } from "@/helpers/courses";

type ExpandableClassFilterProps = {
  limit?: number;
  placeholder?: string;
};

const ExpandableClassFilter = ({
  limit = 20,
  placeholder = "Search for courses...",
}: ExpandableClassFilterProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Handle outside clicks to collapse the filter
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
        setSearchValue("");
        handleSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded, handleSearch]);

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
    return items.sort((a, b) => {
      if (a.isRefined) return -1;
      if (b.isRefined) return 1;
      return 0;
    });
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
                    className="ml-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      refine(value);
                    }}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">
              {isExpanded ? "" : "All"}
            </span>
          )}
          {isExpanded && (
            <Input
              ref={inputRef}
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder={placeholder}
            />
          )}
        </div>
        {selected.length > 0 && (
          <X
            className="h-4 w-4 text-muted-foreground ml-2 cursor-pointer"
            onClick={handleClearAll}
          />
        )}
      </div>

      {isExpanded && (
        <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredItems.length > 0 ? (
            <div className="p-1">
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
                    <span className="text-muted-foreground">
                      ({item.count})
                    </span>
                  </div>
                </div>
              ))}
              {filteredItems.length >= limit && (
                <div className="p-2 text-sm text-center text-muted-foreground">
                  Type to search for more options...
                </div>
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

export default ExpandableClassFilter;
