// Compatibility exports for the shell's existing bottom navigation consumer.
// The settings page uses NavigationSection so placement is configured once.
export {
  DEFAULT_NAV_ITEMS,
  NavigationSection as BottomNavSection,
} from "./NavigationSection";
export type { NavItemConfig, NavItemId } from "./NavigationSection";
