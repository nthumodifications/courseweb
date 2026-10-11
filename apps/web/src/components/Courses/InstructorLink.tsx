import { cn } from "@courseweb/ui";
import { CourseDialogLink } from "@/components/Courses/CourseDialog";
import {
  encodeInstructorRouteParam,
  isInstructorPageName,
} from "@/lib/instructors";

export const InstructorLink = ({
  lang,
  name,
  children,
  className,
}: {
  lang: string;
  name: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const content = <span className={className}>{children}</span>;
  if (!isInstructorPageName(name)) return content;

  return (
    <CourseDialogLink
      to={`/${lang}/courses/instructor/${encodeInstructorRouteParam(name)}`}
      className={cn(className, "underline-offset-4 hover:underline")}
    >
      {children}
    </CourseDialogLink>
  );
};
