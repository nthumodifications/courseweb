const FOLDER_COLOR_DOT_CLASS: Record<string, string> = {
  neutral: "bg-neutral-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-500",
  lime: "bg-lime-500",
  green: "bg-green-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  sky: "bg-sky-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  fuchsia: "bg-fuchsia-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
};

export const FOLDER_COLOR_NAMES = Object.keys(FOLDER_COLOR_DOT_CLASS);

export function getFolderColorDotClass(color?: string | null) {
  return (
    FOLDER_COLOR_DOT_CLASS[color ?? "neutral"] ?? FOLDER_COLOR_DOT_CLASS.neutral
  );
}
