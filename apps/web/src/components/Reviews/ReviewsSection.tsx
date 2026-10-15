import { useRef, useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  ErrorState,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { contentLanguage } from "@/helpers/contentLanguage";
import { toPrettySemester } from "@/helpers/semester";
import { ModuleStat } from "@/components/Courses/ModuleInsights";
import { normaliseInstructorName } from "@/lib/instructors";
import { parseModuleKey } from "@/lib/modules";
import {
  type Attendance,
  type ExamStyle,
  type ReportReason,
  type Review,
  type ReviewApiError,
  type ReviewInput,
  reviewSummaryHasAverages,
  useCreateReview,
  useDeleteReview,
  useMyReviews,
  useReportReview,
  useReviews,
  useUpdateReview,
} from "@/lib/reviews";

type Dictionary = ReturnType<typeof useDictionary>;

const examStyles: ExamStyle[] = [
  "written",
  "oral",
  "project",
  "report",
  "none",
];
const attendanceOptions: Attendance[] = ["none", "sometimes", "every_class"];
const ratingFields = [
  {
    field: "workload",
    label: "workload",
    lowLabel: "workload_low",
    highLabel: "workload_high",
  },
  {
    field: "grading",
    label: "grading",
    lowLabel: "grading_low",
    highLabel: "grading_high",
  },
  {
    field: "learning",
    label: "learning",
    lowLabel: "learning_low",
    highLabel: "learning_high",
  },
] as const;

export const recentReviewSemesters = () => {
  const now = new Date();
  const academicYear = now.getFullYear() - 1911 - (now.getMonth() < 8 ? 1 : 0);
  return Array.from({ length: 15 }, (_, index) => {
    const offset = Math.floor(index / 3);
    const term = 3 - (index % 3);
    return `${academicYear - offset}${term}`;
  });
};

export type ReviewFormValidation =
  | "required"
  | "body_too_short"
  | "body_too_long"
  | null;

export const validateReviewForm = (values: {
  instructor: string;
  semester: string;
  workload: number;
  grading: number;
  learning: number;
  examStyle: readonly ExamStyle[];
  body: string;
}): ReviewFormValidation => {
  if (
    !values.instructor ||
    !values.semester ||
    values.workload === 0 ||
    values.grading === 0 ||
    values.learning === 0 ||
    values.examStyle.length === 0
  ) {
    return "required";
  }
  const length = values.body.trim().length;
  if (length < 30) return "body_too_short";
  if (length > 3000) return "body_too_long";
  return null;
};

export const toggleExamStyles = (
  current: readonly ExamStyle[],
  style: ExamStyle,
  checked: boolean,
) => {
  if (!checked) return current.filter((value) => value !== style);
  if (style === "none") return ["none"] as ExamStyle[];
  return [
    ...current.filter((value) => value !== "none" && value !== style),
    style,
  ];
};

const relativeDate = (value: string, lang: "zh" | "en" | "zh-cn") => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const seconds = (date.getTime() - Date.now()) / 1000;
  const absolute = Math.abs(seconds);
  const [amount, unit] =
    absolute < 60
      ? [seconds, "second"]
      : absolute < 3600
        ? [seconds / 60, "minute"]
        : absolute < 86400
          ? [seconds / 3600, "hour"]
          : absolute < 2592000
            ? [seconds / 86400, "day"]
            : absolute < 31536000
              ? [seconds / 2592000, "month"]
              : [seconds / 31536000, "year"];
  const locale =
    contentLanguage(lang) === "en"
      ? "en"
      : lang === "zh-cn"
        ? "zh-CN"
        : "zh-TW";
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    Math.round(amount),
    unit as Intl.RelativeTimeFormatUnit,
  );
};

