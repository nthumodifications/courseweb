export const TIMETABLE_TEXT_FIT_MIN_PX = 8;
export const TIMETABLE_TEXT_FIT_STEP_PX = 0.5;

export type FitTextMeasure = (
  fontSize: number,
  hiddenFields: readonly string[],
) => boolean;

export type FitTextLayout = {
  fontSize: number;
  hiddenFields: string[];
  overflowsAtMinimum: boolean;
};

type FindFittingTextLayoutOptions = {
  baseFontSize: number;
  dropOrder?: readonly string[];
  measure: FitTextMeasure;
  minFontSize?: number;
  step?: number;
};

const getFontSizeLadder = (
  baseFontSize: number,
  minFontSize: number,
  step: number,
) => {
  const distance = Math.max(0, baseFontSize - minFontSize);
  const stepCount = Math.ceil(distance / step);
  const sizes = Array.from({ length: stepCount + 1 }, (_, index) =>
    Math.max(minFontSize, baseFontSize - index * step),
  );

  return [...new Set(sizes)];
};

const findLargestFittingSize = (
  sizes: readonly number[],
  hiddenFields: readonly string[],
  measure: FitTextMeasure,
) => {
  const largest = sizes[0]!;
  const smallestIndex = sizes.length - 1;
  const smallest = sizes[smallestIndex]!;

  if (measure(largest, hiddenFields)) return largest;
  if (!measure(smallest, hiddenFields)) return null;

  let low = 0;
  let high = smallestIndex;
  let bestFitIndex = smallestIndex;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (measure(sizes[middle]!, hiddenFields)) {
      bestFitIndex = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }

  return sizes[bestFitIndex]!;
};

/**
 * Returns the largest font size that fits. If the minimum still overflows,
 * optional fields are hidden in dropOrder; `title` is always protected.
 */
export const findFittingTextLayout = ({
  baseFontSize,
  dropOrder = [],
  measure,
  minFontSize = TIMETABLE_TEXT_FIT_MIN_PX,
  step = TIMETABLE_TEXT_FIT_STEP_PX,
}: FindFittingTextLayoutOptions): FitTextLayout => {
  const safeBase = Number.isFinite(baseFontSize)
    ? Math.max(0, baseFontSize)
    : TIMETABLE_TEXT_FIT_MIN_PX;
  const safeMin = Math.min(
    safeBase,
    Number.isFinite(minFontSize) ? Math.max(0, minFontSize) : 0,
  );
  const safeStep = Number.isFinite(step) && step > 0 ? step : 0.5;
  const sizes = getFontSizeLadder(safeBase, safeMin, safeStep);
  const hiddenFields: string[] = [];

  while (true) {
    const fontSize = findLargestFittingSize(sizes, hiddenFields, measure);
    if (fontSize !== null) {
      return { fontSize, hiddenFields, overflowsAtMinimum: false };
    }

    const nextField = dropOrder.find(
      (field) => field !== "title" && !hiddenFields.includes(field),
    );
    if (nextField === undefined) {
      return {
        fontSize: safeMin,
        hiddenFields,
        overflowsAtMinimum: true,
      };
    }
    hiddenFields.push(nextField);
  }
};

/**
 * Later display fields are less important. Keep venue until the other
 * displayed fields have been removed, and never remove the title.
 */
export const getTimetableFieldDropOrder = (fieldOrder: readonly string[]) => {
  const dropOrder = [...fieldOrder]
    .reverse()
    .filter((field) => field !== "title" && field !== "venue");

  if (fieldOrder.includes("venue")) dropOrder.push("venue");
  return [...new Set(dropOrder)];
};
