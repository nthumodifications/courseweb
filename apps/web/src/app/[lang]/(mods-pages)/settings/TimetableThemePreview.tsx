import { timetableColors } from "@courseweb/shared";

export const TimetableThemePreview = ({
  theme,
  label,
  onClick = () => {},
  selected = false,
}: {
  theme: string;
  label: string;
  selected?: boolean;
  onClick?: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-w-0 flex-col gap-2 rounded-md border border-border p-2 text-left transition-colors hover:bg-accent ${selected ? "border-primary bg-primary/10 text-primary" : ""}`}
    >
      <div className="flex min-w-0 flex-row overflow-hidden rounded-sm">
        {timetableColors[theme].map((color, index) => (
          <div
            className="h-4 min-w-0 flex-1"
            style={{ background: color }}
            key={index}
          />
        ))}
      </div>
      <span className="text-sm leading-relaxed">{label}</span>
    </button>
  );
};
