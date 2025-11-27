"use client";
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

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className="flex flex-col gap-2 max-w-[80%]">
        {/* Tool calls display */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-col gap-1">
            {message.toolCalls.map((tool, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1"
              >
                <Wrench className="w-3 h-3" />
                <span className="font-medium">{tool.name}</span>
                {tool.result !== undefined && (
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                )}
                {tool.error && <XCircle className="w-3 h-3 text-red-600" />}
                {tool.result === undefined && !tool.error && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
              </div>
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
              <span className="text-sm">思考中...</span>
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
