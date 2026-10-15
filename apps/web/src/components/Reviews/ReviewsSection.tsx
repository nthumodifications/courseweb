import { useRef, useEffect, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Link } from "react-router-dom";
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
import { parsePttRating, type PttReview } from "@/lib/ptt";
import { useReviewUnlock } from "@/hooks/useReviewUnlock";
import {
  type Attendance,
  type ExamStyle,
  type ReportReason,
  type Review,
  type ReviewApiError,
  type ReviewInput,
  type ReviewRating,
  reviewSummaryHasAverages,
  useCreateReview,
  useDeleteReview,
  useMyReviews,
  useReportReview,
  useReviews,
  useUpdateReview,
} from "@/lib/reviews";

type Dictionary = ReturnType<typeof useDictionary>;

export const sortReviews = <
  T extends Pick<Review, "instructor" | "createdAt"> &
    Partial<Pick<Review, "sourcePostedAt">>,
>(
  reviews: readonly T[],
  instructors: readonly string[],
  prioritizeInstructors: boolean,
): T[] => {
  const values = [...reviews];
  if (!prioritizeInstructors) {
    return values.sort((left, right) =>
      reviewDate(right).localeCompare(reviewDate(left)),
    );
  }

  const priority = new Map(instructors.map((value, index) => [value, index]));
  return values.sort((left, right) => {
    const leftPriority =
      priority.get(normaliseInstructorName(left.instructor)) ??
      instructors.length;
    const rightPriority =
      priority.get(normaliseInstructorName(right.instructor)) ??
      instructors.length;
    return (
      leftPriority - rightPriority ||
      reviewDate(right).localeCompare(reviewDate(left))
    );
  });
};

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
    field: "coolness",
    label: "coolness",
    lowLabel: "coolness_low",
    highLabel: "coolness_high",
  },
  {
    field: "sweetness",
    label: "sweetness",
    lowLabel: "sweetness_low",
    highLabel: "sweetness_high",
  },
  {
    field: "learning",
    label: "learning",
    lowLabel: "learning_low",
    highLabel: "learning_high",
  },
] as const;

export type LivePttReview = PttReview;

const reviewDate = (
  review: Pick<Review, "createdAt"> & Partial<Pick<Review, "sourcePostedAt">>,
) => review.sourcePostedAt ?? review.createdAt;

export const mergeReviewRows = (
  apiReviews: readonly Review[],
  livePttReviews: readonly LivePttReview[],
  moduleKey: string,
  fallbackInstructor = "",
): Review[] => {
  const rows = [...apiReviews];
  const urls = new Set(
    apiReviews
      .map((review) => review.sourceUrl)
      .filter((url): url is string => Boolean(url)),
  );
  livePttReviews.forEach((review, index) => {
    if (review.sourceUrl && urls.has(review.sourceUrl)) return;
    const postedAt = review.date;
    rows.push({
      id: `ptt-live:${review.sourceUrl ?? `${postedAt ?? "unknown"}:${index}`}`,
      moduleKey,
      instructor: review.instructor ?? fallbackInstructor,
      semester: review.semester,
      coolness: parsePttRating(review.coolness),
      sweetness: parsePttRating(review.sweetness),
      learning: null,
      attendance: "none",
      examStyle: [],
      body: review.body,
      source: "ptt",
      sourceUrl: review.sourceUrl,
      sourceAuthor: review.sourceAuthor,
      sourcePostedAt: postedAt,
      createdAt: postedAt ?? "1970-01-01T00:00:00.000Z",
      updatedAt: postedAt ?? "1970-01-01T00:00:00.000Z",
      edited: false,
      mine: false,
    });
  });
  return rows.sort((left, right) =>
    reviewDate(right).localeCompare(reviewDate(left)),
  );
};

export const ReviewRatingControls = ({
  values,
  onChange,
}: {
  values: Partial<Record<(typeof ratingFields)[number]["field"], number>>;
  onChange: (
    field: (typeof ratingFields)[number]["field"],
    value: number,
  ) => void;
}) => {
  const dict = useDictionary();
  return (
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
              className="flex w-full min-w-0 sm:w-fit sm:flex-none"
              role="radiogroup"
              aria-label={dict.course.details.native_reviews[label]}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={values[field] === value ? "default" : "outline"}
                  className="min-w-0 flex-1 rounded-none px-2 first:rounded-l-md last:rounded-r-md sm:w-10 sm:flex-none"
                  aria-pressed={values[field] === value}
                  onClick={() => onChange(field, value)}
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
  );
};

