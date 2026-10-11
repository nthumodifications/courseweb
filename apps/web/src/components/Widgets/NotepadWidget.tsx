import { FC } from "react";
import { WidgetShell } from "./WidgetShell";
import { useLocalStorage } from "usehooks-ts";
import useDictionary from "@/dictionaries/useDictionary";

interface NotepadWidgetProps {
  onRemove?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

const NotepadWidget: FC<NotepadWidgetProps> = ({
  onRemove,
  dragHandleProps,
  isDragging,
}) => {
  const dict = useDictionary();
  const [notes, setNotes] = useLocalStorage("widget_notepad_content", "");

  const title =
    dict.settings.calendar.widget_dashboard.widget_options.notepad.title;

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <textarea
        aria-label={
          dict.settings.calendar.widget_dashboard.widget_options.notepad.title
        }
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={
          dict.settings.calendar.widget_dashboard.widget_options.notepad
            .placeholder
        }
        className="w-full h-36 p-3 text-sm bg-transparent resize-none outline-none placeholder:text-muted-foreground/50 font-mono"
        spellCheck={false}
      />
    </WidgetShell>
  );
};

export default NotepadWidget;
