import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { formatPlannerText } from "../remake/shared";

interface PlannerTourProps {
  open: boolean;
  showProgress: boolean;
  showPending: boolean;
  onDone: () => void;
}

interface TourStep {
  target: string;
  title: string;
  description: string;
}

interface CardPosition {
  left: number;
  top: number;
}

export function PlannerTour({
  open,
  showProgress,
  showPending,
  onDone,
}: PlannerTourProps) {
  const dict = useDictionary();
  const t = dict.planner.tour as Record<string, string>;
  const [stepIndex, setStepIndex] = useState(0);
  const [position, setPosition] = useState<CardPosition | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const highlightedRef = useRef<HTMLElement | null>(null);
  const originalStyleRef = useRef<{
    position: string;
    zIndex: string;
    boxShadow: string;
    pointerEvents: string;
  } | null>(null);

  const steps = useMemo<TourStep[]>(() => {
    const result: TourStep[] = [];
    if (showProgress) {
      result.push({
        target: "progress",
        title: t.progressTitle,
        description: t.progressDescription,
      });
    }
    if (showPending) {
      result.push({
        target: "pending",
        title: t.pendingTitle,
        description: t.pendingDescription,
      });
    }
    result.push(
      {
        target: "views",
        title: t.viewsTitle,
        description: t.viewsDescription,
      },
      {
        target: "add-course",
        title: t.addTitle,
        description: t.addDescription,
      },
    );
    return result;
  }, [showPending, showProgress, t]);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const current = steps[stepIndex];
    if (!current) {
      onDone();
      return;
    }

    const target = document.querySelector<HTMLElement>(
      `[data-tour="${current.target}"]`,
    );
    if (!target) {
      setStepIndex((index) => Math.min(index + 1, steps.length));
      return;
    }

    const original = {
      position: target.style.position,
      zIndex: target.style.zIndex,
      boxShadow: target.style.boxShadow,
      pointerEvents: target.style.pointerEvents,
    };
    highlightedRef.current = target;
    originalStyleRef.current = original;
    if (getComputedStyle(target).position === "static") {
      target.style.position = "relative";
    }
    target.style.zIndex = "81";
    target.style.boxShadow = "0 0 0 4px hsl(var(--primary))";
    target.style.pointerEvents = "none";

    const placeCard = () => {
      const rect = target.getBoundingClientRect();
      const card = cardRef.current;
      const cardWidth = Math.min(360, window.innerWidth - 32);
      const cardHeight = card?.getBoundingClientRect().height ?? 220;
      const left = Math.max(
        16,
        Math.min(
          rect.left + rect.width / 2 - cardWidth / 2,
          window.innerWidth - cardWidth - 16,
        ),
      );
      const below = rect.bottom + 14;
      const top =
        below + cardHeight <= window.innerHeight - 16
          ? below
          : Math.max(16, rect.top - cardHeight - 14);
      setPosition({ left, top });
    };
    placeCard();
    requestAnimationFrame(() => cardRef.current?.focus());
    window.addEventListener("resize", placeCard);
    window.addEventListener("scroll", placeCard, true);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDone();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", placeCard);
      window.removeEventListener("scroll", placeCard, true);
      document.removeEventListener("keydown", handleKeyDown);
      if (highlightedRef.current && originalStyleRef.current) {
        highlightedRef.current.style.position =
          originalStyleRef.current.position;
        highlightedRef.current.style.zIndex = originalStyleRef.current.zIndex;
        highlightedRef.current.style.boxShadow =
          originalStyleRef.current.boxShadow;
        highlightedRef.current.style.pointerEvents =
          originalStyleRef.current.pointerEvents;
      }
      highlightedRef.current = null;
      originalStyleRef.current = null;
    };
  }, [open, onDone, stepIndex, steps]);

  if (!open || steps.length === 0) return null;
  const current = steps[Math.min(stepIndex, steps.length - 1)];
  const moveNext = () => {
    if (stepIndex >= steps.length - 1) onDone();
    else setStepIndex((index) => index + 1);
  };

  return (
    <>
      <button
        type="button"
        aria-label={dict.planner.common.close}
        className="fixed inset-0 z-[80] cursor-default bg-black/35"
        onClick={onDone}
      />
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="planner-tour-title"
        tabIndex={-1}
        className="fixed z-[90] w-[min(360px,calc(100vw-2rem))] rounded-lg border border-border bg-background p-4 text-foreground shadow-xl outline-none"
        style={
          position
            ? { left: position.left, top: position.top }
            : { left: 16, bottom: 16 }
        }
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 id="planner-tour-title" className="text-sm font-medium">
              {current.title}
            </h2>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatPlannerText(t.counter, {
                current: Math.min(stepIndex + 1, steps.length),
                total: steps.length,
              })}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {current.description}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            {t.skip}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
            >
              {t.previous}
            </Button>
            <Button type="button" size="sm" onClick={moveNext}>
              {stepIndex === steps.length - 1 ? t.finish : t.next}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
