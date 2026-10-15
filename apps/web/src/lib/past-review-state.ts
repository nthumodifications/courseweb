export type PastReviewRowStatus = { error: boolean; success: boolean };

export const isPastReviewRowEditing = (
  hasExistingReview: boolean,
  editing: boolean,
) => !hasExistingReview || editing;

export const getPastReviewRatingSummary = (
  values: {
    coolness: number;
    sweetness: number;
    learning: number;
  },
  labels = { coolness: "涼度", sweetness: "甜度", learning: "學習收穫" },
) => [
  `${labels.coolness} ${values.coolness}`,
  `${labels.sweetness} ${values.sweetness}`,
  `${labels.learning} ${values.learning}`,
];

export const setPastReviewRowStatus = (
  current: Readonly<Record<string, PastReviewRowStatus>>,
  key: string,
  status: PastReviewRowStatus,
) => ({ ...current, [key]: status });

export const reconcileReviewDrafts = <Draft, Review>(
  current: Readonly<Record<string, Draft>>,
  rows: readonly { key: string; existing?: Review }[],
  createDraft: (review?: Review) => Draft,
  hydratedExisting: Set<string>,
) => {
  const next = { ...current };
  rows.forEach((row) => {
    if (!next[row.key]) next[row.key] = createDraft(row.existing);
    if (row.existing && !hydratedExisting.has(row.key)) {
      next[row.key] = createDraft(row.existing);
      hydratedExisting.add(row.key);
    }
  });
  return next;
};
