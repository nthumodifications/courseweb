import {
  CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  findFittingTextLayout,
  FitTextLayout,
  TIMETABLE_TEXT_FIT_MIN_PX,
  withClampedTitleExcluded,
} from "./fitTextAlgorithm";
import type { CourseTimeslotData } from "@/types/timetable";
import type {
  TimetableDisplayPreferences,
  TimetableFieldKey,
  TimetableTitleBehavior,
} from "@/hooks/contexts/useUserTimetable";

const pendingMeasurements = new Set<() => void>();
let measurementFrame: number | ReturnType<typeof setTimeout> | null = null;

const flushMeasurements = () => {
  measurementFrame = null;
  const measurements = [...pendingMeasurements];
  pendingMeasurements.clear();
  measurements.forEach((measure) => measure());
};

const scheduleMeasurement = (measure: () => void) => {
  pendingMeasurements.add(measure);
  if (measurementFrame !== null || typeof window === "undefined") return;

  measurementFrame = window.requestAnimationFrame
    ? window.requestAnimationFrame(flushMeasurements)
    : window.setTimeout(flushMeasurements, 0);
};

const cancelMeasurement = (measure: () => void) => {
  pendingMeasurements.delete(measure);
  if (pendingMeasurements.size > 0 || measurementFrame === null) return;

  if (typeof measurementFrame === "number" && window.cancelAnimationFrame) {
    window.cancelAnimationFrame(measurementFrame);
  } else {
    window.clearTimeout(measurementFrame);
  }
  measurementFrame = null;
};

const getFitTextStyle = (fontSize: number): CSSProperties => ({
  fontSize: `${fontSize}px`,
  gap: `${Math.min(2, Math.max(0, (fontSize - 10) / 3))}px`,
  lineHeight: 1.15,
  padding: `${Math.max(2, fontSize / 4)}px`,
});

type UseFitTextOptions = {
  baseFontSize: number;
  contentKey: string;
  titleBehavior: TimetableTitleBehavior;
};

export const useFitText = ({
  baseFontSize,
  contentKey,
  titleBehavior,
}: UseFitTextOptions) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<FitTextLayout>(() => ({
    fontSize: baseFontSize,
    overflowsAtMinimum: false,
  }));

  useLayoutEffect(() => {
    setLayout((previous) =>
      previous.fontSize === baseFontSize && !previous.overflowsAtMinimum
        ? previous
        : {
            fontSize: baseFontSize,
            overflowsAtMinimum: false,
          },
    );
  }, [baseFontSize, contentKey]);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (
      !container ||
      container.clientWidth <= 0 ||
      container.clientHeight <= 0
    ) {
      return;
    }

    const parent = container.parentElement;
    const availableSlotHeight = Number.parseFloat(
      parent?.dataset.fitAvailableHeight ?? "",
    );
    const parentStyle = parent ? window.getComputedStyle(parent) : null;
    const borderHeight = parentStyle
      ? Number.parseFloat(parentStyle.borderTopWidth) +
        Number.parseFloat(parentStyle.borderBottomWidth)
      : 0;
    const availableHeight = Number.isFinite(availableSlotHeight)
      ? Math.max(0, availableSlotHeight - borderHeight)
      : container.clientHeight;

    const previousStyles = {
      fontSize: container.style.fontSize,
      gap: container.style.gap,
      lineHeight: container.style.lineHeight,
      padding: container.style.padding,
    };

    const title = container.querySelector<HTMLElement>("[data-fit-text-title]");
    const nextLayout = withClampedTitleExcluded(
      title,
      titleBehavior !== "fit",
      () =>
        findFittingTextLayout({
          baseFontSize,
          measure: (fontSize) => {
            const style = getFitTextStyle(fontSize);
            container.style.fontSize = String(style.fontSize ?? "");
            container.style.gap = String(style.gap ?? "");
            container.style.lineHeight = String(style.lineHeight ?? "");
            container.style.padding = String(style.padding ?? "");

            return (
              container.scrollHeight <= availableHeight &&
              container.scrollWidth <= container.clientWidth
            );
          },
          minFontSize: TIMETABLE_TEXT_FIT_MIN_PX,
        }),
    );

    Object.assign(container.style, previousStyles);

    setLayout((previous) =>
      previous.fontSize === nextLayout.fontSize &&
      previous.overflowsAtMinimum === nextLayout.overflowsAtMinimum
        ? previous
        : nextLayout,
    );
  }, [baseFontSize, titleBehavior]);

  useEffect(() => {
    let disposed = false;
    const schedule = () => {
      if (!disposed) scheduleMeasurement(measure);
    };
    const container = containerRef.current;
    if (!container) return;

    schedule();

    let previousSize = "";
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            const nextSize = `${width}:${height}`;
            if (nextSize === previousSize) return;
            previousSize = nextSize;
            schedule();
          });
    observer?.observe(container);

    const fonts = document.fonts;
    fonts?.addEventListener("loadingdone", schedule);
    void fonts?.ready.then(schedule);

    return () => {
      disposed = true;
      observer?.disconnect();
      fonts?.removeEventListener("loadingdone", schedule);
      cancelMeasurement(measure);
    };
  }, [contentKey, measure]);

  return {
    containerRef,
    overflowsAtMinimum: layout.overflowsAtMinimum,
    style: getFitTextStyle(layout.fontSize),
  };
};

export const useTimetableSlotFitText = ({
  baseFontSize,
  display,
  displayLanguage,
  fieldOrder,
  fontFamily,
  showCustomTime,
  slot,
  titleBehavior,
}: {
  baseFontSize: number;
  display: TimetableDisplayPreferences["display"];
  displayLanguage: string;
  fieldOrder: readonly TimetableFieldKey[];
  fontFamily: string;
  showCustomTime: boolean;
  slot: CourseTimeslotData;
  titleBehavior: TimetableTitleBehavior;
}) =>
  useFitText({
    baseFontSize,
    titleBehavior,
    contentKey: JSON.stringify({
      displayLanguage,
      fontSize: baseFontSize,
      fontFamily,
      display,
      fieldOrder,
      titleBehavior,
      showCustomTime,
      slot,
    }),
  });
