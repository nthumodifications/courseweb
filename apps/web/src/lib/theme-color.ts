export type ThemeMode = "light" | "dark";

export const themeColorForMode = (mode: ThemeMode): string =>
  mode === "dark" ? "#171717" : "#ffffff";

export const updateThemeColor = (mode: ThemeMode): void => {
  if (typeof document === "undefined") return;

  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  meta?.setAttribute("content", themeColorForMode(mode));
};
