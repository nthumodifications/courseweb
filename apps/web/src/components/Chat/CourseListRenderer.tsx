import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import CourseListItem from "../Courses/CourseListItem";
import { Skeleton } from "@courseweb/ui";
import { AlertCircle } from "lucide-react";
import { CourseSyllabusView } from "@/config/supabase";
import useDictionary from "@/dictionaries/useDictionary";

interface CourseListRendererProps {
  rawIds: string[];
}

export default function CourseListRenderer({
  rawIds,
}: CourseListRendererProps) {
  const dict = useDictionary();
  const {
    data: courses,
    isLoading,
    error,
  } = useQuery<CourseSyllabusView[]>({
    queryKey: ["courses-bulk", rawIds],
    queryFn: async () => {
      // Fetch each course's details
      const coursePromises = rawIds.map(async (rawId) => {
        try {
          const response = await client.course[":courseId"].$get({
            param: { courseId: rawId },
          });
          if (!response.ok) return null;
          return await response.json();
        } catch {
          return null;
        }
      });

      const results = await Promise.all(coursePromises);
      return results.filter(
        (course): course is CourseSyllabusView => course !== null,
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {rawIds.map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded p-4">
        <AlertCircle className="h-4 w-4" />
        <span>{dict.chat.course_renderer.load_failed}</span>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="text-sm text-muted-foreground bg-muted rounded p-4">
        {dict.chat.course_renderer.no_courses}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {courses.map((course) => (
        <div
          key={course.raw_id}
          className="border-b pb-4 last:border-b-0 last:pb-0"
        >
          <CourseListItem course={course} />
        </div>
      ))}
    </div>
  );
}
