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
import { Button } from "@courseweb/ui";
import { Badge } from "@courseweb/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@courseweb/ui";
import { Loader2, Globe, RefreshCw, Camera, Star } from "lucide-react";
import useDictionary from "@/dictionaries/useDictionary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@courseweb/ui";

function TimetableCard({
  share,
  onClick,
}: {
  share: SharedTimetable;
  onClick: () => void;
}) {
  const dict = useDictionary();
  const semesters = share.semesters;
  const firstSem = semesters[0] ?? "";
  const courseIds = share.courses[firstSem] ?? [];
  const courseNoteCount = Object.values(share.courseNotes).filter(
    Boolean,
  ).length;
  const avgDifficulty = share.gradeContext
    ? (() => {
        const diffs = Object.values(share.gradeContext)
          .map((g) => g.difficulty)
          .filter((d): d is number => !!d);
        return diffs.length
          ? Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) /
              10
          : null;
      })()
    : null;

  return (
    <button onClick={onClick} className="flex flex-col gap-2 py-4 text-left">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-sm">
            {share.displayName || toPrettySemester(firstSem)}
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{toPrettySemester(firstSem)}</span>
            <span>{dict.community.separator}</span>
            <span>
              {courseIds.length} {dict.community.courses}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {share.isLive ? (
            <Badge variant="secondary" className="text-xs h-4 px-1">
              <RefreshCw className="h-2 w-2 mr-1" /> {dict.community.live}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs h-4 px-1">
              <Camera className="h-2 w-2 mr-1" /> {dict.community.snapshot}
            </Badge>
          )}
          {avgDifficulty !== null && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-2.5 w-2.5 fill-current" />
              <span>{avgDifficulty}</span>
            </div>
          )}
        </div>
      </div>

      {courseNoteCount > 0 && (
        <div className="flex gap-1 flex-wrap">
          {Object.entries(share.courseNotes)
            .filter(([, note]) => note)
            .slice(0, 2)
            .map(([id, note]) => (
              <Badge key={id} variant="secondary" className="text-xs">
                {note}
              </Badge>
            ))}
          {courseNoteCount > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{courseNoteCount - 2} {dict.community.more}
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
  const navigate = useNavigate();
  const { lang } = useParams<{ lang: string }>();
  const dict = useDictionary();
  const [activeSem, setActiveSem] = useState(share.semesters[0] ?? "");
  const courseIds = share.courses[activeSem] ?? [];

  const { data: courses = [] } = useQuery({
    queryKey: ["courses", [...courseIds].sort()],
    queryFn: async () => {
      if (!courseIds.length) return [];
      const res = await client.course.$get({ query: { courses: courseIds } });
      return res.json() as Promise<MinimalCourse[]>;
    },
    enabled: courseIds.length > 0,
  });

  // Let createTimetableFromCourses generate colors via its default colorMapFromCourses
  const timetableData = createTimetableFromCourses(courses as MinimalCourse[]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4 pr-6">
            <span>{share.displayName || toPrettySemester(activeSem)}</span>
            {share.semesters.length > 1 && (
              <div className="flex gap-1">
                {share.semesters.map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setActiveSem(sem)}
                    className={`px-2 py-0.5 rounded text-xs font-normal border transition-colors ${
                      activeSem === sem
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    {toPrettySemester(sem)}
                  </button>
                ))}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4">
          <Timetable
            timetableData={timetableData}
            renderTimetableSlot={renderTimetableSlot}
          />
          <div className="flex flex-col gap-4">
            {courses.map((course) => {
              const c = course as MinimalCourse;
              const note = share.courseNotes[c.raw_id];
              const grade = share.gradeContext?.[c.raw_id];
              return (
                <div key={c.raw_id} className="flex flex-col gap-1 py-4">
                  <span className="text-sm font-medium">{c.name_zh}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.name_en}
                  </span>
                  {note && (
                    <Badge variant="secondary" className="text-xs w-fit">
                      {note}
                    </Badge>
                  )}
                  {grade && (
                    <div className="flex gap-1 flex-wrap">
                      {grade.grade && (
                        <Badge variant="outline" className="text-xs">
                          {dict.community.grade}: {grade.grade}
                        </Badge>
                      )}
                      {grade.difficulty && (
                        <Badge variant="outline" className="text-xs">
                          {"★".repeat(grade.difficulty)}
                          {"☆".repeat(5 - grade.difficulty)}
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
            <Button
              onClick={() => navigate(`/${lang}/timetable/share/${share.id}`)}
              className="mt-2"
            >
              {dict.community.view_full_page}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const CommunityPage = () => {
  const dict = useDictionary();
  const [selectedSemester, setSelectedSemester] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const [selectedShare, setSelectedShare] = useState<SharedTimetable | null>(
    null,
  );
  const { getPublicGallery } = useTimetableShare();

  const { data, isLoading, isFetching } = useQuery({
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
    <div className="flex flex-col gap-4 px-4 py-4 w-full">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <h1 className="text-base font-bold">{dict.community.title}</h1>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select
          value={selectedSemester}
          onValueChange={(v) => {
            setSelectedSemester(v);
            setOffset(0);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={dict.community.all_semesters} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{dict.community.all_semesters}</SelectItem>
            {semesters.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {toPrettySemester(s.id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data?.items.length === 0 ? (
        <div className="flex flex-col gap-2 py-4 text-muted-foreground">
          <div className="flex flex-row items-center gap-2">
            <Globe className="h-4 w-4 opacity-30" />
            <p className="text-sm">{dict.community.empty}</p>
          </div>
          <p className="text-xs">{dict.community.empty_description}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col divide-y divide-border">
            {data?.items.map((share) => (
              <TimetableCard
                key={share.id}
                share={share}
                onClick={() => setSelectedShare(share)}
              />
            ))}
          </div>

          <div className="flex items-center gap-4">
            {offset > 0 && (
              <Button
                variant="outline"
                onClick={() => setOffset((o) => Math.max(0, o - 24))}
              >
                {dict.community.previous}
              </Button>
            )}
            {data?.hasMore && (
              <Button
                variant="outline"
                onClick={() => setOffset((o) => o + 24)}
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  dict.community.load_more
                )}
              </Button>
            )}
          </div>
        </>
      )}

      {selectedShare && (
        <TimetableDetailDialog
          share={selectedShare}
          onClose={() => setSelectedShare(null)}
        />
      )}
    </div>
  );
};

export default CommunityPage;
