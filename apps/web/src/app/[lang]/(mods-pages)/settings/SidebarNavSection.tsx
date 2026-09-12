// Compatibility exports for the shell's existing sidebar navigation consumer.
// The settings page uses NavigationSection so placement is configured once.
export {
  DEFAULT_SIDEBAR_NAV_ITEMS,
  NavigationSection as SidebarNavSection,
} from "./NavigationSection";
export type {
  NavItemConfig as SidebarNavItemConfig,
  NavItemId as SidebarNavItemId,
} from "./NavigationSection";
