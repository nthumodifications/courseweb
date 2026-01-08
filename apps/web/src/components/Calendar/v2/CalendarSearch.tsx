/**
 * CalendarSearch - Search and filter events
 */

import React from "react";
import { Search, X } from "lucide-react";
import { Input, Button } from "@courseweb/ui";

interface CalendarSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CalendarSearch({
  value,
  onChange,
  placeholder = "Search events...",
  className,
}: CalendarSearchProps) {
  const handleClear = () => {
    onChange("");
  };

  return (
    <div className={`relative ${className || ""}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
