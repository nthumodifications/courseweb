import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, EmptyState, ErrorState, Separator } from "@courseweb/ui";
import CourseListItem from "@/components/Courses/CourseListItem";
import CourseListItemSkeleton from "@/components/Courses/CourseListItemSkeleton";
import useDictionary from "@/dictionaries/useDictionary";
import { toPrettySemester } from "@/helpers/semester";
import {
  decodeInstructorRouteParam,
  groupInstructorCourses,
  normaliseInstructorName,
} from "@/lib/instructors";
import { getInstructorCourses } from "@/lib/modules";

const STALE_TIME = 24 * 60 * 60 * 1000;
const PAGE_SHELL_CLASS = "flex min-w-0 flex-col gap-4 px-4 md:px-6";

const InstructorPage = () => {
  const { name: rawName } = useParams<{ name: string }>();
  const name = decodeInstructorRouteParam(rawName);
  const displayName = normaliseInstructorName(name);
  const dict = useDictionary();
  const {
    data: courses = [],
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["instructor-courses", name],
    queryFn: () => getInstructorCourses(name),
    enabled: Boolean(name),
    staleTime: STALE_TIME,
    gcTime: STALE_TIME * 7,
  });
  const groups = useMemo(() => groupInstructorCourses(courses), [courses]);
  const title = displayName
    ? `${displayName} | ${dict.course.instructor.title} | NTHUMods`
    : `${dict.course.instructor.title} | NTHUMods`;

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>{title}</title>
        </Helmet>
        <div className={PAGE_SHELL_CLASS}>
          <div className="divide-y divide-border">
            <CourseListItemSkeleton />
            <CourseListItemSkeleton />
            <CourseListItemSkeleton />
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Helmet>
          <title>{title}</title>
        </Helmet>
        <div className={PAGE_SHELL_CLASS}>
          <ErrorState
            title={dict.common.load_error}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
              >
                {dict.common.try_again}
              </Button>
            }
          />
        </div>
      </>
    );
  }

  if (groups.length === 0) {
    return (
      <>
        <Helmet>
          <title>{title}</title>
        </Helmet>
        <div className={PAGE_SHELL_CLASS}>
          <EmptyState title={dict.course.module.no_offerings} />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta
          name="description"
          content={`${displayName} ${dict.course.instructor.description}`}
        />
      </Helmet>
      <div className={PAGE_SHELL_CLASS}>
        <h1 className="min-w-0 whitespace-normal font-bold text-xl">
          {displayName}
        </h1>
        <Separator />
        <div className="flex min-w-0 flex-col gap-4">
          {groups.map((group) => (
            <section
              className="flex min-w-0 flex-col gap-2"
              key={group.semester}
            >
              <h2 className="font-bold">
                {toPrettySemester(group.semester)}{" "}
                {dict.course.details.semester}
              </h2>
              <div className="divide-y divide-border">
                {group.courses.map((course) => (
                  <CourseListItem key={course.raw_id} course={course} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
};

export default InstructorPage;
