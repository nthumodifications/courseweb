export type SemesterDefaultState = {
  canRefine: boolean;
  hasRefinedItem: boolean;
  refinedSemester?: string;
  hasExplicitSemester: boolean;
  hasUserSelectedSemester: boolean;
  lastDefaultedSemester?: string;
  defaultSemester: string;
};

export const shouldDefaultSemester = ({
  canRefine,
  hasRefinedItem,
  refinedSemester,
  hasExplicitSemester,
  hasUserSelectedSemester,
  lastDefaultedSemester,
  defaultSemester,
}: SemesterDefaultState) => {
  if (!canRefine || hasExplicitSemester || hasUserSelectedSemester)
    return false;
  if (!hasRefinedItem) return true;
  return (
    refinedSemester === lastDefaultedSemester &&
    refinedSemester !== defaultSemester
  );
};
