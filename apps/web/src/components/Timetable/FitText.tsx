import {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  findFittingTextLayout,
  FitTextLayout,
  getTimetableFieldDropOrder,
  TIMETABLE_TEXT_FIT_MIN_PX,
} from "./fitTextAlgorithm";
import type { CourseTimeslotData } from "@/types/timetable";
import type {
  TimetableDisplayPreferences,
  TimetableFieldKey,
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

type UseFitTextOptions = {
  baseFontSize: number;
  contentKey: string;
  dropOrder: readonly string[];
};

export const useFitText = ({
  baseFontSize,
  contentKey,
  dropOrder,
}: UseFitTextOptions) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<FitTextLayout>(() => ({
    fontSize: baseFontSize,
    hiddenFields: [],
    overflowsAtMinimum: false,
  }));
  const dropOrderKey = dropOrder.join("\u001f");
  const dropOrderRef = useRef(dropOrder);
  dropOrderRef.current = dropOrder;

  useLayoutEffect(() => {
    setLayout((previous) =>
      previous.fontSize === baseFontSize && previous.hiddenFields.length === 0
        ? previous
        : {
            fontSize: baseFontSize,
            hiddenFields: [],
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

    const previousFontSize = container.style.fontSize;
    const fields = Array.from(
      container.querySelectorAll<HTMLElement>("[data-fit-field]"),
    );
    const previousDisplays = fields.map((field) => field.style.display);

    const nextLayout = findFittingTextLayout({
      baseFontSize,
      dropOrder: dropOrderRef.current,
      measure: (fontSize, hiddenFields) => {
        const hidden = new Set(hiddenFields);
        container.style.fontSize = `${fontSize}px`;
        fields.forEach((field) => {
          field.style.display = hidden.has(field.dataset.fitField ?? "")
            ? "none"
            : "contents";
        });

        return (
          container.scrollHeight <= container.clientHeight &&
          container.scrollWidth <= container.clientWidth
        );
      },
      minFontSize: TIMETABLE_TEXT_FIT_MIN_PX,
    });

    container.style.fontSize = previousFontSize;
    fields.forEach((field, index) => {
      field.style.display = previousDisplays[index] ?? "";
    });

    setLayout((previous) => {
      const hiddenFieldsChanged =
        previous.hiddenFields.length !== nextLayout.hiddenFields.length ||
        previous.hiddenFields.some(
          (field, index) => field !== nextLayout.hiddenFields[index],
        );
      return previous.fontSize === nextLayout.fontSize &&
        !hiddenFieldsChanged &&
        previous.overflowsAtMinimum === nextLayout.overflowsAtMinimum
        ? previous
        : nextLayout;
    });
  }, [baseFontSize]);

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
  }, [contentKey, dropOrderKey, measure]);

  const style: CSSProperties = { fontSize: `${layout.fontSize}px` };
  return {
    containerRef,
    hiddenFields: layout.hiddenFields,
    style,
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
}: {
  baseFontSize: number;
  display: TimetableDisplayPreferences["display"];
  displayLanguage: string;
  fieldOrder: readonly TimetableFieldKey[];
  fontFamily: string;
  showCustomTime: boolean;
  slot: CourseTimeslotData;
}) => {
  const customItem = slot.customItem;
  const visibleFields = customItem
    ? [
        ...(display.code && customItem.shortCode ? ["code"] : []),
        ...(display.title ? ["title"] : []),
        ...(display.time || showCustomTime ? ["time"] : []),
        ...(display.venue && customItem.venue ? ["venue"] : []),
        ...(customItem.note ? ["note"] : []),
      ]
    : fieldOrder.filter((field) => display[field]);

  return useFitText({
    baseFontSize,
    contentKey: JSON.stringify({
      displayLanguage,
      fontSize: baseFontSize,
      fontFamily,
      display,
      fieldOrder,
      slot,
    }),
    dropOrder: getTimetableFieldDropOrder(visibleFields),
  });
};

export const FitTextField = ({
  children,
  field,
  hidden,
}: {
  children: ReactNode;
  field: string;
  hidden: boolean;
}) => (
  <div data-fit-field={field} style={{ display: hidden ? "none" : "contents" }}>
    {children}
  </div>
);
