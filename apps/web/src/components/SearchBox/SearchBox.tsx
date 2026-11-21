import { useSearchBox, UseSearchBoxProps } from "react-instantsearch";
import { Input, Button, cn } from "@courseweb/ui";
import { useRef, useState } from "react";
import { Search } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";

interface SearchBoxProps extends UseSearchBoxProps {
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  /** Soft-grey field that wraps the input and the search button together. */
  filled?: boolean;
}

const SearchBox = ({
  placeholder,
  autoFocus,
  className,
  filled = false,
  ...props
}: SearchBoxProps) => {
  const { query, refine, clear } = useSearchBox(props);
  const dict = useDictionary();
  const [inputValue, setInputValue] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    refine(newValue);
  };

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "relative flex w-full min-w-0 items-center gap-1",
        // The whole field (input and button) carries the fill and the focus
        // ring, so no part of it is left a different colour.
        filled &&
          "h-10 rounded-md bg-surface pr-1 focus-within:bg-background focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring",
      )}
    >
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={onChange}
        autoFocus={autoFocus}
        placeholder={placeholder}
        type="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        // An inset ring is never clipped by a dialog or scroll container edge.
        className={cn(
          "min-w-0 flex-1 focus-visible:ring-inset focus-visible:ring-offset-0",
          filled &&
            "h-10 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
          className,
        )}
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className={filled ? "h-8 w-8 shrink-0 hover:bg-muted" : undefined}
        aria-label={dict.common.search}
        title={dict.common.search}
      >
        <Search size="16" />
      </Button>
    </form>
  );
};

export default SearchBox;