export const recentReviewSemesters = () => {
  const now = new Date();
  const academicYear = now.getFullYear() - 1911 - (now.getMonth() < 8 ? 1 : 0);
  return Array.from({ length: 15 }, (_, index) => {
    const offset = Math.floor(index / 2);
    const term = index % 2 === 0 ? 1 : 2;
    return `${academicYear - offset}${term}0`;
  });
};

const reviewSemesterSortValue = (semester: string) => {
  const match = /^(\d{3})([123])0?$/.exec(semester);
  return match
    ? Number(match[1]) * 3 + Number(match[2])
    : Number.MIN_SAFE_INTEGER;
};

const sortReviewSemesters = (semesters: readonly string[]) =>
  [...semesters].sort(
    (left, right) =>
      reviewSemesterSortValue(right) - reviewSemesterSortValue(left) ||
      right.localeCompare(left),
  );

export const getDefaultReviewInstructor = (
  instructorOptions: readonly string[],
  selectedInstructor: string,
  reviewedInstructors: readonly string[],
) => {
  const normalizedOptions = instructorOptions
    .map(normaliseInstructorName)
    .filter(Boolean);
  const selected = normaliseInstructorName(selectedInstructor);
  if (selected) return selected;

  const reviewed = new Set(reviewedInstructors.map(normaliseInstructorName));
  return (
    normalizedOptions.find((option) => !reviewed.has(option)) ??
    normalizedOptions[0] ??
    ""
  );
};

export const getReviewSemesterOptions = (
  semesterOptions: readonly string[],
  semesterOptionsByInstructor: Readonly<Record<string, readonly string[]>> = {},
  instructor = "",
) => {
  const normalizedInstructor = normaliseInstructorName(instructor);
  const instructorSemesters = normalizedInstructor
    ? semesterOptionsByInstructor[normalizedInstructor]
    : undefined;
  const available =
    instructorSemesters && instructorSemesters.length > 0
      ? instructorSemesters
      : semesterOptions.length > 0
        ? semesterOptions
        : recentReviewSemesters();
  const uniqueAvailable = [...new Set(available)].filter(Boolean);
  return uniqueAvailable.length > 0
    ? sortReviewSemesters(uniqueAvailable)
    : recentReviewSemesters();
};

export const getDefaultReviewSemester = (semesterOptions: readonly string[]) =>
  semesterOptions[0] ?? recentReviewSemesters()[0];

export const shouldShowCreateReviewAction = (values: {
  isAuthenticated: boolean;
  hasModuleKey: boolean;
  instructorCount: number;
  hasOwnReviewForTarget: boolean;
  formMode: "create" | Review | null;
}) =>
  values.formMode === null &&
  values.isAuthenticated &&
  values.hasModuleKey &&
  values.instructorCount > 0 &&
  !values.hasOwnReviewForTarget;

export type ReviewFormValidation =
  | "required"
  | "body_too_short"
  | "body_too_long"
  | null;

export const validateReviewForm = (values: {
  instructor: string;
  semester: string;
  coolness?: number;
  sweetness?: number;
  learning: number;
  workload?: number;
  grading?: number;
  examStyle: readonly ExamStyle[];
  body: string;
}): ReviewFormValidation => {
  const coolness = values.coolness ?? values.workload ?? 0;
  const sweetness = values.sweetness ?? values.grading ?? 0;
  if (
    !values.instructor ||
    !values.semester ||
    coolness === 0 ||
    sweetness === 0 ||
    values.learning === 0 ||
    values.examStyle.length === 0
  ) {
    return "required";
  }
  const length = values.body.trim().length;
  if (length > 0 && length < 30) return "body_too_short";
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
  semesterOptionsByInstructor?: Readonly<Record<string, readonly string[]>>;
  defaultInstructor?: string;
  review?: Review;
  onCancel: () => void;
  onSaved: () => void;
  onAlreadyReviewed?: (id: string) => void;
};

