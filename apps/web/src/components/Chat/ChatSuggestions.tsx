import { useChatContext } from "./ChatProvider";
import { Button } from "@courseweb/ui";
import { Search, Calendar, GraduationCap, BookOpen } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";

export function ChatSuggestions() {
  const { sendMessage } = useChatContext();
  const dict = useDictionary();
  const suggestions = [
    {
      icon: Search,
      text: dict.chat.suggestions.machine_learning,
      prompt: dict.chat.suggestions.machine_learning_prompt,
    },
    {
      icon: Calendar,
      text: dict.chat.suggestions.next_timetable,
      prompt: dict.chat.suggestions.next_timetable_prompt,
    },
    {
      icon: GraduationCap,
      text: dict.chat.suggestions.graduation_credits,
      prompt: dict.chat.suggestions.graduation_credits_prompt,
    },
    {
      icon: BookOpen,
      text: dict.chat.suggestions.elective_courses,
      prompt: dict.chat.suggestions.elective_courses_prompt,
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 justify-start">
      {suggestions.map((suggestion, index) => (
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
