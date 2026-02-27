import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import client from "@/config/api";
import { Button, Skeleton } from "@courseweb/ui";
import { AlertCircle, Plus, Calendar } from "lucide-react";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";

interface TimetableRendererProps {
  rawIds: string[];
}

export default function TimetableRenderer({ rawIds }: TimetableRendererProps) {
  const { addCourse } = useUserTimetable();
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
      alert(`已將 ${courses.length} 門課加入課表`);
    } catch (error) {
      alert("加入課表失敗");
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
      <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded p-3">
        <AlertCircle className="h-4 w-4" />
        <span>Failed to load timetable</span>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="text-sm text-muted-foreground bg-muted rounded p-3">
        No courses found
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">建議課表</h3>
        </div>
        <Button
          onClick={handleAddToTimetable}
          disabled={isAdding}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {isAdding ? "加入中..." : "加入我的課表"}
        </Button>
      </div>

      <div className="bg-background rounded-lg p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          包含 {courses.length} 門課程：
        </p>
        {courses.map((course) => (
          <div
            key={course.raw_id}
            className="flex justify-between items-start p-3 bg-muted/50 rounded border"
          >
            <div className="space-y-1">
              <p className="font-medium">{course.name_zh}</p>
              <p className="text-sm text-muted-foreground">
                {course.teacher_zh?.join(", ")}
              </p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                {course.times && course.times.length > 0 && (
                  <span>⏰ {course.times[0]}</span>
                )}
                {course.venues && course.venues.length > 0 && (
                  <span>📍 {course.venues[0]}</span>
                )}
              </div>
            </div>
            <span className="text-sm font-medium text-primary">
              {course.credits} 學分
            </span>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 rounded p-2">
        💡 提示：點擊「加入我的課表」可將所有課程直接加入你的選課清單
      </div>
    </div>
  );
}
