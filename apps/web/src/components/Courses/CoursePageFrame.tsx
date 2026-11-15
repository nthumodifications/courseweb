import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button, ErrorState, Fade } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
import { ChevronLeft } from "lucide-react";

type Dictionary = ReturnType<typeof useDictionary>;

export const CoursePageShell = ({
  lang,
  dict,
  inDialog,
  children,
}: {
  lang: string;
  dict: Dictionary;
  inDialog: boolean;
  children: ReactNode;
}) => (
  <div
    className={
      inDialog
        ? "flex min-w-0 flex-col"
        : "flex min-w-0 flex-col gap-4 px-4 md:px-6 w-full max-w-7xl"
    }
  >
    {!inDialog && (
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" asChild size="sm" className="min-h-11 w-fit">
          <Link to={`/${lang}/courses`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {dict.common.back}
          </Link>
        </Button>
        <Button variant="ghost" asChild size="sm" className="min-h-11 w-fit">
          <Link to={`/${lang}/courses/modules`}>
            {dict.course.module.search_other_modules}
          </Link>
        </Button>
      </div>
    )}
    {children}
  </div>
);

export const CoursePageHelmet = ({
  inDialog,
  title,
  description,
  children,
}: {
  inDialog: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
}) =>
  inDialog ? null : (
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {children}
    </Helmet>
  );

export const CoursePageState = ({
  lang,
  dict,
  inDialog,
  title,
  description,
  children,
}: {
  lang: string;
  dict: Dictionary;
  inDialog: boolean;
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <>
    <CoursePageHelmet
      inDialog={inDialog}
      title={title}
      description={description}
    />
    <CoursePageShell lang={lang} dict={dict} inDialog={inDialog}>
      {children}
    </CoursePageShell>
  </>
);

/** Full pages keep their entrance animation; dialog views do not inherit its opacity wrapper. */
export const CoursePageContent = ({
  inDialog,
  children,
}: {
  inDialog: boolean;
  children: ReactNode;
}) => (inDialog ? <>{children}</> : <Fade>{children}</Fade>);

export const CoursePageErrorState = ({
  error,
  title,
  retryLabel,
  onRetry,
}: {
  error: boolean;
  title: string;
  retryLabel: string;
  onRetry: () => void;
}) => (
  <ErrorState
    title={title}
    action={
      error ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : undefined
    }
  />
);

export const CoursePageErrorPage = ({
  lang,
  dict,
  inDialog,
  pageTitle,
  error,
  title,
  retryLabel,
  onRetry,
}: {
  lang: string;
  dict: Dictionary;
  inDialog: boolean;
  pageTitle: string;
  error: boolean;
  title: string;
  retryLabel: string;
  onRetry: () => void;
}) => (
  <CoursePageState
    lang={lang}
    dict={dict}
    inDialog={inDialog}
    title={pageTitle}
  >
    <CoursePageErrorState
      error={error}
      title={title}
      retryLabel={retryLabel}
      onRetry={onRetry}
    />
  </CoursePageState>
);
