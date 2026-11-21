import { useSearchBox, UseSearchBoxProps } from "react-instantsearch";
import { Input, Button, cn } from "@courseweb/ui";
import { useRef, useState } from "react";
import { Search } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";

interface SearchBoxProps extends UseSearchBoxProps {
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

const SearchBox = ({
  placeholder,
  autoFocus,
  className,
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
      className="relative flex w-full min-w-0 items-center gap-1"
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
        className={cn("min-w-0 flex-1", className)}
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label={dict.common.search}
        title={dict.common.search}
      >
        <Search size="16" />
      </Button>
    </form>
  );
};

export default SearchBox;
