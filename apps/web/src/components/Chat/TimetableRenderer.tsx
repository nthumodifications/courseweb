import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import { Button, Skeleton } from "@courseweb/ui";
import { AlertCircle, Plus, Calendar, Clock, MapPin } from "lucide-react";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import useDictionary from "@/dictionaries/useDictionary";

interface TimetableRendererProps {
  rawIds: string[];
}

export default function TimetableRenderer({ rawIds }: TimetableRendererProps) {
  const { addCourse } = useUserTimetable();
  const dict = useDictionary();
  const [isAdding, setIsAdding] = useState(false);

  const {
    data: courses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["timetable-courses", rawIds],
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
        (course): course is NonNullable<typeof course> => course !== null,
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleAddToTimetable = async () => {
    if (!courses) return;

    setIsAdding(true);
    try {
      for (const course of courses) {
        await addCourse(course.raw_id);
      }
      alert(
        dict.chat.timetable_renderer.add_success.replace(
          "{count}",
          String(courses.length),
        ),
      );
    } catch (error) {
      alert(dict.chat.timetable_renderer.add_failed);
      console.error(error);
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded p-4">
        <AlertCircle className="h-4 w-4" />
        <span>{dict.chat.timetable_renderer.load_failed}</span>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="text-sm text-muted-foreground bg-muted rounded p-4">
        {dict.chat.timetable_renderer.no_courses}
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-muted/30 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-medium">{dict.chat.timetable_renderer.title}</h3>
        </div>
        <Button
          onClick={handleAddToTimetable}
          disabled={isAdding}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {isAdding
            ? dict.chat.timetable_renderer.adding
            : dict.chat.timetable_renderer.add}
        </Button>
      </div>

      <div className="bg-background rounded-lg p-4 flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {dict.chat.timetable_renderer.contains} {courses.length}{" "}
          {dict.chat.timetable_renderer.courses_suffix}
        </p>
        {courses.map((course) => (
          <div
            key={course.raw_id}
            className="flex justify-between items-start p-4 bg-muted/50 rounded border"
          >
            <div className="flex flex-col gap-1">
              <p className="font-medium">{course.name_zh}</p>
              <p className="text-sm text-muted-foreground">
                {course.teacher_zh?.join(", ")}
              </p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                {course.times && course.times.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {course.times[0]}
                  </span>
                )}
                {course.venues && course.venues.length > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {course.venues[0]}
                  </span>
                )}
              </div>
            </div>
            <span className="text-sm font-medium text-primary">
              {course.credits} {dict.chat.timetable_renderer.credits_suffix}
            </span>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground bg-muted rounded p-2">
        {dict.chat.timetable_renderer.tip}
      </div>
    </div>
  );
}
