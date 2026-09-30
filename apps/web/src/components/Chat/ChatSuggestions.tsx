import { useChatContext } from "./ChatProvider";
import { Button } from "@courseweb/ui";
import {
  Search,
  Calendar,
  GraduationCap,
  Bus,
  Clock,
  AlertTriangle,
} from "lucide-react";
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
      icon: Clock,
      text: dict.chat.suggestions.free_periods,
      prompt: dict.chat.suggestions.free_periods_prompt,
    },
    {
      icon: AlertTriangle,
      text: dict.chat.suggestions.timetable_conflicts,
      prompt: dict.chat.suggestions.timetable_conflicts_prompt,
    },
    {
      icon: GraduationCap,
      text: dict.chat.suggestions.graduation_credits,
      prompt: dict.chat.suggestions.graduation_credits_prompt,
    },
    {
      icon: Bus,
      text: dict.chat.suggestions.bus,
      prompt: dict.chat.suggestions.bus_prompt,
    },
    {
      icon: Calendar,
      text: dict.chat.suggestions.academic_calendar,
      prompt: dict.chat.suggestions.academic_calendar_prompt,
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