const ReviewForm = ({
  moduleKey,
  instructorOptions,
  semesterOptions,
  semesterOptionsByInstructor = {},
  defaultInstructor = "",
  review,
  onCancel,
  onSaved,
  onAlreadyReviewed,
}: ReviewFormProps) => {
  const dict = useDictionary();
  const createMutation = useCreateReview();
  const updateMutation = useUpdateReview();
  const [instructor, setInstructor] = useState(
    review?.instructor ?? defaultInstructor,
  );
  const initialSemesters = getReviewSemesterOptions(
    semesterOptions,
    semesterOptionsByInstructor,
    review?.instructor ?? defaultInstructor,
  );
  const [semester, setSemester] = useState(
    review?.semester ?? getDefaultReviewSemester(initialSemesters),
  );
  const [coolness, setCoolness] = useState<number>(
    review?.coolness ?? review?.workload ?? 0,
  );
  const [sweetness, setSweetness] = useState<number>(
    review?.sweetness ?? review?.grading ?? 0,
  );
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
  const semesters = getReviewSemesterOptions(
    semesterOptions,
    semesterOptionsByInstructor,
    instructor,
  );

  const ratingValues = { coolness, sweetness, learning };
  const setRating = (
    field: (typeof ratingFields)[number]["field"],
    value: number,
  ) => {
    if (field === "coolness") setCoolness(value);
    if (field === "sweetness") setSweetness(value);
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
      coolness,
      sweetness,
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
      coolness: coolness as ReviewRating,
      sweetness: sweetness as ReviewRating,
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
            coolness: values.coolness,
            sweetness: values.sweetness,
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
          <Select
            value={instructor}
            onValueChange={(value) => {
              setInstructor(value);
              const nextSemesters = getReviewSemesterOptions(
                semesterOptions,
                semesterOptionsByInstructor,
                value,
              );
              setSemester((current) =>
                nextSemesters.includes(current)
                  ? current
                  : getDefaultReviewSemester(nextSemesters),
              );
            }}
          >
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
      <ReviewRatingControls values={ratingValues} onChange={setRating} />
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
  semesterOptionsByInstructor?: Readonly<Record<string, readonly string[]>>;
  courseLabels?: Record<string, string>;
  allowInstructorFilter?: boolean;
  prioritizeInstructors?: boolean;
  livePttReviews?: readonly LivePttReview[];
};

export const ReviewsSection = ({
  lang = "zh",
  moduleKey,
  instructor,
  instructors = [],
  semesterOptions = [],
  semesterOptionsByInstructor = {},
  courseLabels,
  allowInstructorFilter = false,
  prioritizeInstructors = false,
  livePttReviews = [],
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
  const { data, error, isPending, isSuccess, refetch } = useReviews({
    moduleKey,
    instructor: targetInstructor,
  });
  const { refetch: refetchMine } = useMyReviews();
  const unlock = useReviewUnlock();
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
    const merged = mergeReviewRows(
      data?.reviews ?? [],
      livePttReviews,
      moduleKey ?? "",
      normalizedInstructors[0] ?? "",
    );
    return sortReviews(merged, normalizedInstructors, prioritizeInstructors);
  }, [
    data?.reviews,
    livePttReviews,
    moduleKey,
    normalizedInstructors,
    prioritizeInstructors,
  ]);

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
  const defaultInstructor = getDefaultReviewInstructor(
    normalizedInstructors,
    selectedInstructor,
    [...ownReviewInstructors],
  );

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
  if (isPending || !isSuccess) {
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
        <div className="flex flex-wrap items-center gap-2">
          {isReviewAuthenticated && unlock.hasPastCourses && (
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/${lang}/reviews/past`}>
                {dict.course.details.native_reviews.review_past}
              </Link>
            </Button>
          )}
          {shouldShowCreateReviewAction({
            isAuthenticated: isReviewAuthenticated,
            hasModuleKey: Boolean(moduleKey),
            instructorCount: normalizedInstructors.length,
            hasOwnReviewForTarget,
            formMode,
          }) ? (
            <Button size="sm" onClick={openCreate}>
              {dict.course.details.native_reviews.write}
            </Button>
          ) : !isReviewAuthenticated && normalizedInstructors.length > 0 ? (
            <Button variant="outline" size="sm" onClick={signIn}>
              {dict.course.details.native_reviews.sign_in_prompt}
            </Button>
          ) : null}
        </div>
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
        (reviewSummaryHasAverages(summary) || summary.count > 0 ? (
          <dl className="grid grid-cols-3 gap-4 py-2">
            <ModuleStat
              value={(summary.coolness ?? summary.workload)?.toFixed(1) ?? "—"}
              label={dict.course.details.native_reviews.average_coolness}
            />
            <ModuleStat
              value={(summary.sweetness ?? summary.grading)?.toFixed(1) ?? "—"}
              label={dict.course.details.native_reviews.average_sweetness}
            />
            <ModuleStat
              value={summary.learning?.toFixed(1) ?? "—"}
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
            semesterOptionsByInstructor={semesterOptionsByInstructor}
            defaultInstructor={defaultInstructor}
            review={formMode === "create" ? undefined : formMode}
            onCancel={() => setFormMode(null)}
            onSaved={() => setFormMode(null)}
            onAlreadyReviewed={(id) => void openExistingReview(id)}
          />
        )}
      {isSuccess && sortedReviews.length === 0 && !formMode ? (
        <div className="py-4">
          <p>{dict.course.details.native_reviews.empty}</p>
        </div>
      ) : sortedReviews.length > 0 ? (
        <>
          {unlock.locked && (
            <Alert>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {isReviewAuthenticated
                    ? dict.course.details.native_reviews.unlock_prompt
                    : dict.course.details.native_reviews.unlock_sign_in}
                </span>
                {isReviewAuthenticated ? (
                  <Button size="sm" asChild>
                    <Link to={`/${lang}/reviews/past`}>
                      {dict.course.details.native_reviews.review_past}
                    </Link>
                  </Button>
                ) : (
                  <Button size="sm" onClick={signIn}>
                    {dict.course.details.native_reviews.sign_in_prompt}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
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
                ...(review.semester ? [toPrettySemester(review.semester)] : []),
                ...(showInstructor && review.instructor
                  ? [review.instructor]
                  : []),
                relativeDate(review.updatedAt, lang),
                ...(review.edited
                  ? [dict.course.details.native_reviews.edited]
                  : []),
              ];
              const ratings = [
                review.coolness !== null && review.coolness !== undefined
                  ? `${dict.course.details.native_reviews.coolness} ${review.coolness}`
                  : null,
                review.sweetness !== null && review.sweetness !== undefined
                  ? `${dict.course.details.native_reviews.sweetness} ${review.sweetness}`
                  : null,
                review.learning !== null && review.learning !== undefined
                  ? `${dict.course.details.native_reviews.learning} ${review.learning}`
                  : null,
              ].filter((value): value is string => Boolean(value));
              const examSeparator =
                contentLanguage(lang) === "en" ? ", " : "、";

              return (
                <article
                  className="flex min-w-0 flex-col gap-2 py-4"
                  key={review.id}
                >
                  {reviewCourseLabel && (
                    <h4 className="font-medium">{reviewCourseLabel}</h4>
                  )}
                  <div className="flex flex-wrap items-baseline gap-2 text-sm text-muted-foreground">
                    {review.source === "ptt" && (
                      <span className="text-xs font-medium">PTT</span>
                    )}
                    {metadata.map((value, index) => (
                      <span key={`${review.id}-metadata-${index}`}>
                        {index > 0 && " · "}
                        {value}
                      </span>
                    ))}
                    {review.source === "ptt" && review.sourceAuthor && (
                      <span> · {review.sourceAuthor}</span>
                    )}
                    {review.source === "ptt" && review.sourcePostedAt && (
                      <span> · {review.sourcePostedAt.slice(0, 10)}</span>
                    )}
                    {review.source === "ptt" && review.sourceUrl && (
                      <a
                        href={review.sourceUrl}
                        target="_blank"
                        rel="noopener"
                        className="underline"
                      >
                        {dict.course.details.native_reviews.source_link}
                      </a>
                    )}
                  </div>
                  {ratings.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {ratings.join(" · ")}
                    </div>
                  )}
                  {review.source === "native" && (
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
                              dict.course.details.native_reviews[
                                `exam_${style}`
                              ],
                          )
                          .join(examSeparator)}
                      </span>
                    </div>
                  )}
                  {!unlock.locked && review.body && (
                    <p className="whitespace-pre-line leading-relaxed">
                      {review.body}
                    </p>
                  )}
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
          {sortedReviews.some((review) => review.source === "ptt") && (
            <p className="text-sm text-muted-foreground">
              {dict.course.details.ptt_disclaimer}
            </p>
          )}
        </>
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
