"use client";
import { Sparkles } from "lucide-react";
import { ChatMessages } from "@/components/Chat/ChatMessages";
import { ChatInput } from "@/components/Chat/ChatInput";
import { ChatSuggestions } from "@/components/Chat/ChatSuggestions";
import { AISettingsDialog } from "@/components/Chat/AISettingsDialog";
import { useChatContext } from "@/components/Chat/ChatProvider";

export function ChatPageContent() {
  const { messages } = useChatContext();

  return (
    <div className="flex flex-col h-[calc(var(--content-height)-1rem)]">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold">AI 課程助手</h1>
                <p className="text-xs text-muted-foreground">
                  搜尋課程 · 規劃課表 · 查詢畢業學分
                </p>
              </div>
            </div>
            <AISettingsDialog />
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden flex flex-col mx-auto max-w-4xl">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <Sparkles className="w-16 h-16 text-muted-foreground mb-6" />
            <h2 className="text-2xl font-semibold mb-2">
              歡迎使用 AI 課程助手
            </h2>
            <p className="text-muted-foreground text-center mb-8 max-w-md">
              我可以幫你搜尋課程、規劃課表、查詢畢業學分。試試下面的建議或直接輸入你的問題！
            </p>
            <ChatSuggestions />
          </div>
        ) : (
          <ChatMessages />
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-4xl">
          <ChatInput />
        </div>
      </div>
    </div>
  );
}
