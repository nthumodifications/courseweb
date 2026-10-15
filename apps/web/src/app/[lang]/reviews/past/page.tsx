import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { lastSemester } from "@courseweb/shared";
import { Button, Checkbox, Label, Textarea } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useAuth } from "react-oidc-context";
import { toPrettySemester } from "@/helpers/semester";
import { createModuleKey } from "@/lib/modules";
import { normaliseInstructorName } from "@/lib/instructors";
import {
  type Attendance,
  type ExamStyle,
  type Review,
  type ReviewRating,
  useCreateReview,
  useMyReviews,
  useUpdateReview,
} from "@/lib/reviews";
import { ReviewRatingControls } from "@/components/Reviews/ReviewsSection";

const examStyles: ExamStyle[] = [
  "written",
  "oral",
  "project",
  "report",
  "none",
];
const attendanceOptions: Attendance[] = ["none", "sometimes", "every_class"];

type PastRow = {
  key: string;
  moduleKey: string;
  semester: string;
  courseCode: string;
  title: string;
  instructor: string;
  existing?: Review;
};

type Draft = {
  coolness: number;
  sweetness: number;
  learning: number;
  attendance: Attendance;
  examStyle: ExamStyle[];
  body: string;
  bodyOpen: boolean;
};

const initialDraft = (review?: Review): Draft => ({
  coolness: review?.coolness ?? review?.workload ?? 0,
  sweetness: review?.sweetness ?? review?.grading ?? 0,
  learning: review?.learning ?? 0,
  attendance: review?.attendance ?? "none",
  examStyle: [...(review?.examStyle ?? [])],
  body: review?.body ?? "",
  bodyOpen: Boolean(review?.body),
});

const isPastSemester = (semester: string) => semester < lastSemester.id;

