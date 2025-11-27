"use client";
import React, { Suspense } from "react";
import ReactMarkdown from "react-markdown";
import { Skeleton } from "@courseweb/ui";

// Lazy load heavy components
const CourseListRenderer = React.lazy(() => import("./CourseListRenderer"));
const TimetableRenderer = React.lazy(() => import("./TimetableRenderer"));

interface RichMessageContentProps {
  content: string;
}

type ContentPart =
  | { type: "text"; content: string }
  | { type: "course"; rawIds: string[] }
  | { type: "timetable"; rawIds: string[] };

/**
 * Parse message content and extract rich component directives
 * Supported formats:
 * - [course:raw_id1,raw_id2,raw_id3] - Renders course cards
 * - [timetable:raw_id1,raw_id2,raw_id3] - Renders interactive timetable
 */
function parseMessageContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const regex = /\[(course|timetable):([^\]]+)\]/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: content.substring(lastIndex, match.index),
      });
    }

    // Add the component directive
    const componentType = match[1] as "course" | "timetable";
    const rawIds = match[2]
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    parts.push({
      type: componentType,
      rawIds,
    });

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      content: content.substring(lastIndex),
    });
  }

  return parts;
}

export function RichMessageContent({ content }: RichMessageContentProps) {
  const parts = parseMessageContent(content);

  return (
    <div className="space-y-4">
      {parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <div
              key={index}
              className="prose prose-sm dark:prose-invert max-w-none"
            >
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {part.content}
              </ReactMarkdown>
            </div>
          );
        }

        if (part.type === "course") {
          return (
            <Suspense
              key={index}
              fallback={
                <div className="space-y-2">
                  {part.rawIds.map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              }
            >
              <CourseListRenderer rawIds={part.rawIds} />
            </Suspense>
          );
        }

        if (part.type === "timetable") {
          return (
            <Suspense
              key={index}
              fallback={<Skeleton className="h-96 w-full" />}
            >
              <TimetableRenderer rawIds={part.rawIds} />
            </Suspense>
          );
        }

        return null;
      })}
    </div>
  );
}