const errorMessage = (
  error: unknown,
  dict: Dictionary,
  operation: "review" | "report" | "delete" = "review",
) => {
  const apiError = error as Partial<ReviewApiError> | undefined;
  if (
    operation === "delete" &&
    (apiError?.status === 404 || apiError?.code === "not_found")
  ) {
    return dict.course.details.native_reviews.error_delete_not_found;
  }
  switch (apiError?.code) {
    case "already_reviewed":
      return dict.course.details.native_reviews.error_already_reviewed;
    case "rate_limited":
      return operation === "report"
        ? dict.course.details.native_reviews.error_report_rate_limited
        : dict.course.details.native_reviews.error_rate_limited;
    case "banned":
      return dict.course.details.native_reviews.error_banned;
    case "removed":
      return dict.course.details.native_reviews.error_removed;
    case "request_failed":
      if (operation === "delete" && apiError.status === 404) {
        return dict.course.details.native_reviews.error_delete_not_found;
      }
      return operation === "delete"
        ? dict.course.details.native_reviews.error_delete_generic
        : dict.course.details.native_reviews.error_generic;
    default:
      return operation === "delete"
        ? dict.course.details.native_reviews.error_delete_generic
        : dict.course.details.native_reviews.error_generic;
  }
};

type ReviewFormProps = {
  moduleKey: string;
  instructorOptions: string[];
  semesterOptions: string[];
  review?: Review;
  onCancel: () => void;
  onSaved: () => void;
  onAlreadyReviewed?: (id: string) => void;
};

