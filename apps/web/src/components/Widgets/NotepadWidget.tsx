import { FC, useEffect, useRef } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const title =
    dict.settings.calendar.widget_dashboard.widget_options.notepad.title;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const maxHeight = 192;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [notes]);

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <textarea
        ref={textareaRef}
        rows={3}
        aria-label={
          dict.settings.calendar.widget_dashboard.widget_options.notepad.title
        }
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={
          dict.settings.calendar.widget_dashboard.widget_options.notepad
            .placeholder
        }
        className="w-full min-h-[4.5rem] max-h-48 px-4 py-2 text-sm bg-transparent resize-none overflow-y-hidden outline-none placeholder:text-muted-foreground/50 font-mono"
        spellCheck={false}
      />
    </WidgetShell>
  );
};

export default NotepadWidget;
