import {
  FC,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  PropsWithChildren,
} from "react";
import {
  Link,
  createPath,
  type LinkProps,
  type Location,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  ScrollArea,
  Separator,
} from "@courseweb/ui";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { Language } from "@/types/settings";
import { useSettings } from "@/hooks/contexts/settings";
import useDictionary from "@/dictionaries/useDictionary";
import { lazyWithRetry } from "@/lib/chunk-recovery";
import {
  parseCourseDialogPath,
  type CourseDialogBackground,
  type CourseDialogHistoryState,
  type CourseDialogView,
} from "./courseDialogRouting";

export { parseCourseDialogPath } from "./courseDialogRouting";
export type {
  CourseDialogBackground,
  CourseDialogHistoryState,
  CourseDialogView,
} from "./courseDialogRouting";

interface CourseDialogContextValue {
  openCourse: (courseId: string) => void;
  openDialogPath: (path: string) => void;
  resolveDialogPath: (to: LinkProps["to"]) => string;
  replaceDialogSearch: (search: URLSearchParams) => void;
}

const CourseDialogContext = createContext<CourseDialogContextValue | null>(
  null,
);
const CourseDialogShellContext = createContext<Pick<
  CourseDialogContextValue,
  "openDialogPath" | "resolveDialogPath"
> | null>(null);

const CourseDetailContainerDynamic = lazyWithRetry(
  () => import("@/components/CourseDetails/CourseDetailsContainer"),
);
const InstructorPageDynamic = lazyWithRetry(() =>
  import("@/app/[lang]/(mods-pages)/courses/instructor/[name]/page").then(
    (module) => ({ default: module.InstructorPageContent }),
  ),
);
const ModulePageDynamic = lazyWithRetry(() =>
  import("@/app/[lang]/(mods-pages)/courses/module/[moduleKey]/page").then(
    (module) => ({ default: module.ModulePageContent }),
  ),
);

const viewTitle = (
  view: CourseDialogView,
  dict: ReturnType<typeof useDictionary>,
) => {
  switch (view.type) {
    case "instructor":
      return dict.course.instructor.title;
    case "module":
      return dict.course.module.title;
    case "course":
      return dict.course.details.dialog_title;
  }
};

const DialogView = ({
  view,
  language,
  replaceDialogSearch,
}: {
  view: CourseDialogView;
  language: Language;
  replaceDialogSearch: (search: URLSearchParams) => void;
}) => {
  switch (view.type) {
    case "course":
      return (
        <CourseDetailContainerDynamic
          lang={language}
          courseId={view.id}
          modal={true}
        />
      );
    case "instructor":
      return (
        <InstructorPageDynamic
          lang={language}
          name={view.name}
          inDialog={true}
        />
      );
    case "module":
      return (
        <ModulePageDynamic
          lang={language}
          moduleKey={view.key}
          inDialog={true}
          dialogSearch={view.search}
          onDialogSearchChange={replaceDialogSearch}
        />
      );
  }
};

const isPlainPrimaryClick = (event: React.MouseEvent<HTMLAnchorElement>) =>
  event.button === 0 &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.shiftKey;

const isDialogHistoryState = (
  state: unknown,
): state is CourseDialogHistoryState & {
  dialog: NonNullable<CourseDialogHistoryState["dialog"]>;
} => {
  if (!state || typeof state !== "object" || !("dialog" in state)) {
    return false;
  }
  const dialog = state.dialog;
  return Boolean(
    dialog && typeof dialog === "object" && "background" in dialog,
  );
};

const locationPath = ({
  pathname,
  search,
  hash,
}: Pick<Location, "pathname" | "search" | "hash">) =>
  `${pathname}${search ?? ""}${hash ?? ""}`;

const resolveLinkPath = (
  to: LinkProps["to"],
  location: Pick<Location, "pathname" | "search" | "hash">,
) => {
  const target = typeof to === "string" ? to : createPath(to);
  const base = `http://courseweb.local${locationPath(location)}`;
  const resolved = new URL(target, base);
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
};

const anchorPath = (anchor: HTMLAnchorElement) =>
  `${anchor.pathname}${anchor.search}${anchor.hash}`;

const serializableLocation = (
  location: ReturnType<typeof useLocation>,
): CourseDialogBackground => ({
  pathname: location.pathname,
  search: location.search,
  hash: location.hash,
  key: location.key,
});

const historyIndex = () => {
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === "number" ? idx : undefined;
};

const backgroundTo = (background: CourseDialogBackground) => ({
  pathname: background.pathname,
  search: background.search,
  hash: background.hash,
});

/** A real router link that becomes a location.state dialog entry. */
export const CourseDialogLink = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, onClick, target, download, ...props }, ref) => {
    const context = useContext(CourseDialogShellContext);
    const location = useLocation();
    const targetPath = context
      ? context.resolveDialogPath(to)
      : resolveLinkPath(to, location);
    const isDialogTarget = Boolean(parseCourseDialogPath(targetPath));

    return (
      <Link
        ref={ref}
        {...props}
        target={target}
        download={download}
        to={context ? targetPath : to}
        onClick={(event) => {
          onClick?.(event);
          if (
            event.defaultPrevented ||
            !context ||
            !isPlainPrimaryClick(event) ||
            target === "_blank" ||
            (target && target !== "_self") ||
            download != null ||
            !isDialogTarget
          ) {
            return;
          }
          event.preventDefault();
          context.openDialogPath(anchorPath(event.currentTarget));
        }}
      />
    );
  },
);
CourseDialogLink.displayName = "CourseDialogLink";

