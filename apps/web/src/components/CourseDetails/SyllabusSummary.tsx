import { useState } from "react";
import { Button } from "@courseweb/ui";
import { Sparkles, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import type { RawCourseID } from "@/types/courses";
import client from "@/config/api";

interface SyllabusSummary {
  bullets: string[];
  workload: string;
  audience: string;
  difficultyRating: number;
}

const workloadColors: Record<string, string> = {
  輕鬆: "bg-success/10 text-success",
  適中: "bg-warning/10 text-warning",
  繁重: "bg-destructive/10 text-destructive",
  Light: "bg-success/10 text-success",
  Moderate:
    "bg-warning/10 text-warning",
  Heavy: "bg-destructive/10 text-destructive",
};

function DifficultyDots({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            i < rating
              ? "bg-info"
              : "bg-muted"
          }`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
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
        throw new Error(err.error ?? `Error ${res.status}`);
      }
      const data = (await res.json()) as SyllabusSummary;
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate summary");
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
        AI 摘要
      </Button>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
        <Loader2 className="h-4 w-4 animate-spin" />
        分析課程內容中…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive py-1">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
        <button
          onClick={fetchSummary}
          className="ml-1 underline hover:no-underline flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" /> 重試
        </button>
      </div>
    );
  }

  const workloadClass =
    workloadColors[summary!.workload] ??
    "bg-muted text-foreground";

  return (
    <div className="rounded-lg border border-info/30 bg-info/10 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-info">
        <Sparkles className="h-4 w-4" />
        AI 課程摘要
      </div>

      <ul className="space-y-2">
        {summary!.bullets.map((bullet, i) => (
          <li
            key={i}
            className="flex gap-2 text-sm text-foreground"
          >
            <span className="mt-1 shrink-0 text-info">▸</span>
            {bullet}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-info/30">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-medium text-muted-foreground">
            負擔
          </span>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${workloadClass}`}
          >
            {summary!.workload}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-medium text-muted-foreground">
            難度
          </span>
          <DifficultyDots rating={Math.round(summary!.difficultyRating)} />
        </div>
      </div>

      <p className="text-xs italic text-muted-foreground">
        {summary!.audience}
      </p>
    </div>
  );
}
