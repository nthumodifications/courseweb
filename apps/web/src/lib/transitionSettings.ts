import {
  DEFAULT_THEME_CONFIG,
  TRANSITION_DURATIONS,
  TransitionSpeed,
} from "@/types/theme";

export const getTransitionDuration = (
  speed: TransitionSpeed | undefined = DEFAULT_THEME_CONFIG.transitionSpeed,
  prefersReducedMotion = false,
) => {
  const selectedSpeed = speed ?? "default";
  if (selectedSpeed !== "default" && prefersReducedMotion) {
    return TRANSITION_DURATIONS.instant;
  }
  return TRANSITION_DURATIONS[selectedSpeed];
};

export const getTransitionSpeedAttribute = (
  speed: TransitionSpeed | undefined = DEFAULT_THEME_CONFIG.transitionSpeed,
) => (speed === undefined || speed === "default" ? undefined : speed);
