import { useState, useRef, KeyboardEvent } from "react";
import { useChatContext } from "./ChatProvider";
import { Button } from "@courseweb/ui";
import { Textarea } from "@courseweb/ui";
import { Send, Square } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";

export function ChatInput() {
  const [input, setInput] = useState("");
  const { sendMessage, isLoading, cancel } = useChatContext();
  const dict = useDictionary();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput("");
    await sendMessage(message);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 border-t">
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={dict.chat.input_placeholder}
          className="min-h-[44px] max-h-[200px] resize-none"
          rows={1}
          disabled={isLoading}
        />

        {isLoading ? (
          <Button variant="destructive" size="icon" onClick={cancel}>
            <Square className="w-4 h-4" />
          </Button>
        ) : (
          <Button size="icon" onClick={handleSubmit} disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2 text-center">
        {dict.chat.keyboard_hint}
      </p>
    </div>
  );
}
