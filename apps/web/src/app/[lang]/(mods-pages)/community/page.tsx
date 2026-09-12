import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  useTimetableShare,
  type SharedTimetable,
} from "@/hooks/useTimetableShare";
import client from "@/config/api";
import { toPrettySemester } from "@/helpers/semester";
import { semesterInfo } from "@courseweb/shared";
import { MinimalCourse } from "@/types/courses";
import { createTimetableFromCourses } from "@/helpers/timetable";
import Timetable from "@/components/Timetable/Timetable";
import { renderTimetableSlot } from "@/helpers/timetable_course";
import { ErrorState } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  PageHeader,
  PageShell,
  PageSkeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { Camera, Globe, Loader2, RefreshCw, Star } from "lucide-react";

function TimetableCard({
  share,
  onClick,
}: {
  share: SharedTimetable;
  onClick: () => void;
}) {
  const dict = useDictionary().community;
  const semesters = share.semesters;
  const firstSem = semesters[0] ?? "";
  const courseIds = share.courses[firstSem] ?? [];
  const courseNoteCount = Object.values(share.courseNotes).filter(
    Boolean,
  ).length;
  const avgDifficulty = share.gradeContext
    ? (() => {
        const diffs = Object.values(share.gradeContext)
          .map((grade) => grade.difficulty)
          .filter((difficulty): difficulty is number => !!difficulty);
        return diffs.length
          ? Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) /
              10
          : null;
      })()
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-medium">
            {share.displayName || toPrettySemester(firstSem)}
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{toPrettySemester(firstSem)}</span>
            <span aria-hidden="true">·</span>
            <span>
              {courseIds.length} {dict.courses_unit}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {share.isLive ? (
            <Badge variant="secondary">
              <RefreshCw aria-hidden="true" />
              {dict.live}
            </Badge>
          ) : (
            <Badge variant="outline">
              <Camera aria-hidden="true" />
              {dict.snapshot}
            </Badge>
          )}
          {avgDifficulty !== null && (
            <div className="flex items-center gap-1 text-xs text-warning">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              <span>
                {dict.difficulty} {avgDifficulty}
              </span>
            </div>
          )}
        </div>
      </div>

      {courseNoteCount > 0 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(share.courseNotes)
            .filter(([, note]) => note)
            .slice(0, 2)
            .map(([id, note]) => (
              <Badge key={id} variant="secondary" className="max-w-[120px] truncate">
                {note}
              </Badge>
            ))}
          {courseNoteCount > 2 && (
            <Badge variant="secondary">
              {dict.more_notes.replace("{count}", String(courseNoteCount - 2))}
            </Badge>
          )}
        </div>
      )}
    </button>
  );
}

