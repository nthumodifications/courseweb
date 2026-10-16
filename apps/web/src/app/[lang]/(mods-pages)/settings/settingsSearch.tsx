import {
  createContext,
  isValidElement,
  useContext,
  type ReactNode,
} from "react";
import { Input } from "@courseweb/ui";
import { Search, X } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";

export interface SettingsSearchMatchInput {
  title?: string;
  description?: string;
  searchText?: string;
  keywords?: readonly string[];
}

const normalizeSearchText = (value: string) => value.trim().toLocaleLowerCase();

export const matchesSettingsSearch = (
  query: string,
  input: SettingsSearchMatchInput,
) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  return [
    input.title,
    input.description,
    input.searchText,
    ...(input.keywords ?? []),
  ]
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizeSearchText(value).includes(normalizedQuery));
};

export const shouldShowSettingsSection = (
  query: string,
  hasVisibleChild: boolean,
) => !normalizeSearchText(query) || hasVisibleChild;

export const shouldShowSettingsSearchItem = (
  query: string,
  sectionTitleMatches: boolean,
  input: SettingsSearchMatchInput,
) => sectionTitleMatches || matchesSettingsSearch(query, input);

export const getReactNodeText = (value: ReactNode): string => {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (Array.isArray(value)) return value.map(getReactNodeText).join(" ");
  if (isValidElement(value)) return getReactNodeText(value.props.children);
  return "";
};

interface SettingsSearchContextValue {
  query: string;
  isActive: boolean;
}

const SettingsSearchContext = createContext<SettingsSearchContextValue>({
  query: "",
  isActive: false,
});

interface SettingsSearchProviderProps {
  query: string;
  children: ReactNode;
}

export const SettingsSearchProvider = ({
  query,
  children,
}: SettingsSearchProviderProps) => (
  <SettingsSearchContext.Provider
    value={{ query, isActive: Boolean(query.trim()) }}
  >
    {children}
  </SettingsSearchContext.Provider>
);

export const useSettingsSearch = () => useContext(SettingsSearchContext);

const SettingsSearchSectionContext = createContext(false);

interface SettingsSearchSectionProviderProps {
  titleMatches: boolean;
  children: ReactNode;
}

export const SettingsSearchSectionProvider = ({
  titleMatches,
  children,
}: SettingsSearchSectionProviderProps) => (
  <SettingsSearchSectionContext.Provider value={titleMatches}>
    {children}
  </SettingsSearchSectionContext.Provider>
);

export const useSettingsSearchSectionTitleMatch = () =>
  useContext(SettingsSearchSectionContext);

interface SettingsSearchableBlockProps {
  children: ReactNode;
  searchText?: string;
  keywords?: readonly string[];
}

export const SettingsSearchableBlock = ({
  children,
  searchText,
  keywords,
}: SettingsSearchableBlockProps) => {
  const { query, isActive } = useSettingsSearch();
  const sectionTitleMatches = useSettingsSearchSectionTitleMatch();
  const isMatch = shouldShowSettingsSearchItem(query, sectionTitleMatches, {
    searchText,
    keywords,
  });

  if (isActive && !isMatch) return null;
  if (!isActive) return children;

  return <div data-settings-search-match="true">{children}</div>;
};

interface SettingsSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
}

export const SettingsSearchBar = ({
  query,
  onQueryChange,
}: SettingsSearchBarProps) => {
  const dict = useDictionary();

  return (
    <div className="relative">
      <label htmlFor="settings-search" className="sr-only">
        {dict.settings.search.label}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id="settings-search"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onQueryChange("");
          }
        }}
        placeholder={dict.settings.search.placeholder}
        className="h-10 pl-6 pr-6"
      />
      {query.length > 0 && (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={dict.settings.search.clear}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export const SettingsSearchEmptyState = () => {
  const { query, isActive } = useSettingsSearch();
  const dict = useDictionary();

  if (!isActive) return null;

  return (
    <p className="settings-search-empty px-2 py-4 text-sm text-muted-foreground">
      {dict.settings.search.no_results.replace("{query}", query)}
    </p>
  );
};
