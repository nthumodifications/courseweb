import type { CourseSelectionPhase } from "@/lib/course-selection-periods";

// Course-selection phase colours are data identities, like bus route colours.
// They are only used for identity strips and low-alpha background tints.
export const COURSE_SELECTION_PHASE_COLORS: Record<
  CourseSelectionPhase,
  string
> = {
  "round-1": "#2563EB",
  "round-2": "#EA580C",
  "round-3": "#D97706",
  "new-students": "#0D9488",
  "add-drop": "#16A34A",
  "inter-school": "#0891B2",
  withdrawal: "#6D28D9",
};

export const getCourseSelectionPhaseColor = (phase: CourseSelectionPhase) =>
  COURSE_SELECTION_PHASE_COLORS[phase];

export const getCourseSelectionPhaseTint = (phase: CourseSelectionPhase) =>
  `color-mix(in oklab, ${getCourseSelectionPhaseColor(phase)} 12%, hsl(var(--background)))`;
