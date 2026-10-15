import { useAuth } from "react-oidc-context";
import useUserTimetable from "@/hooks/contexts/useUserTimetable";
import { useMyReviews } from "@/lib/reviews";
import { deriveReviewLock, isReviewTextLocked } from "@/lib/review-lock";

export const useReviewUnlock = () => {
  const auth = useAuth();
  const timetable = useUserTimetable();
  const mine = useMyReviews();
  const derived = deriveReviewLock({
    courses: timetable.courses,
    reviews: mine.data?.reviews,
  });

  return {
    ...derived,
    textLocked: isReviewTextLocked(
      derived.locked,
      timetable.timetableDataReady,
      !mine.isPending,
    ),
    isAuthenticated:
      auth.isAuthenticated &&
      !auth.user?.expired &&
      Boolean(auth.user?.access_token),
    timetableReady: timetable.timetableDataReady,
    reviewsReady: !mine.isPending,
  };
};

export { deriveReviewLock } from "@/lib/review-lock";
