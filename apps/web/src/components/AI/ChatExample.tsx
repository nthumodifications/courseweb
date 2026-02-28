import { useAIChat } from "@/hooks/useAIChat";
import { Button, Input } from "@courseweb/ui";
import { useState } from "react";

/**
 * Example component demonstrating how to use the useAIChat hook
 * This component shows how the AI chat integrates with user timetable data
 */
export function ChatExample() {
  const { messages, isLoading, sendMessage, clear, getUserContext } =
    useAIChat();
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get current user context to display
  const context = getUserContext();

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto p-4">
      <div className="mb-4 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Current Context</h3>
        <div className="text-sm space-y-1">
          <p>
            <strong>Department:</strong> {context.department || "Not set"}
          </p>
          <p>
            <strong>Entrance Year:</strong> {context.entranceYear || "Not set"}
          </p>
          <p>
            <strong>Semester:</strong> {context.currentSemester || "N/A"}
          </p>
          <p>
            <strong>Current Year:</strong> {context.currentYear || "N/A"}
          </p>
          <p>
            <strong>Course History:</strong>{" "}
            {context.courseHistory?.reduce(
              (sum, sem) => sum + sem.courses.length,
              0,
            ) || 0}{" "}
            courses across {context.courseHistory?.length || 0} semesters
          </p>
          {context.courseHistory && context.courseHistory.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer">View course history</summary>
              <div className="mt-1 space-y-2">
                {context.courseHistory.map((sem) => (
                  <div key={sem.semester} className="text-xs">
                    <strong>
                      {sem.year} Semester {sem.semesterNumber}:
                    </strong>
                    <ul className="list-disc list-inside ml-4">
                      {sem.courses.map((course) => (
                        <li key={course.raw_id} className="font-mono">
                          {course.name_zh || course.name_en} ({course.raw_id})
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-3 rounded-lg ${
              message.role === "user"
                ? "bg-primary text-primary-foreground ml-12"
                : "bg-muted mr-12"
            }`}
          >
            <div className="text-sm font-semibold mb-1">
              {message.role === "user" ? "You" : "AI Assistant"}
            </div>
            <div className="whitespace-pre-wrap">
              {message.content}
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about courses, requirements, or your schedule..."
          disabled={isLoading}
        />
        <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
          {isLoading ? "Sending..." : "Send"}
        </Button>
        <Button
          variant="outline"
          onClick={clear}
          disabled={messages.length === 0}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
