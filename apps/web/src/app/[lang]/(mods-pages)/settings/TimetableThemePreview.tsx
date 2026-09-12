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
      aria-label={label}
      className={`flex min-h-10 flex-col gap-2 rounded-md border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-accent hover:text-accent-foreground"}`}
    >
      <div className="flex flex-row">
        {timetableColors[theme].map((color, index) => (
          <div
            className="flex-1 h-4 w-4"
            style={{ background: color }}
            key={index}
          />
        ))}
      </div>
      <span className="text-sm">{label}</span>
    </button>
  );
};
