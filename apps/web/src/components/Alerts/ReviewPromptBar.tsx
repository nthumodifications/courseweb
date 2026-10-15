import { Info, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useLocalStorage } from "usehooks-ts";
import { Button } from "@courseweb/ui";
import { semesterInfo } from "@courseweb/shared";
import useDictionary from "@/dictionaries/useDictionary";
import { rememberPostSigninRedirect } from "@/lib/credentialStorage";
import { createModuleKey } from "@/lib/modules";
import { normaliseInstructorName } from "@/lib/instructors";
import { useAuth } from "react-oidc-context";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useMyReviews } from "@/lib/reviews";
import {
  getReviewPromptState,
  type ReviewPromptCourse,
  type ReviewPromptDismissals,
} from "@/lib/review-prompt";

const REVIEW_PROMPT_STORAGE_KEY = "review_prompt_dismissals";
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

const ReviewPromptBar = () => {
  const dict = useDictionary();
  const auth = useAuth();
  const timetable = useUserTimetable();
  const mine = useMyReviews();
  const { lang: rawLang } = useParams<{ lang: string }>();
  const lang = rawLang === "en" || rawLang === "zh-cn" ? rawLang : "zh";
  const [dismissedFor, setDismissedFor] =
    useLocalStorage<ReviewPromptDismissals>(REVIEW_PROMPT_STORAGE_KEY, {});
  const isAuthenticated =
    auth.isAuthenticated &&
    !auth.user?.expired &&
    Boolean(auth.user?.access_token);
  const now = new Date();
  const timetableCourses = Object.fromEntries(
    Object.keys(timetable.courses).map((semester) => {
      const courses: ReviewPromptCourse[] = timetable
        .getSemesterCourses(semester)
        .flatMap((course) => {
          try {
            return [
              {
                moduleKey: createModuleKey(course.department, course.course),
                instructors: (course.teacher_zh ?? [])
                  .map(normaliseInstructorName)
                  .filter(Boolean),
              },
            ];
          } catch {
            return [];
          }
        });
      return [semester, courses];
    }),
  );
  const prompt =
    isAuthenticated && mine.isPending
      ? null
      : getReviewPromptState({
          now,
          semesters: semesterInfo,
          timetableCourses,
          myReviews: mine.data?.reviews ?? [],
          dismissedFor,
        });

  if (!prompt) return null;

  const href = `/${lang}/reviews/past?semester=${encodeURIComponent(
    prompt.targetSemester,
  )}`;
  const updateDismissal = (update: ReviewPromptDismissals[string]) => {
    try {
      setDismissedFor((current) => ({
        ...current,
        [prompt.targetSemester]: update,
      }));
    } catch {
      // The storage helper also fails closed when browser storage is blocked.
    }
  };
  const signIn = () => {
    try {
      rememberPostSigninRedirect(href);
    } catch {
      // A blocked storage must not prevent the sign-in CTA.
    }
    void auth.signinRedirect();
  };

  return (
    <div
      role="status"
      className="flex w-full items-center gap-2 border-b border-border bg-muted px-4 py-1 text-sm text-foreground"
    >
      <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span className="font-medium">
          {dict.course.details.native_reviews.prompt.title}
        </span>
        <span className="text-current/80">
          {dict.course.details.native_reviews.prompt.description.replace(
            "{count}",
            String(prompt.unreviewedCount),
          )}
        </span>
      </div>
      {isAuthenticated ? (
        <Button size="sm" asChild>
          <Link to={href}>{dict.course.details.native_reviews.prompt.cta}</Link>
        </Button>
      ) : (
        <Button size="sm" onClick={signIn}>
          {dict.course.details.native_reviews.prompt.cta}
        </Button>
      )}
      <button
        type="button"
        className="shrink-0 underline underline-offset-2"
        onClick={() =>
          updateDismissal({ snoozedUntil: Date.now() + THREE_DAYS })
        }
      >
        {dict.course.details.native_reviews.prompt.snooze}
      </button>
      <button
        type="button"
        aria-label={dict.alerts.dismiss}
        className="shrink-0 rounded-sm p-1 hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => updateDismissal({ dismissed: true })}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default ReviewPromptBar;
