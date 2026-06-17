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
  輕鬆: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  適中: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  繁重: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  Light: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Moderate:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  Heavy: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function DifficultyDots({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            i < rating
              ? "bg-blue-500 dark:bg-blue-400"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        />
      ))}
      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
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

  const fetch = async () => {
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
      <Button variant="outline" size="sm" onClick={fetch} className="gap-2">
        <Sparkles className="h-4 w-4" />
        AI 摘要
      </Button>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-1">
        <Loader2 className="h-4 w-4 animate-spin" />
        分析課程內容中…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 py-1">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
        <button
          onClick={fetch}
          className="ml-1 underline hover:no-underline flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" /> 重試
        </button>
      </div>
    );
  }

  const workloadClass =
    workloadColors[summary!.workload] ??
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";

  return (
    <div className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
        <Sparkles className="h-4 w-4" />
        AI 課程摘要
      </div>

      {/* Bullets */}
      <ul className="space-y-1.5">
        {summary!.bullets.map((bullet, i) => (
          <li
            key={i}
            className="flex gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <span className="mt-0.5 shrink-0 text-blue-400">▸</span>
            {bullet}
          </li>
        ))}
      </ul>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-blue-100 dark:border-blue-900/30">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-600 dark:text-gray-400">
            負擔
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${workloadClass}`}
          >
            {summary!.workload}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-600 dark:text-gray-400">
            難度
          </span>
          <DifficultyDots rating={Math.round(summary!.difficultyRating)} />
        </div>
      </div>

      {/* Audience */}
      <p className="text-xs italic text-gray-500 dark:text-gray-400">
        {summary!.audience}
      </p>
    </div>
  );
}
