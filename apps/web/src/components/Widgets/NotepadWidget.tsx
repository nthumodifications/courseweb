import { FC } from "react";
import { WidgetShell } from "./WidgetShell";
import { useLocalStorage } from "usehooks-ts";
import { useSettings } from "@/hooks/contexts/settings";

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
  const { language } = useSettings();
  const [notes, setNotes] = useLocalStorage("widget_notepad_content", "");

  const title = language === "zh" ? "便條紙" : "Notepad";

  return (
    <WidgetShell
      title={title}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={
          language === "zh" ? "寫下你的筆記..." : "Write your notes..."
        }
        className="w-full h-36 p-3 text-sm bg-transparent resize-none outline-none placeholder:text-muted-foreground/50 font-mono"
        spellCheck={false}
      />
    </WidgetShell>
  );
};

export default NotepadWidget;