function TimetableDetailDialog({
  share,
  onClose,
}: {
  share: SharedTimetable;
  onClose: () => void;
}) {
  const dictionary = useDictionary();
  const dict = dictionary.community;
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const [activeSem, setActiveSem] = useState(share.semesters[0] ?? "");
  const courseIds = share.courses[activeSem] ?? [];

  const {
    data: courses = [],
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["courses", [...courseIds].sort()],
    queryFn: async () => {
      if (!courseIds.length) return [];
      const res = await client.course.$get({ query: { courses: courseIds } });
      return res.json() as Promise<MinimalCourse[]>;
    },
    enabled: courseIds.length > 0,
  });

  const timetableData = createTimetableFromCourses(courses as MinimalCourse[]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[80vh] max-w-4xl overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4 pr-6">
            <span>{share.displayName || toPrettySemester(activeSem)}</span>
            {share.semesters.length > 1 && (
              <div className="flex gap-2">
                {share.semesters.map((semester) => (
                  <button
                    key={semester}
                    type="button"
                    onClick={() => setActiveSem(semester)}
                    className={`rounded-md border px-2 py-1 text-xs font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      activeSem === semester
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    {toPrettySemester(semester)}
                  </button>
                ))}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <PageSkeleton rows={5} />
        ) : error ? (
          <ErrorState
            size="sm"
            title={dict.load_error_title}
            description={dict.load_error_description}
            retryLabel={dictionary.common.try_again}
            onRetry={() => void refetch()}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[3fr_2fr]">
            <Timetable
              timetableData={timetableData}
              renderTimetableSlot={renderTimetableSlot}
            />
            <div className="flex flex-col gap-3">
              {courses.map((course) => {
                const currentCourse = course as MinimalCourse;
                const note = share.courseNotes[currentCourse.raw_id];
                const grade = share.gradeContext?.[currentCourse.raw_id];
                return (
                  <div
                    key={currentCourse.raw_id}
                    className="flex flex-col gap-1 border-b border-border py-2 last:border-0"
                  >
                    <span className="text-sm font-medium">
                      {currentCourse.name_zh}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {currentCourse.name_en}
                    </span>
                    {note && <Badge variant="secondary">{note}</Badge>}
                    {grade && (
                      <div className="flex flex-wrap gap-1">
                        {grade.grade && (
                          <Badge variant="outline">
                            {dict.grade}: {grade.grade}
                          </Badge>
                        )}
                        {grade.difficulty && (
                          <Badge variant="outline">
                            {dict.difficulty}: {"★".repeat(grade.difficulty)}
                            {"☆".repeat(5 - grade.difficulty)}
                          </Badge>
                        )}
                        {grade.attendance && (
                          <Badge variant="outline">
                            {dict.attendance}: {grade.attendance}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <Button
                type="button"
                onClick={() => navigate(`/${lang}/timetable/share/${share.id}`)}
              >
                {dict.view_full_page}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const CommunityPage = () => {
  const dictionary = useDictionary();
  const dict = dictionary.community;
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [offset, setOffset] = useState(0);
  const [selectedShare, setSelectedShare] = useState<SharedTimetable | null>(
    null,
  );
  const { getPublicGallery } = useTimetableShare();

  const { data, error, isFetching, isLoading, refetch } = useQuery({
    queryKey: ["public-timetables", selectedSemester, offset],
    queryFn: () =>
      getPublicGallery({
        semester: selectedSemester === "all" ? undefined : selectedSemester,
        limit: 24,
        offset,
      }),
  });

  const semesters = [...semesterInfo].reverse().slice(0, 10);

  return (
    <PageShell width="app">
      <PageHeader title={dict.title} description={dict.description} />
      <section className="space-y-3">
        <Select
          value={selectedSemester}
          onValueChange={(value) => {
            setSelectedSemester(value);
            setOffset(0);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={dict.all_semesters} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{dict.all_semesters}</SelectItem>
            {semesters.map((semester) => (
              <SelectItem key={semester.id} value={semester.id}>
                {toPrettySemester(semester.id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading ? (
          <PageSkeleton rows={6} />
        ) : error || !data ? (
          <ErrorState
            title={dict.load_error_title}
            description={dict.load_error_description}
            retryLabel={dictionary.common.try_again}
            onRetry={() => void refetch()}
          />
        ) : data.items.length === 0 ? (
          <EmptyState
            size="default"
            icon={Globe}
            title={dict.empty_title}
            description={dict.empty_description}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((share) => (
                <TimetableCard
                  key={share.id}
                  share={share}
                  onClick={() => setSelectedShare(share)}
                />
              ))}
            </div>

            <div className="flex items-center justify-center gap-4">
              {offset > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOffset((value) => Math.max(0, value - 24))}
                >
                  {dict.previous}
                </Button>
              )}
              {data.hasMore && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOffset((value) => value + 24)}
                >
                  {isFetching ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    dict.load_more
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </section>

      {selectedShare && (
        <TimetableDetailDialog
          share={selectedShare}
          onClose={() => setSelectedShare(null)}
        />
      )}
    </PageShell>
  );
};

export default CommunityPage;
