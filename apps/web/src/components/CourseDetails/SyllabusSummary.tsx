import { useState } from "react";
import { Button } from "@courseweb/ui";
import { Sparkles, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import type { RawCourseID } from "@/types/courses";
import client from "@/config/api";
import useDictionary from "@/dictionaries/useDictionary";

interface SyllabusSummary {
  bullets: string[];
  workload: string;
  audience: string;
  difficultyRating: number;
}

type SummaryErrorCode = "rate_limited" | "unavailable" | "unknown";

function DifficultyDots({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            i < rating ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating}/5</span>
    </div>
  );
}

export default function SyllabusSummary({
  courseId,
}: {
  courseId: RawCourseID;
}) {
  const dict = useDictionary();
  const [summary, setSummary] = useState<SyllabusSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<SummaryErrorCode | null>(null);

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      let apiKey: string | undefined;
      try {
        const saved = localStorage.getItem("ai_settings");
        if (saved) {
          const parsed = JSON.parse(saved) as {
            useCustomKey?: boolean;
            apiKey?: string;
          };
          if (parsed.useCustomKey && parsed.apiKey) apiKey = parsed.apiKey;
        }
      } catch {}

      const res = apiKey
        ? await client.ai.summarize[":courseId"].$get(
            { param: { courseId } },
            { headers: { "X-Gemini-Api-Key": apiKey } },
          )
        : await client.ai.summarize[":courseId"].$get({
            param: { courseId },
          });
      if (!res.ok) {
        if (res.status === 429) {
          setErrorCode("rate_limited");
          setError(dict.course.details.ai_summary.rate_limited);
          return;
        }
        if (res.status === 503) {
          setErrorCode("unavailable");
          setError(dict.course.details.ai_summary.unavailable);
          return;
        }
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setErrorCode("unknown");
        throw new Error(err?.error ?? dict.course.details.ai_summary.error);
      }
      const data = (await res.json()) as SyllabusSummary;
      setSummary(data);
    } catch (e) {
      setErrorCode("unknown");
      setError(
        e instanceof Error ? e.message : dict.course.details.ai_summary.error,
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!summary && !isLoading && !error) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={fetchSummary}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        {dict.course.details.ai_summary.generate}
      </Button>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {dict.course.details.ai_summary.loading}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-1 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
        <button
          onClick={fetchSummary}
          className="ml-1 underline hover:no-underline flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          {errorCode === "rate_limited"
            ? dict.course.details.ai_summary.rate_limited_retry
            : dict.common.try_again}
        </button>
      </div>
    );
  }

  const workload = summary!.workload.trim().toLowerCase();
  const workloadClass =
    workload === "light" || workload === "輕鬆"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : workload === "heavy" || workload === "繁重"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
        : workload === "moderate" || workload === "適中"
          ? "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
          : "bg-muted text-foreground";
  const ratingValue = Number(summary!.difficultyRating);
  const rating = Number.isFinite(ratingValue)
    ? Math.min(5, Math.max(0, Math.round(ratingValue)))
    : 0;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="h-4 w-4" />
        {dict.course.details.ai_summary.title}
      </div>

      <ul className="flex flex-col gap-1">
        {summary!.bullets.map((bullet, i) => (
          <li key={i} className="flex gap-2 text-sm text-foreground">
            <span className="mt-0.5 shrink-0 text-primary">▸</span>
            {bullet}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {dict.course.details.ai_summary.workload}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${workloadClass}`}
          >
            {summary!.workload}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {dict.course.details.ai_summary.difficulty}
          </span>
          <DifficultyDots rating={rating} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{summary!.audience}</p>
    </div>
  );
}
