import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useParams } from "react-router-dom";
import { useInstantSearch, useSearchBox } from "react-instantsearch";
import type { IndexUiState } from "instantsearch.js";
import { Loader2, Sparkles, Undo, X } from "lucide-react";
import { Badge, Button, Input } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";

const API_BASE = (import.meta.env.VITE_COURSEWEB_API_URL ?? "").replace(/\/$/, "");
const AI_FILTER_ATTRIBUTES = [
  "department",
  "courseLevel",
  "language",
  "separate_times",
  "tags",
  "ge_type",
  "ge_target",
] as const;

type SearchIntentResponse = {
  query?: unknown;
  filters?: unknown;
  explanation?: unknown;
  error?: unknown;
  code?: unknown;
};

type AiSearchBoxProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  semester: string;
  children: ReactNode;
};

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const errorMessage = (
  body: SearchIntentResponse,
  status: number,
  dict: ReturnType<typeof useDictionary>,
) => {
  if (body.code === "rate_limited" || status === 429) {
    return dict.course.search.ai_search.rate_limited;
  }
  return dict.course.search.ai_search.error;
};

const AiSearchBox = ({
  enabled,
  onEnabledChange,
  semester,
  children,
}: AiSearchBoxProps) => {
  const dict = useDictionary();
  const { lang } = useParams<{ lang: string }>();
  const { query } = useSearchBox();
  const { indexUiState, setIndexUiState } = useInstantSearch();
  const [draft, setDraft] = useState(query);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [appliedQuery, setAppliedQuery] = useState<string | null>(null);
  const previousUiState = useRef<IndexUiState | null>(null);

  useEffect(() => {
    if (explanation === null || appliedQuery === null) return;
    const hasAppliedFacet = AI_FILTER_ATTRIBUTES.some(
      (attribute) => (indexUiState.refinementList?.[attribute]?.length ?? 0) > 0,
    );
    const hasAppliedCredits =
      typeof indexUiState.configure?.filters === "string" &&
      indexUiState.configure.filters.includes("credits =");
    if (
      !hasAppliedFacet &&
      !hasAppliedCredits &&
      indexUiState.query !== appliedQuery
    ) {
      setExplanation(null);
      setAppliedQuery(null);
    }
  }, [appliedQuery, explanation, indexUiState]);

  const setSearchState = (intent: SearchIntentResponse) => {
    const filters = asObject(intent.filters);
    setIndexUiState((previous) => {
      previousUiState.current = previous;
      const refinementList = { ...(previous.refinementList ?? {}) };
      for (const attribute of AI_FILTER_ATTRIBUTES) delete refinementList[attribute];

      for (const attribute of AI_FILTER_ATTRIBUTES) {
        const values = asArray(filters[attribute]).filter(
          (value): value is string => typeof value === "string",
        );
        if (values.length) refinementList[attribute] = values;
      }

      const credits = asArray(filters.credits).filter(
        (value): value is number =>
          typeof value === "number" && Number.isInteger(value),
      );
      const configure = { ...(previous.configure ?? {}) };
      if (credits.length) {
        configure.filters = credits.map((value) => `credits = ${value}`).join(" OR ");
      } else {
        delete configure.filters;
      }

      return {
        ...previous,
        query: typeof intent.query === "string" ? intent.query : "",
        refinementList: Object.keys(refinementList).length
          ? refinementList
          : undefined,
        configure: Object.keys(configure).length ? configure : undefined,
      };
    });
  };

  const undo = () => {
    if (previousUiState.current) {
      setIndexUiState(previousUiState.current);
    } else {
      setIndexUiState((previous) => ({
        ...previous,
        query: "",
        refinementList: Object.fromEntries(
          Object.entries(previous.refinementList ?? {}).filter(
            ([attribute]) =>
              !AI_FILTER_ATTRIBUTES.includes(
                attribute as (typeof AI_FILTER_ATTRIBUTES)[number],
              ),
          ),
        ),
        configure: { ...(previous.configure ?? {}), filters: undefined },
      }));
    }
    previousUiState.current = null;
    setExplanation(null);
    setAppliedQuery(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const request = draft.trim();
    if (!request) {
      undo();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/ai/search-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: request,
          semester,
          lang: lang === "en" ? "en" : "zh",
        }),
      });
      const body = (await response.json().catch(() => ({}))) as SearchIntentResponse;
      if (!response.ok) throw new Error(errorMessage(body, response.status, dict));
      if (typeof body.explanation !== "string") {
        throw new Error(dict.course.search.ai_search.error);
      }
      setSearchState(body);
      setExplanation(body.explanation);
      setAppliedQuery(typeof body.query === "string" ? body.query : "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : dict.course.search.ai_search.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex min-w-0 basis-full flex-[1_1_15rem] flex-wrap items-center gap-1 sm:basis-auto">
        <div className="min-w-0 flex-1">
          {enabled ? (
            <form onSubmit={onSubmit} className="relative flex w-full items-center gap-1">
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                autoFocus
                placeholder={dict.course.search.ai_search.placeholder}
                type="search"
                autoComplete="off"
                className="min-w-0 flex-1"
                disabled={loading}
                aria-label={dict.course.list.search_placeholder}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                title={dict.course.search.ai_search.submit}
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size="16" /> : <Sparkles size="16" />}
              </Button>
            </form>
          ) : (
            children
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant={enabled ? "secondary" : "ghost"}
            size="icon"
            title={enabled ? dict.course.search.ai_search.toggle_off : dict.course.search.ai_search.toggle}
            aria-label={enabled ? dict.course.search.ai_search.toggle_off : dict.course.search.ai_search.toggle}
            aria-pressed={enabled}
            onClick={() => {
              setError(null);
              onEnabledChange(!enabled);
            }}
          >
            <Sparkles size="16" />
          </Button>
          <Link
            to={`/${lang === "en" ? "en" : "zh"}/chat`}
            className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            title={dict.course.search.ai_search.assistant}
          >
            <span aria-hidden="true">↗</span>
            <span className="hidden sm:inline">{dict.course.search.ai_search.assistant}</span>
          </Link>
        </div>
      </div>
      {explanation && (
        <div className="flex min-w-0 max-w-full items-start gap-2 pt-1">
          <Badge
            variant="secondary"
            className="flex min-w-0 max-w-full items-start gap-1 whitespace-normal break-words px-2 py-1"
          >
            <span className="break-words">AI: {explanation}</span>
            <button
              type="button"
              className="shrink-0 rounded-sm p-0.5 hover:bg-background/60"
              onClick={undo}
              aria-label={dict.course.search.ai_search.undo}
              title={dict.course.search.ai_search.undo}
            >
              <Undo size="14" />
            </button>
            <button
              type="button"
              className="shrink-0 rounded-sm p-0.5 hover:bg-background/60"
              onClick={undo}
              aria-label={dict.course.search.ai_search.dismiss}
              title={dict.course.search.ai_search.dismiss}
            >
              <X size="14" />
            </button>
          </Badge>
        </div>
      )}
      {loading && (
        <p className="text-xs text-muted-foreground" role="status">
          {dict.course.search.ai_search.loading}
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </>
  );
};

export default AiSearchBox;
