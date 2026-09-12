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

  const title = dict.widgets.notepad_title;

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
        placeholder={dict.widgets.notepad_placeholder}
        className="h-36 w-full resize-none rounded-md bg-transparent p-3 font-mono text-sm outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        spellCheck={false}
      />
    </WidgetShell>
  );
};

export default NotepadWidget;
