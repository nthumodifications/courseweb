"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/config/firebase";
import supabase from "@/config/supabase";
import { useHeadlessAIS } from "@/hooks/contexts/useHeadlessAIS";
import { getStudentCourses } from "@/lib/headless_ais/courses";
import { useQuery } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { MinimalCourse, selectMinimalStr } from "@/types/courses";
import {
  getStudentCommentState,
  hasUserCommented,
  getUserCommentsCourses,
} from "@/lib/headless_ais/comments";
import { NewCommentDialog } from "@/components/CourseDetails/NewCommentDialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import CommentsNotSignedIn from "@/components/CourseDetails/CommentsNotSignedIn";

const ContributeComment = () => {
  const [user, loading, error] = useAuthState(auth);
  const { getACIXSTORE } = useHeadlessAIS();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["user_courses", user],
    queryFn: async () => {
      const token = await getACIXSTORE();
      if (!token) {
        throw new Error("Failed to fetch user token");
      }
      const res = await getStudentCourses(token);
      if (!res) {
        throw new Error("Failed to fetch student courses.");
      }
      const { data: coursesData, error } = await supabase
        .from("courses")
        .select(selectMinimalStr)
        .in("raw_id", res.courses);
      if (error) throw error;
      if (!coursesData) {
        return [];
      }
      const userCommented = await getUserCommentsCourses();
      return coursesData.map((course, index) => {
        return {
          ...course,
          commented: userCommented.includes(course.raw_id),
        };
      });
    },
    enabled: !!user,
    placeholderData: [],
  });

  const commentedLength = courses.filter((c) => c.commented).length;

  if (!user)
    return (
      <div className="not-prose">
        <CommentsNotSignedIn />
      </div>
    );

  return (
    <Card>
      <CardHeader>
        <CardDescription className="my-0">
          投了{commentedLength}門課程的評論{commentedLength > 0 ? "❤️" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
          <div className="flex flex-col gap-3">
            {courses.map((course, index) => (
              <div className="flex flex-col" key={course.raw_id}>
                <div className="flex flex-row w-full gap-3">
                  {course.commented ? (
                    <Button disabled variant="outline">
                      已評論
                    </Button>
                  ) : (
                    <NewCommentDialog course={course as MinimalCourse} />
                  )}
                  <div className="flex flex-col">
                    <div className="font-bold">
                      {course.name_zh} - {course.teacher_zh.join(",")}
                    </div>
                    <div className="text-sm">
                      {course.name_en} - {course.teacher_en!.join(",")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ContributeComment;