const focusElementOrList = (element: HTMLElement | null) => {
  const ownerDocument =
    element?.ownerDocument ??
    (typeof document === "undefined" ? null : document);
  if (!ownerDocument) return;

  const target = element?.isConnected
    ? element
    : ownerDocument.querySelector<HTMLElement>(
        "[data-course-dialog-list-container], main",
      );
  target?.focus?.({ preventScroll: true });
};

/** Renders a dialog only when the real router location carries dialog state. */
export const CourseDialogProvider: FC<PropsWithChildren> = ({ children }) => {
  const { language } = useSettings();
  const dict = useDictionary();
  const location = useLocation();
  const navigate = useNavigate();
  const state = isDialogHistoryState(location.state) ? location.state : null;
  const activeView = state
    ? parseCourseDialogPath(locationPath(location))
    : null;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const closeFocusRef = useRef<HTMLElement | null>(null);
  const [closeFocusVersion, setCloseFocusVersion] = useState(0);

  const openDialogPath = useCallback(
    (path: string) => {
      const view = parseCourseDialogPath(path);
      const browserPath =
        typeof window === "undefined"
          ? ""
          : `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (
        !view ||
        locationPath(location) === view.path ||
        browserPath === view.path
      ) {
        return;
      }

      const currentDialog = isDialogHistoryState(location.state)
        ? location.state.dialog
        : null;
      const background =
        currentDialog?.background ?? serializableLocation(location);
      const originIdx = currentDialog?.originIdx ?? historyIndex();
      if (!openerRef.current) {
        openerRef.current = document.activeElement as HTMLElement | null;
      }

      navigate(path, {
        state: { dialog: { background, originIdx } },
      });
    },
    [location, navigate],
  );

  const openCourse = useCallback(
    (courseId: string) => {
      openDialogPath(`/${language}/courses/${encodeURIComponent(courseId)}`);
    },
    [language, openDialogPath],
  );

  const resolveDialogPath = useCallback(
    (to: LinkProps["to"]) => resolveLinkPath(to, location),
    [location],
  );

  const closeDialog = useCallback(() => {
    if (!state) return;
    closeFocusRef.current = openerRef.current;
    const currentIdx = historyIndex();
    const originIdx = state.dialog.originIdx;
    if (
      typeof originIdx === "number" &&
      typeof currentIdx === "number" &&
      originIdx < currentIdx
    ) {
      navigate(originIdx - currentIdx);
    } else {
      navigate(backgroundTo(state.dialog.background), { replace: true });
    }
  }, [navigate, state]);

  const replaceDialogSearch = useCallback(
    (search: URLSearchParams) => {
      if (!activeView || !state) return;
      const nextSearch = search.toString();
      const nextPath = `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}${location.hash}`;
      navigate(nextPath, { replace: true, state: location.state });
    },
    [activeView, location, navigate, state],
  );

  useEffect(() => {
    if (!activeView) return;
    const focusTimer = window.setTimeout(() => {
      titleRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [activeView]);

  useEffect(() => {
    if (!activeView && closeFocusVersion > 0) {
      focusElementOrList(closeFocusRef.current);
      openerRef.current = null;
    }
  }, [activeView, closeFocusVersion]);

  useEffect(() => {
    if (activeView || !closeFocusRef.current) return;
    setCloseFocusVersion((version) => version + 1);
  }, [activeView]);

  const contextValue = useMemo(
    () => ({
      openCourse,
      openDialogPath,
      resolveDialogPath,
      replaceDialogSearch,
    }),
    [openCourse, openDialogPath, replaceDialogSearch, resolveDialogPath],
  );

  const currentIdx = historyIndex();
  const originIdx = state?.dialog.originIdx;
  const hasPreviousDialogView =
    typeof currentIdx === "number" &&
    typeof originIdx === "number" &&
    currentIdx > originIdx + 1;

  return (
    <CourseDialogContext.Provider value={contextValue}>
      {children}
      {activeView && (
        <Dialog open={true} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent
            className="max-w-6xl gap-0 p-0"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              focusElementOrList(closeFocusRef.current ?? openerRef.current);
            }}
          >
            <div className="flex items-center justify-between px-8 py-2">
              {hasPreviousDialogView ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={dict.common.back}
                  onClick={() => navigate(-1)}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  {dict.common.back}
                </Button>
              ) : (
                <span aria-hidden="true" />
              )}
              {activeView.type === "course" && (
                <Button variant="ghost" asChild>
                  <a
                    href={activeView.path}
                    className="mr-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                    {dict.course.details.open_new_tab}
                  </a>
                </Button>
              )}
            </div>
            <DialogTitle ref={titleRef} tabIndex={-1} className="sr-only">
              {viewTitle(activeView, dict)}
            </DialogTitle>
            <Separator />
            <ScrollArea className="h-[80vh] [&>div[data-radix-scroll-area-viewport]>div]:!block">
              <div className="min-w-0 max-w-full px-4 py-2 lg:px-8 lg:py-4">
                <Suspense
                  fallback={<div role="status">{dict.common.loading}</div>}
                >
                  <CourseDialogShellContext.Provider
                    value={{ openDialogPath, resolveDialogPath }}
                  >
                    <DialogView
                      key={activeView.path}
                      view={activeView}
                      language={language as Language}
                      replaceDialogSearch={replaceDialogSearch}
                    />
                  </CourseDialogShellContext.Provider>
                </Suspense>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </CourseDialogContext.Provider>
  );
};

export function useCourseLink() {
  const context = useContext(CourseDialogContext);
  if (!context) {
    throw new Error("useCourseLink must be used within CourseDialogProvider");
  }
  return context;
}
