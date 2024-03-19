"use client";

import { X } from "lucide-react";
import * as React from "react";

import clsx from "clsx";
import { CommandList, Command as CommandPrimitive } from "cmdk";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Label } from "@/components/ui/label";

type DataItem = Record<"value" | "label", string>;

export function MultiSelect({
  label = "Select an item",
  placeholder = "Select an item",
  parentClassName,
  data = [],
  selected = [],
  onSelectedChange,
}: {
  label?: string;
  placeholder?: string;
  parentClassName?: string;
  data: DataItem[];
  selected?: string[];
  onSelectedChange?: (selected: string[]) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [selected_state, setSelected] = React.useState<DataItem[]>(selected.map((s) => data.find((d) => d.value === s)!));
  const [inputValue, setInputValue] = React.useState("");

  React.useEffect(() => {
    // check if the selected prop has changed, prevent infinite loop
    if (selected_state.map((s) => s.value).join() !== selected.join()) {
      setSelected(selected.map((s) => data.find((d) => d.value === s)!));
    }
  }, [selected]);

  React.useEffect(() => {
    onSelectedChange?.(selected_state.map((s) => s.value));
    setOpen(false);
  }, [selected_state]);

  const handleUnselect = React.useCallback((item: DataItem) => {
    setSelected((prev) => prev.filter((s) => s.value !== item.value));
  }, []);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "") {
            setSelected((prev) => {
              const newSelected = [...prev];
              newSelected.pop();
              return newSelected;
            });
          }
        }
        // This is not a default behaviour of the <input /> field
        if (e.key === "Escape") {
          input.blur();
        }
      }
    },
    []
  );

  const selectables = data.filter((item) => !selected_state.includes(item));

  return (
    <div
      className={clsx(
        label && "gap-1.5",
        parentClassName,
        "grid w-full items-center"
      )}
    >
      {label && (
        <Label className="text-[#344054] text-sm font-medium">{label}</Label>
      )}
      <Command
        onKeyDown={handleKeyDown}
        className="overflow-visible bg-transparent"
      >
        <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <div className="flex gap-1 flex-wrap">
            {selected_state.map((item, index) => {
              if (index > 1) return;
              return (
                <Badge key={item.value} variant="secondary">
                  {item.label}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(item);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleUnselect(item)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              );
            })}
            {selected_state.length > 2 && <p>{`+${selected_state.length - 2} more`}</p>}
            {/* Avoid having the "Search" Icon */}
            <CommandPrimitive.Input
              ref={inputRef}
              value={inputValue}
              onValueChange={setInputValue}
              onBlur={() => setOpen(false)}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
            />
          </div>
        </div>
        <div className="relative mt-2">
          {open && selectables.length > 0 ? (
            <div className="absolute w-full top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in z-40">
              <CommandList>
                <CommandGroup className="h-full overflow-auto">
                  {selectables.map((framework) => {
                    return (
                      <CommandItem
                        key={framework.value}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onSelect={(value) => {
                          setInputValue("");
                          setSelected((prev) => [...prev, framework]);
                        }}
                      >
                        {framework.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </div>
          ) : null}
        </div>
      </Command>
    </div>
  );
}
