import {
  DEFAULT_THEME_CONFIG,
  TRANSITION_DURATIONS,
  TransitionSpeed,
} from "@/types/theme";

export const getTransitionDuration = (
  speed: TransitionSpeed | undefined = DEFAULT_THEME_CONFIG.transitionSpeed,
  prefersReducedMotion = false,
) =>
  prefersReducedMotion
    ? TRANSITION_DURATIONS.instant
    : TRANSITION_DURATIONS[speed ?? "default"];