const ReviewForm = ({
  moduleKey,
  instructorOptions,
  semesterOptions,
  review,
  onCancel,
  onSaved,
  onAlreadyReviewed,
}: ReviewFormProps) => {
  const dict = useDictionary();
  const createMutation = useCreateReview();
  const updateMutation = useUpdateReview();
  const [instructor, setInstructor] = useState(
    review?.instructor ?? instructorOptions[0] ?? "",
  );
  const [semester, setSemester] = useState(
    review?.semester ?? semesterOptions[0] ?? recentReviewSemesters()[0],
  );
  const [workload, setWorkload] = useState<number>(review?.workload ?? 0);
  const [grading, setGrading] = useState<number>(review?.grading ?? 0);
  const [learning, setLearning] = useState<number>(review?.learning ?? 0);
  const [attendance, setAttendance] = useState<Attendance>(
    review?.attendance ?? "none",
  );
  const [selectedExamStyles, setSelectedExamStyles] = useState<ExamStyle[]>([
    ...(review?.examStyle ?? []),
  ]);
  const [body, setBody] = useState(review?.body ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);
  const submissionStarted = useRef(false);
  const mutation = review ? updateMutation : createMutation;
  const semesters = Array.from(
    new Set(
      semesterOptions.length > 0 ? semesterOptions : recentReviewSemesters(),
    ),
  );

  const ratingValues = { workload, grading, learning };
  const setRating = (
    field: (typeof ratingFields)[number]["field"],
    value: number,
  ) => {
    if (field === "workload") setWorkload(value);
    if (field === "grading") setGrading(value);
    if (field === "learning") setLearning(value);
  };

  const toggleExamStyle = (style: ExamStyle, checked: boolean) => {
    setSelectedExamStyles((current) =>
      toggleExamStyles(current, style, checked),
    );
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionStarted.current || mutation.isPending) return;
    const trimmedBody = body.trim();
    const validation = validateReviewForm({
      instructor,
      semester,
      workload,
      grading,
      learning,
      examStyle: selectedExamStyles,
      body,
    });
    if (validation) {
      setValidationError(dict.course.details.native_reviews[validation]);
      return;
    }
    submissionStarted.current = true;
    setValidationError(null);
    const values: ReviewInput = {
      moduleKey,
      instructor,
      semester,
      workload: workload as ReviewInput["workload"],
      grading: grading as ReviewInput["grading"],
      learning: learning as ReviewInput["learning"],
      attendance,
      examStyle: selectedExamStyles,
      body: trimmedBody,
    };
    if (review) {
      updateMutation.mutate(
        {
          id: review.id,
          values: {
            semester,
            workload: values.workload,
            grading: values.grading,
            learning: values.learning,
            attendance,
            examStyle: selectedExamStyles,
            body: trimmedBody,
          },
        },
        {
          onSuccess: onSaved,
          onSettled: () => {
            submissionStarted.current = false;
          },
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: onSaved,
        onError: (error) => {
          const details =
            error instanceof Error && "details" in error
              ? (error as ReviewApiError).details
              : undefined;
          const id =
            typeof details === "object" && details !== null && "id" in details
              ? details.id
              : undefined;
          if (
            error instanceof Error &&
            "code" in error &&
            (error as ReviewApiError).code === "already_reviewed" &&
            typeof id === "string"
          ) {
            onAlreadyReviewed?.(id);
          }
        },
        onSettled: () => {
          submissionStarted.current = false;
        },
      });
    }
  };

  return (
    <form className="flex flex-col gap-4 py-4" onSubmit={submit}>
      <div className="flex flex-col gap-2">
        <h3 className="font-bold">
          {review
            ? dict.course.details.native_reviews.form_edit_title
            : dict.course.details.native_reviews.form_create_title}
        </h3>
        <p className="text-sm text-muted-foreground">
          {dict.course.details.native_reviews.anonymous_note}
        </p>
      </div>
      {instructorOptions.length > 1 && !review && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="review-instructor">
            {dict.course.details.native_reviews.instructor}
          </Label>
          <Select value={instructor} onValueChange={setInstructor}>
            <SelectTrigger id="review-instructor">
              <SelectValue
                placeholder={
                  dict.course.details.native_reviews.select_instructor
                }
              />
            </SelectTrigger>
            <SelectContent>
              {instructorOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="review-semester">
          {dict.course.details.native_reviews.semester}
        </Label>
        <Select value={semester} onValueChange={setSemester}>
          <SelectTrigger id="review-semester">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {semesters.map((value) => (
              <SelectItem key={value} value={value}>
                {toPrettySemester(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-4">
        {ratingFields.map(({ field, label, lowLabel, highLabel }) => (
          <fieldset className="flex flex-col gap-2" key={field}>
            <legend className="text-sm font-medium">
              {dict.course.details.native_reviews[label]}
            </legend>
            <div className="flex min-w-0 items-center gap-2">
              <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                {dict.course.details.native_reviews[lowLabel]}
              </span>
              <div
                className="flex min-w-0 flex-1"
                role="radiogroup"
                aria-label={dict.course.details.native_reviews[label]}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={
                      ratingValues[field] === value ? "default" : "outline"
                    }
                    className="min-w-0 flex-1 rounded-none px-2 first:rounded-l-md last:rounded-r-md"
                    aria-pressed={ratingValues[field] === value}
                    onClick={() => setRating(field, value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
              <span className="w-10 shrink-0 text-xs text-muted-foreground">
                {dict.course.details.native_reviews[highLabel]}
              </span>
            </div>
          </fieldset>
        ))}
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">
          {dict.course.details.native_reviews.attendance}
        </legend>
        <div
          className="flex min-w-0"
          role="radiogroup"
          aria-label={dict.course.details.native_reviews.attendance}
        >
          {attendanceOptions.map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={attendance === value ? "default" : "outline"}
              className="min-w-0 flex-1 rounded-none px-2 first:rounded-l-md last:rounded-r-md sm:flex-none"
              aria-pressed={attendance === value}
              onClick={() => setAttendance(value)}
            >
              {dict.course.details.native_reviews[`attendance_${value}`]}
            </Button>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">
          {dict.course.details.native_reviews.exam_style}
        </legend>
        <div className="flex flex-wrap gap-2">
          {examStyles.map((style) => (
            <Label
              className="flex items-center gap-2 text-sm font-normal"
              key={style}
            >
              <Checkbox
                checked={selectedExamStyles.includes(style)}
                onCheckedChange={(checked) =>
                  toggleExamStyle(style, checked === true)
                }
              />
              {dict.course.details.native_reviews[`exam_${style}`]}
            </Label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <Label htmlFor="review-body">
          {dict.course.details.native_reviews.body}
        </Label>
        <Textarea
          id="review-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={3000}
          rows={6}
        />
        <div className="flex justify-between gap-2 text-xs text-muted-foreground">
          <span>{dict.course.details.native_reviews.body_hint}</span>
          <span>
            {dict.course.details.native_reviews.characters.replace(
              "{count}",
              String(body.length),
            )}
          </span>
        </div>
      </div>
      {(validationError || mutation.error) && (
        <Alert variant="destructive">
          <AlertDescription>
            {validationError ?? errorMessage(mutation.error, dict)}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {dict.course.details.native_reviews.save}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {dict.course.details.native_reviews.cancel}
        </Button>
      </div>
    </form>
  );
};

type ReviewsSectionProps = {
  lang?: "zh" | "en" | "zh-cn";
  moduleKey?: string;
  instructor?: string;
  instructors?: string[];
  semesterOptions?: string[];
  courseLabels?: Record<string, string>;
  allowInstructorFilter?: boolean;
};

export const ReviewsSection = ({
  lang = "zh",
  moduleKey,
  instructor,
  instructors = [],
  semesterOptions = [],
  courseLabels,
  allowInstructorFilter = false,
}: ReviewsSectionProps) => {
  const dict = useDictionary();
  const auth = useAuth();
  const normalizedInstructors = useMemo(
    () => [
      ...new Set(instructors.map(normaliseInstructorName).filter(Boolean)),
    ],
    [instructors],
  );
  const [selectedInstructor, setSelectedInstructor] = useState(
    instructor ? normaliseInstructorName(instructor) : "",
  );
  const [formMode, setFormMode] = useState<"create" | Review | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("other");
  const [reportNote, setReportNote] = useState("");
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const reportReasonRef = useRef<HTMLButtonElement | null>(null);
  const reportTriggerRef = useRef<HTMLButtonElement | null>(null);
  const targetInstructor = instructor
    ? normaliseInstructorName(instructor)
    : allowInstructorFilter && selectedInstructor
      ? normaliseInstructorName(selectedInstructor)
      : undefined;
  const { data, error, isLoading, refetch } = useReviews({
    moduleKey,
    instructor: targetInstructor,
  });
  const { refetch: refetchMine } = useMyReviews();
  const deleteMutation = useDeleteReview();
  const reportMutation = useReportReview();
  const isReviewAuthenticated =
    auth.isAuthenticated &&
    !auth.user?.expired &&
    Boolean(auth.user?.access_token);
  useEffect(
    () =>
      setSelectedInstructor(
        instructor ? normaliseInstructorName(instructor) : "",
      ),
    [instructor],
  );

  const sortedReviews = useMemo(() => {
    const values = [...(data?.reviews ?? [])];
    const priority = new Map(
      normalizedInstructors.map((value, index) => [value, index]),
    );
    return values.sort((left, right) => {
      const leftPriority =
        priority.get(normaliseInstructorName(left.instructor)) ??
        normalizedInstructors.length;
      const rightPriority =
        priority.get(normaliseInstructorName(right.instructor)) ??
        normalizedInstructors.length;
      return (
        leftPriority - rightPriority ||
        right.createdAt.localeCompare(left.createdAt)
      );
    });
  }, [data?.reviews, normalizedInstructors]);

  const signIn = () => void auth.signinRedirect();
  const openCreate = () => setFormMode("create");
  const ownReviewInstructors = new Set(
    sortedReviews
      .filter((review) => review.mine)
      .map((review) => normaliseInstructorName(review.instructor)),
  );
  const hasOwnReviewForTarget = targetInstructor
    ? ownReviewInstructors.has(targetInstructor)
    : normalizedInstructors.length > 0 &&
      normalizedInstructors.every((value) => ownReviewInstructors.has(value));
  const showInstructor = !instructor;

  const openExistingReview = async (id: string) => {
    setFormMode(null);
    const listed = await refetch();
    let existing = listed.data?.reviews.find((review) => review.id === id);
    if (!existing) {
      const mine = await refetchMine();
      existing = mine.data?.reviews.find(
        (review) => review.id === id && review.status === "visible",
      );
    }
    if (existing) setFormMode(existing);
  };

  const submitReport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reportingId) return;
    reportMutation.mutate(
      {
        id: reportingId,
        values: {
          reason: reportReason,
          ...(reportNote.trim() ? { note: reportNote.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          setReportingId(null);
          setReportNote("");
          setReportMessage(dict.course.details.native_reviews.report_success);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <section aria-labelledby="native-reviews" className="flex flex-col gap-2">
        <h3 id="native-reviews" className="font-bold">
          {dict.course.details.native_reviews.title}
        </h3>
        <div className="flex flex-col gap-2">
          <div className="h-4 w-2/3 animate-pulse bg-muted" />
          <div className="h-4 w-full animate-pulse bg-muted" />
        </div>
      </section>
    );
  }
  if (error) {
    return (
      <section aria-labelledby="native-reviews" className="flex flex-col gap-2">
        <h3 id="native-reviews" className="font-bold">
          {dict.course.details.native_reviews.title}
        </h3>
        <ErrorState
          title={dict.common.load_error}
          action={
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {dict.common.try_again}
            </Button>
          }
        />
      </section>
    );
  }

  const summary = data?.summary;
  return (
    <section aria-labelledby="native-reviews" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="native-reviews" className="font-bold">
          {dict.course.details.native_reviews.title}
          {summary && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ·{" "}
              {dict.course.details.native_reviews.count.replace(
                "{count}",
                String(summary.count),
              )}
            </span>
          )}
        </h3>
        {isReviewAuthenticated &&
        moduleKey &&
        normalizedInstructors.length > 0 &&
        !hasOwnReviewForTarget ? (
          <Button size="sm" onClick={openCreate}>
            {dict.course.details.native_reviews.write}
          </Button>
        ) : !isReviewAuthenticated && normalizedInstructors.length > 0 ? (
          <Button variant="outline" size="sm" onClick={signIn}>
            {dict.course.details.native_reviews.sign_in_prompt}
          </Button>
        ) : null}
      </div>
      {allowInstructorFilter && normalizedInstructors.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="reviews-instructor-filter">
            {dict.course.details.native_reviews.instructor}
          </Label>
          <Select
            value={selectedInstructor || "all"}
            onValueChange={(value) =>
              setSelectedInstructor(value === "all" ? "" : value)
            }
          >
            <SelectTrigger id="reviews-instructor-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {dict.course.details.native_reviews.all_instructors}
              </SelectItem>
              {normalizedInstructors.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {summary &&
        (reviewSummaryHasAverages(summary) ? (
          <dl className="grid grid-cols-3 gap-4 py-2">
            <ModuleStat
              value={(summary.workload ?? 0).toFixed(1)}
              label={dict.course.details.native_reviews.average_workload}
            />
            <ModuleStat
              value={(summary.grading ?? 0).toFixed(1)}
              label={dict.course.details.native_reviews.average_grading}
            />
            <ModuleStat
              value={(summary.learning ?? 0).toFixed(1)}
              label={dict.course.details.native_reviews.average_learning}
            />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            {dict.course.details.native_reviews.not_enough_for_average}
          </p>
        ))}
      {formMode &&
        (moduleKey || formMode !== "create") &&
        isReviewAuthenticated && (
          <ReviewForm
            moduleKey={
              moduleKey ?? (formMode === "create" ? "" : formMode.moduleKey)
            }
            instructorOptions={
              normalizedInstructors.length ? normalizedInstructors : []
            }
            semesterOptions={semesterOptions}
            review={formMode === "create" ? undefined : formMode}
            onCancel={() => setFormMode(null)}
            onSaved={() => setFormMode(null)}
            onAlreadyReviewed={(id) => void openExistingReview(id)}
          />
        )}
      {sortedReviews.length === 0 && !formMode ? (
        <div className="py-4">
          <p>{dict.course.details.native_reviews.empty}</p>
        </div>
      ) : sortedReviews.length > 0 ? (
        <div className="divide-y divide-border">
          {sortedReviews.map((review) => {
            const parsedModule = parseModuleKey(review.moduleKey);
            const reviewCourseLabel = courseLabels
              ? (courseLabels[review.moduleKey] ??
                (parsedModule
                  ? `${parsedModule.department} ${parsedModule.course}`
                  : review.moduleKey))
              : undefined;
            const metadata = [
              toPrettySemester(review.semester),
              ...(showInstructor ? [review.instructor] : []),
              relativeDate(review.updatedAt, lang),
              ...(review.edited
                ? [dict.course.details.native_reviews.edited]
                : []),
            ];
            const ratings = [
              `${dict.course.details.native_reviews.workload} ${review.workload}`,
              `${dict.course.details.native_reviews.grading} ${review.grading}`,
              `${dict.course.details.native_reviews.learning} ${review.learning}`,
            ];
            const examSeparator = contentLanguage(lang) === "en" ? ", " : "、";

            return (
              <article
                className="flex min-w-0 flex-col gap-2 py-4"
                key={review.id}
              >
                {reviewCourseLabel && (
                  <h4 className="font-medium">{reviewCourseLabel}</h4>
                )}
                <div className="flex flex-wrap items-baseline gap-2 text-sm text-muted-foreground">
                  {metadata.map((value, index) => (
                    <span key={`${review.id}-metadata-${index}`}>
                      {index > 0 && " · "}
                      {value}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  {ratings.join(" · ")}
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>
                    {
                      dict.course.details.native_reviews[
                        `attendance_${review.attendance}`
                      ]
                    }
                  </span>
                  <span>·</span>
                  <span>
                    {review.examStyle
                      .map(
                        (style) =>
                          dict.course.details.native_reviews[`exam_${style}`],
                      )
                      .join(examSeparator)}
                  </span>
                </div>
                <p className="whitespace-pre-line leading-relaxed">
                  {review.body}
                </p>
                {((review.mine && isReviewAuthenticated) ||
                  (isReviewAuthenticated && !review.mine)) && (
                  <div className="flex flex-wrap justify-end gap-1">
                    {review.mine && isReviewAuthenticated && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto px-2 py-1"
                          onClick={() => setFormMode(review)}
                        >
                          {dict.course.details.native_reviews.edit}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto px-2 py-1"
                          onClick={() => {
                            if (
                              window.confirm(
                                dict.course.details.native_reviews
                                  .delete_confirm,
                              )
                            )
                              deleteMutation.mutate(review.id);
                          }}
                        >
                          {dict.course.details.native_reviews.delete}
                        </Button>
                      </>
                    )}
                    {!review.mine && isReviewAuthenticated && (
                      <Button
                        ref={(node) => {
                          if (reportingId === review.id)
                            reportTriggerRef.current = node;
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1"
                        onClick={(event) => {
                          reportTriggerRef.current = event.currentTarget;
                          setReportMessage(null);
                          setReportingId(review.id);
                        }}
                      >
                        {dict.course.details.native_reviews.report}
                      </Button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : null}
      <Dialog
        open={Boolean(reportingId)}
        onOpenChange={(open) => {
          if (!open) {
            setReportingId(null);
            setReportNote("");
          }
        }}
      >
        <DialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            reportReasonRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            reportTriggerRef.current?.focus();
          }}
        >
          <DialogTitle>
            {dict.course.details.native_reviews.report_title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {dict.course.details.native_reviews.report_reason}
          </DialogDescription>
          <form className="flex flex-col gap-4" onSubmit={submitReport}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="review-report-reason">
                {dict.course.details.native_reviews.report_reason}
              </Label>
              <Select
                value={reportReason}
                onValueChange={(value) =>
                  setReportReason(value as ReportReason)
                }
              >
                <SelectTrigger id="review-report-reason" ref={reportReasonRef}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      "personal_attack",
                      "exam_leak",
                      "spam",
                      "off_topic",
                      "other",
                    ] as ReportReason[]
                  ).map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {dict.course.details.native_reviews[`report_${reason}`]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="review-report-note">
                {dict.course.details.native_reviews.report_note}
              </Label>
              <Textarea
                id="review-report-note"
                value={reportNote}
                onChange={(event) => setReportNote(event.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={reportMutation.isPending}
              >
                {dict.course.details.native_reviews.report_submit}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setReportingId(null)}
              >
                {dict.course.details.native_reviews.cancel}
              </Button>
            </div>
            {reportMutation.error && (
              <p className="text-sm text-destructive">
                {errorMessage(reportMutation.error, dict, "report")}
              </p>
            )}
          </form>
        </DialogContent>
      </Dialog>
      {deleteMutation.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {errorMessage(deleteMutation.error, dict, "delete")}
          </AlertDescription>
        </Alert>
      )}
      {reportMessage && (
        <p className="text-sm text-muted-foreground">{reportMessage}</p>
      )}
    </section>
  );
};

export default ReviewsSection;
