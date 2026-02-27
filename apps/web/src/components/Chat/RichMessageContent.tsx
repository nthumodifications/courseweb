import React, { Suspense } from "react";
import ReactMarkdown from "react-markdown";
import { Skeleton } from "@courseweb/ui";
import { Link } from "react-router-dom";
import remarkGfm from "remark-gfm";

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
 * Automatically convert course IDs to clickable links
 * Pattern: 5-digit semester + 2-10 char course code + space + 6 digits
 * Example: 11420CS 535100 → [11420CS 535100](https://nthumods.com/courses/11420CS%20535100)
 */
function linkifyCourseIds(content: string): string {
  // Match course ID pattern: YYSSDDDD CCCCCC (where YY=year, SS=semester, D=dept, C=course)
  const courseIdRegex = /\b(\d{5}[A-Z]{2,10}\s+\d{6})\b/g;

  return content.replace(courseIdRegex, (match, p1, offset) => {
    // Check if already inside a markdown link by looking backwards for unmatched [
    const beforeMatch = content.substring(0, offset);
    const lastOpenBracket = beforeMatch.lastIndexOf("[");
    const lastCloseBracket = beforeMatch.lastIndexOf("]");

    // If there's an open bracket after the last close bracket, we're inside a link
    if (lastOpenBracket > lastCloseBracket) {
      return match; // Don't linkify
    }

    const encodedId = encodeURIComponent(match);
    return `[${match}](https://nthumods.com/courses/${encodedId})`;
  });
}

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
              className="prose prose-sm dark:prose-invert max-w-none prose-table:text-sm"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80"
                    >
                      {children}
                    </a>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="border-collapse border border-border w-full">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="border border-border px-3 py-2 text-left font-semibold">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-border px-3 py-2">
                      {children}
                    </td>
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
