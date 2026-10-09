export type SemesterDefaultState = {
  canRefine: boolean;
  hasRefinedItem: boolean;
  hasExplicitSemester: boolean;
  hasUserSelectedSemester: boolean;
  hasDefaultedSemester: boolean;
};

export const shouldDefaultSemester = ({
  canRefine,
  hasRefinedItem,
  hasExplicitSemester,
  hasUserSelectedSemester,
  hasDefaultedSemester,
}: SemesterDefaultState) =>
  canRefine &&
  !hasRefinedItem &&
  !hasExplicitSemester &&
  !hasUserSelectedSemester &&
  !hasDefaultedSemester;