const PastReviewPage = () => {
  const dict = useDictionary();
  const auth = useAuth();
  const { lang: rawLang } = useParams<{ lang: string }>();
  const lang = rawLang === "en" || rawLang === "zh-cn" ? rawLang : "zh";
  const timetable = useUserTimetable();
  const mine = useMyReviews();
  const createMutation = useCreateReview();
  const updateMutation = useUpdateReview();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const pastSemesters = useMemo(
    () =>
      Object.keys(timetable.courses)
        .filter(
          (semester) =>
            isPastSemester(semester) && timetable.courses[semester]?.length,
        )
        .sort((left, right) => right.localeCompare(left)),
    [timetable.courses],
  );

  const rows = useMemo<PastRow[]>(() => {
    const reviews = mine.data?.reviews ?? [];
    return pastSemesters.flatMap((semester) =>
      timetable.getSemesterCourses(semester).flatMap((course) => {
        let moduleKey = "";
        try {
          moduleKey = createModuleKey(course.department, course.course);
        } catch {
          return [];
        }
        const teachers = course.teacher_zh?.length ? course.teacher_zh : [""];
        return teachers.map((teacher, index) => {
          const instructor = normaliseInstructorName(teacher);
          const existing = reviews.find(
            (review) =>
              review.source === "native" &&
              review.moduleKey === moduleKey &&
              normaliseInstructorName(review.instructor) === instructor,
          );
          return {
            key: `${course.raw_id}:${instructor || index}`,
            moduleKey,
            semester,
            courseCode: `${course.department} ${course.course}`,
            title:
              lang === "en" ? course.name_en || course.name_zh : course.name_zh,
            instructor,
            existing,
          };
        });
      }),
    );
  }, [
    lang,
    mine.data?.reviews,
    pastSemesters,
    timetable.courses,
    timetable.getSemesterCourses,
  ]);

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      rows.forEach((row) => {
        if (!next[row.key]) next[row.key] = initialDraft(row.existing);
      });
      return next;
    });
  }, [rows]);

  const isAuthenticated =
    auth.isAuthenticated &&
    !auth.user?.expired &&
    Boolean(auth.user?.access_token);
  const updateDraft = (key: string, update: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [key]: { ...current[key], ...update },
    }));
    setSavedKey(null);
  };
  const toggleExamStyle = (draft: Draft, style: ExamStyle, checked: boolean) =>
    checked
      ? style === "none"
        ? (["none"] as ExamStyle[])
        : [...draft.examStyle.filter((value) => value !== "none"), style]
      : draft.examStyle.filter((value) => value !== style);

  const save = (row: PastRow) => {
    const draft = drafts[row.key];
    if (
      !draft ||
      !row.instructor ||
      draft.coolness === 0 ||
      draft.sweetness === 0 ||
      draft.learning === 0
    )
      return;
    setSavingKey(row.key);
    const values = {
      moduleKey: row.moduleKey,
      instructor: row.instructor,
      semester: row.semester,
      coolness: draft.coolness as ReviewRating,
      sweetness: draft.sweetness as ReviewRating,
      learning: draft.learning as ReviewRating,
      attendance: draft.attendance,
      examStyle: draft.examStyle,
      body: draft.body.trim(),
    };
    const finish = {
      onSuccess: () => {
        setSavedKey(row.key);
        setSavingKey(null);
      },
      onSettled: () => setSavingKey(null),
    };
    if (row.existing) {
      updateMutation.mutate(
        {
          id: row.existing.id,
          values: {
            semester: values.semester,
            coolness: values.coolness,
            sweetness: values.sweetness,
            learning: values.learning,
            attendance: values.attendance,
            examStyle: values.examStyle,
            body: values.body,
          },
        },
        finish,
      );
    } else {
      createMutation.mutate(values, finish);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-4 px-4">
        <h1 className="font-bold">
          {dict.course.details.native_reviews.past_page.title}
        </h1>
        <p>{dict.course.details.native_reviews.past_page.sign_in}</p>
        <Button onClick={() => void auth.signinRedirect()}>
          {dict.course.details.native_reviews.sign_in_prompt}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-bold">
          {dict.course.details.native_reviews.past_page.title}
        </h1>
        <Link
          className="text-sm text-muted-foreground underline"
          to={`/${lang}/today`}
        >
          {dict.course.details.native_reviews.cancel}
        </Link>
      </div>
      {rows.length === 0 ? (
        <p>{dict.course.details.native_reviews.past_page.empty}</p>
      ) : (
        pastSemesters.map((semester) => {
          const semesterRows = rows.filter((row) => row.semester === semester);
          if (semesterRows.length === 0) return null;
          return (
            <section className="flex flex-col gap-2" key={semester}>
              <h2 className="font-bold">{toPrettySemester(semester)}</h2>
              <div className="divide-y divide-border">
                {semesterRows.map((row) => {
                  const draft = drafts[row.key] ?? initialDraft(row.existing);
                  const saving = savingKey === row.key;
                  return (
                    <article className="flex flex-col gap-3 py-4" key={row.key}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                          <h3 className="font-medium">
                            {row.courseCode} · {row.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {row.instructor}
                          </p>
                        </div>
                        {row.existing && (
                          <span className="text-sm text-muted-foreground">
                            {
                              dict.course.details.native_reviews.past_page
                                .reviewed
                            }
                          </span>
                        )}
                      </div>
                      <ReviewRatingControls
                        values={draft}
                        onChange={(field, value) =>
                          updateDraft(row.key, { [field]: value })
                        }
                      />
                      <fieldset className="flex flex-col gap-2">
                        <legend className="text-sm font-medium">
                          {dict.course.details.native_reviews.attendance}
                        </legend>
                        <div className="flex min-w-0" role="radiogroup">
                          {attendanceOptions.map((value) => (
                            <Button
                              key={value}
                              type="button"
                              size="sm"
                              variant={
                                draft.attendance === value
                                  ? "default"
                                  : "outline"
                              }
                              className="min-w-0 flex-1 rounded-none px-2 first:rounded-l-md last:rounded-r-md sm:flex-none"
                              onClick={() =>
                                updateDraft(row.key, { attendance: value })
                              }
                            >
                              {
                                dict.course.details.native_reviews[
                                  `attendance_${value}`
                                ]
                              }
                            </Button>
                          ))}
                        </div>
                      </fieldset>
                      <fieldset className="flex flex-wrap gap-2">
                        <legend className="sr-only">
                          {dict.course.details.native_reviews.exam_style}
                        </legend>
                        {examStyles.map((style) => (
                          <Label
                            className="flex items-center gap-2 text-sm font-normal"
                            key={style}
                          >
                            <Checkbox
                              checked={draft.examStyle.includes(style)}
                              onCheckedChange={(checked) =>
                                updateDraft(row.key, {
                                  examStyle: toggleExamStyle(
                                    draft,
                                    style,
                                    checked === true,
                                  ),
                                })
                              }
                            />
                            {
                              dict.course.details.native_reviews[
                                `exam_${style}`
                              ]
                            }
                          </Label>
                        ))}
                      </fieldset>
                      {draft.bodyOpen ? (
                        <div className="flex flex-col gap-2">
                          <Textarea
                            value={draft.body}
                            maxLength={3000}
                            rows={4}
                            placeholder={
                              dict.course.details.native_reviews.past_page
                                .body_placeholder
                            }
                            onChange={(event) =>
                              updateDraft(row.key, { body: event.target.value })
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="self-start h-auto px-2 py-1"
                            onClick={() =>
                              updateDraft(row.key, { bodyOpen: false })
                            }
                          >
                            {
                              dict.course.details.native_reviews.past_page
                                .remove_body
                            }
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="self-start h-auto px-2 py-1"
                          onClick={() =>
                            updateDraft(row.key, { bodyOpen: true })
                          }
                        >
                          {
                            dict.course.details.native_reviews.past_page
                              .add_body
                          }
                        </Button>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            saving ||
                            draft.examStyle.length === 0 ||
                            !row.instructor ||
                            draft.coolness === 0 ||
                            draft.sweetness === 0 ||
                            draft.learning === 0
                          }
                          onClick={() => save(row)}
                        >
                          {saving
                            ? "…"
                            : dict.course.details.native_reviews.past_page.save}
                        </Button>
                        {savedKey === row.key && (
                          <span className="text-sm text-muted-foreground">
                            {dict.course.details.native_reviews.past_page.saved}
                          </span>
                        )}
                        {(createMutation.error || updateMutation.error) &&
                          savingKey === null && (
                            <span className="text-sm text-destructive">
                              {
                                dict.course.details.native_reviews.past_page
                                  .error
                              }
                            </span>
                          )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
};

export default PastReviewPage;
