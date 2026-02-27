import {
  FC,
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
  PropsWithChildren,
} from "react";
import { useLocation, useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@courseweb/ui";
import { Button } from "@courseweb/ui";
import { Separator } from "@courseweb/ui";
import { ScrollArea } from "@courseweb/ui";
import { ExternalLink } from "lucide-react";
import CourseDetailContainer from "@/components/CourseDetails/CourseDetailsContainer";
import { Language } from "@/types/settings";
import { useSettings } from "@/hooks/contexts/settings";

interface CourseDialogContextValue {
  openCourse: (courseId: string) => void;
}

const CourseDialogContext = createContext<CourseDialogContextValue | null>(
  null,
);

/**
 * Provider that renders the course detail dialog overlay.
 * Place this inside the router (needs useParams).
 *
 * When openCourse is called:
 * 1. The URL updates to /:lang/courses/:courseId via history.pushState
 * 2. A dialog overlay shows the course details
 * 3. Closing the dialog (or pressing back) restores the original URL
 * 4. If the user refreshes while the dialog is open, they get the full course page
 */
export const CourseDialogProvider: FC<PropsWithChildren> = ({ children }) => {
  const { language } = useSettings();
  const { lang } = useParams<{ lang: string }>();
  const location = useLocation();
  const [courseId, setCourseId] = useState<string | null>(null);
  const previousUrlRef = useRef<string>("");

  const openCourse = useCallback(
    (newCourseId: string) => {
      // Only save previousUrl on the first open (not when navigating between courses in dialog)
      if (!courseId) {
        previousUrlRef.current = location.pathname + location.search;
      }
      // Update browser URL without triggering React Router navigation
      window.history.pushState(
        { courseDialog: true },
        "",
        `/${lang}/courses/${newCourseId}`,
      );
      setCourseId(newCourseId);
    },
    [lang, location.pathname, location.search, courseId],
  );

  const closeDialog = useCallback(() => {
    if (previousUrlRef.current) {
      window.history.replaceState(null, "", previousUrlRef.current);
    }
    setCourseId(null);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeDialog();
      }
    },
    [closeDialog],
  );

  // Handle browser back button
  useEffect(() => {
    if (!courseId) return;

    const handlePopState = () => {
      // When user presses back, close the dialog
      setCourseId(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [courseId]);

  return (
    <CourseDialogContext.Provider value={{ openCourse }}>
      {children}
      {courseId && (
        <Dialog open={true} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-6xl p-0 gap-0">
            <DialogTitle className="sr-only">Course Details</DialogTitle>
            <div className="flex flex-row justify-end px-8 py-2">
              <Button variant="ghost" asChild>
                <a href={`/${lang}/courses/${courseId}`} className="mr-2">
                  <ExternalLink className="mr-2 w-4 h-4" />
                  在新分頁開啟
                </a>
              </Button>
            </div>
            <Separator />
            <ScrollArea className="h-[80vh]">
              <div className="px-4 py-2 lg:px-8 lg:py-4">
                <CourseDetailContainer
                  lang={language as Language}
                  courseId={courseId}
                  modal={true}
                />
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </CourseDialogContext.Provider>
  );
};

/**
 * Hook to open a course in the dialog overlay.
 * The URL changes to the course page, but the current page stays visible behind the dialog.
 * On refresh, the full course page loads normally.
 */
export function useCourseLink() {
  const context = useContext(CourseDialogContext);
  if (!context) {
    throw new Error("useCourseLink must be used within CourseDialogProvider");
  }
  return context;
}
