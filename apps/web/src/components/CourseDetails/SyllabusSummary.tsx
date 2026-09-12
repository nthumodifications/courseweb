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

function DifficultyDots({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            i < rating
            ? "bg-primary"
              : "bg-muted"
          }`}
      />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">
        {rating}/5
      </span>
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

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await client.ai.summarize[":courseId"].$get({
        param: { courseId },
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? dict.course.details.ai_summary.error);
      }
      const data = (await res.json()) as SyllabusSummary;
      setSummary(data);
    } catch (e) {
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
          <RotateCcw className="h-3 w-3" /> {dict.common.try_again}
        </button>
      </div>
    );
  }

  const workloadClass = "bg-muted text-foreground";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="h-4 w-4" />
        {dict.course.details.ai_summary.title}
      </div>

      <ul className="flex flex-col gap-1">
        {summary!.bullets.map((bullet, i) => (
          <li
            key={i}
            className="flex gap-2 text-sm text-foreground"
          >
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
          <DifficultyDots rating={Math.round(summary!.difficultyRating)} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {summary!.audience}
      </p>
    </div>
  );
}
