"use client";
import { useSearchBox, UseSearchBoxProps } from "react-instantsearch";
import { Input } from "@courseweb/ui";
import { useRef, useState } from "react";

interface SearchBoxProps extends UseSearchBoxProps {
  placeholder?: string;
  autoFocus?: boolean;
}

const SearchBox = ({ placeholder, autoFocus, ...props }: SearchBoxProps) => {
  const { query, refine, clear } = useSearchBox(props);
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

  const onReset = () => {
    setInputValue("");
    clear();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <form onSubmit={onSubmit} className="relative w-full flex items-center">
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
      />
    </form>
  );
};

export default SearchBox;
