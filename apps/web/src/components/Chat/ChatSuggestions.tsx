"use client";
import { useChatContext } from "./ChatProvider";
import { Button } from "@courseweb/ui";
import { Search, Calendar, GraduationCap, BookOpen } from "lucide-react";

const SUGGESTIONS = [
  {
    icon: Search,
    text: "搜尋機器學習相關課程",
    prompt: "幫我搜尋機器學習相關的課程",
  },
  {
    icon: Calendar,
    text: "規劃下學期課表",
    prompt: "根據我目前的課表，幫我規劃下學期可以選什麼課",
  },
  {
    icon: GraduationCap,
    text: "查詢畢業學分",
    prompt: "幫我查詢我的系的畢業學分要求",
  },
  {
    icon: BookOpen,
    text: "推薦選修課程",
    prompt: "推薦一些適合我的選修課程",
  },
];

export function ChatSuggestions() {
  const { sendMessage } = useChatContext();

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {SUGGESTIONS.map((suggestion, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => sendMessage(suggestion.prompt)}
        >
          <suggestion.icon className="w-4 h-4" />
          {suggestion.text}
        </Button>
      ))}
    </div>
  );
}
