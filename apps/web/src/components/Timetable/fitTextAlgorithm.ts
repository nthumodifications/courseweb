export const TIMETABLE_TEXT_FIT_MIN_PX = 6;
export const TIMETABLE_TEXT_FIT_STEP_PX = 0.5;

export type FitTextMeasure = (fontSize: number) => boolean;

type MeasuredTitle = { style: { display: string } };

export const withClampedTitleExcluded = <T>(
  title: MeasuredTitle | null,
  excludeTitle: boolean,
  measure: () => T,
): T => {
  if (!title || !excludeTitle) return measure();

  const previousDisplay = title.style.display;
  title.style.display = "none";
  try {
    return measure();
  } finally {
    title.style.display = previousDisplay;
  }
};

export type FitTextLayout = {
  fontSize: number;
  overflowsAtMinimum: boolean;
};

type FindFittingTextLayoutOptions = {
  baseFontSize: number;
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
  measure: FitTextMeasure,
) => {
  const largest = sizes[0]!;
  const smallestIndex = sizes.length - 1;
  const smallest = sizes[smallestIndex]!;

  if (measure(largest)) return largest;
  if (!measure(smallest)) return null;

  let low = 0;
  let high = smallestIndex;
  let bestFitIndex = smallestIndex;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (measure(sizes[middle]!)) {
      bestFitIndex = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }

  return sizes[bestFitIndex]!;
};

/** Returns the largest fitting size, keeping all rendered fields in place. */
export const findFittingTextLayout = ({
  baseFontSize,
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
  const fontSize = findLargestFittingSize(sizes, measure);

  return {
    fontSize: fontSize ?? safeMin,
    overflowsAtMinimum: fontSize === null,
  };
};
