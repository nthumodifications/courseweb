import { ChatMessage as ChatMessageType } from "@/hooks/useAIChat";
import { cn } from "@/lib/utils";
import {
  User,
  Bot,
  Loader2,
  Wrench,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { RichMessageContent } from "./RichMessageContent";
import useDictionary from "@/dictionaries/useDictionary";

interface ChatMessageProps {
  message: ChatMessageType;
}

function humanizeToolName(name: string) {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatToolValue(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ChatMessage({ message }: Readonly<ChatMessageProps>) {
  const isUser = message.role === "user";
  const dict = useDictionary();

  return (
    <div className={cn("flex gap-4", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className="flex flex-col gap-2 max-w-[80%]">
        {!isUser && message.metadata?.provider && (
          <span className="text-[10px] text-muted-foreground">
            {message.metadata.provider}
            {message.metadata.model ? ` · ${message.metadata.model}` : ""}
          </span>
        )}

        {/* Tool calls display */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-col gap-1">
            {message.toolCalls.map((tool, idx) => (
              <details
                key={idx}
                className="rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2">
                  <Wrench className="h-3 w-3" />
                  <span className="font-medium">
                    {humanizeToolName(tool.name)}
                  </span>
                  {tool.result !== undefined && (
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                  )}
                  {tool.error && (
                    <XCircle className="h-3 w-3 text-destructive" />
                  )}
                  {tool.result === undefined && !tool.error && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </summary>
                <div className="mt-2 space-y-2 border-t border-border/60 pt-2">
                  {tool.args && (
                    <div>
                      <p className="font-medium">{dict.chat.tool_args}</p>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[10px]">
                        {formatToolValue(tool.args)}
                      </pre>
                    </div>
                  )}
                  {tool.result !== undefined && (
                    <div>
                      <p className="font-medium">{dict.chat.tool_result}</p>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[10px]">
                        {formatToolValue(tool.result)}
                      </pre>
                    </div>
                  )}
                  {tool.error && (
                    <p className="text-destructive">
                      {dict.chat.tool_error}: {tool.error}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}

        {/* Message content */}
        <div
          className={cn(
            "rounded-lg px-4 py-2",
            isUser ? "bg-primary/20 text-primary-foreground" : "bg-muted",
          )}
        >
          {message.isStreaming &&
          !message.content &&
          (!message.toolCalls || message.toolCalls.length === 0) ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{dict.chat.thinking}</span>
            </div>
          ) : (
            <RichMessageContent content={message.content} />
          )}

          {message.isStreaming && message.content && (
            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
          )}
        </div>
      </div>
    </div>
  );
}
