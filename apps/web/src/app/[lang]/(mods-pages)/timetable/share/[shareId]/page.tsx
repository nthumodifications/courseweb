import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useTimetableShare,
  type SharedTimetable,
} from "@/hooks/useTimetableShare";
import { useAuth } from "react-oidc-context";
import Timetable from "@/components/Timetable/Timetable";
import { createTimetableFromCourses } from "@/helpers/timetable";
import { MinimalCourse } from "@/types/courses";
import { renderTimetableSlot } from "@/helpers/timetable_course";
import client from "@/config/api";
import { toPrettySemester } from "@/helpers/semester";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import { Badge } from "@courseweb/ui";
import { Separator } from "@courseweb/ui";
import { toast } from "@courseweb/ui";
import {
  BookmarkPlus,
  Camera,
  CheckCircle,
  Download,
  Globe,
  Loader2,
  Lock,
  RefreshCw,
  UserCircle,
} from "lucide-react";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import SemesterSwitcher from "@/components/Timetable/SemesterSwitcher";

const ShareViewPage = () => {
  const { shareId } = useParams<{ shareId: string; lang: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { getShareView, saveShare } = useTimetableShare();
  const {
    setSemester,
    semester,
    addCourse,
    setCourses,
    setColorMap,
    currentColors,
  } = useUserTimetable();
  const queryClient = useQueryClient();
  const [selectedSem, setSelectedSem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    data: share,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["share-view", shareId],
    queryFn: () => getShareView(shareId!),
    enabled: !!shareId,
  });

  const availableSemesters = share?.semesters ?? [];
  const activeSem = selectedSem ?? availableSemesters[0] ?? "";
  const courseIds = share?.courses[activeSem] ?? [];

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["courses", [...courseIds].sort()],
    queryFn: async () => {
      if (!courseIds.length) return [];
      const res = await client.course.$get({ query: { courses: courseIds } });
      return res.json();
    },
    enabled: courseIds.length > 0,
  });

  const timetableData = createTimetableFromCourses(
    courses as MinimalCourse[],
    {},
  );
  const totalCredits = (courses as MinimalCourse[]).reduce(
    (acc, c) => acc + (c.credits ?? 0),
    0,
  );

  const saveMutation = useMutation({
    mutationFn: (syncMode: "live" | "snapshot") =>
      saveShare({ sharedTimetableId: shareId!, syncMode }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["saved-timetables"] });
      toast({
        title: "Saved!",
        description: "Found in the Others tab in Calendar.",
      });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleImportSemester = () => {
    const partialColorMap: Record<string, string> = {};
    courseIds.forEach((id, i) => {
      partialColorMap[id] = currentColors[i % currentColors.length];
    });
    addCourse(courseIds);
    setColorMap((prev) => ({ ...prev, ...partialColorMap }));
    setSemester(activeSem);
    navigate(-1);
    toast({
      title: "Courses imported!",
      description: toPrettySemester(activeSem),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !share) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">
          This timetable link is no longer available.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="px-4 py-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold">
              {share.displayName || "Shared Timetable"}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {share.isAnonymous ? (
                <span className="flex items-center gap-1">
                  <UserCircle className="h-3 w-3" /> Anonymous
                </span>
              ) : null}
              {share.isLive ? (
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Live
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Camera className="h-3 w-3" /> Snapshot
                </span>
              )}
              {share.visibility === "public" && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Public
                </span>
              )}
            </div>
          </div>
        </div>

        {availableSemesters.length > 1 && (
          <div className="flex gap-2">
            {availableSemesters.map((sem) => (
              <Button
                key={sem}
                variant={activeSem === sem ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSem(sem)}
              >
                {toPrettySemester(sem)}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] px-2 py-4 md:p-4 gap-4">
        <div className="w-full">
          {coursesLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Timetable
              timetableData={timetableData}
              renderTimetableSlot={renderTimetableSlot}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* Action card */}
          {isAuthenticated ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Save this timetable</CardTitle>
                <CardDescription>
                  View it in your Calendar → Others tab
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-col gap-2">
                {saved ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" /> Saved to your Others tab
                  </div>
                ) : (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => saveMutation.mutate("live")}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Save & follow (live sync)
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => saveMutation.mutate("snapshot")}
                      disabled={saveMutation.isPending}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Save snapshot
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleImportSemester}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Import courses to my timetable
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Want to save this?</CardTitle>
                <CardDescription>
                  Sign in to save and follow this timetable.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button className="w-full" onClick={handleImportSemester}>
                  <Download className="h-4 w-4 mr-2" />
                  Import courses to my timetable
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Course list with notes */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{(courses as MinimalCourse[]).length} courses</span>
              <span>{totalCredits} credits</span>
            </div>
            <Separator />
            {(courses as MinimalCourse[]).map((course) => {
              const note = share.courseNotes[course.raw_id];
              const grade = share.gradeContext?.[course.raw_id];
              return (
                <div
                  key={course.raw_id}
                  className="flex flex-col gap-1 py-2 border-b last:border-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">
                      {course.name_zh}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {course.credits}cr
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {course.name_en}
                  </span>
                  {note && (
                    <Badge variant="secondary" className="text-xs w-fit mt-0.5">
                      {note}
                    </Badge>
                  )}
                  {grade && (
                    <div className="flex gap-2 mt-0.5">
                      {grade.grade && (
                        <Badge variant="outline" className="text-xs">
                          Grade: {grade.grade}
                        </Badge>
                      )}
                      {grade.difficulty && (
                        <Badge variant="outline" className="text-xs">
                          {"★".repeat(grade.difficulty)}
                          {"☆".repeat(5 - grade.difficulty)} difficulty
                        </Badge>
                      )}
                      {grade.attendance && (
                        <Badge variant="outline" className="text-xs">
                          {grade.attendance}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareViewPage;
