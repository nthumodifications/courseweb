import { format } from "date-fns";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import DownloadSyllabus from "./DownloadSyllabus";
import SyllabusSummary from "./SyllabusSummary";
import PrerequisiteBlock from "./PrerequisiteBlock";
import {
  Fade,
  Button,
  ErrorState,
  Separator,
  Alert,
  Badge,
  ScrollArea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@courseweb/ui";
import { toPrettySemester } from "@/helpers/semester";
import CourseTagList from "@/components/Courses/CourseTagsList";
import { MinimalCourse } from "@/types/courses";
import { getScoreType, getFormattedClassCode } from "@/helpers/courses";
import { CourseDefinition } from "@/config/supabase";
import { Fragment, Suspense, useState, type ReactNode } from "react";
import { Language } from "@/types/settings";
import { contentLanguage, intlLocale } from "@/helpers/contentLanguage";
import { sanitizeCourseHtml } from "@/lib/sanitizeHtml";
import ShareCourseButton from "./ShareCourseButton";
import client from "@/config/api";
import useDictionary from "@/dictionaries/useDictionary";
import { useQuery } from "@tanstack/react-query";
import { lazyWithRetry } from "@/lib/chunk-recovery";
import CourseDetailsSkeleton from "./CourseDetailsSkeleton";
import {
  CourseDialogLink,
  useCourseLink,
} from "@/components/Courses/CourseDialog";
import { ModuleTermAvailability } from "@/components/Courses/ModuleTermAvailability";
import { InstructorLink } from "@/components/Courses/InstructorLink";
import {
  createModuleKey,
  getModuleHistory,
  getModuleHistoryVariant,
} from "@/lib/modules";
import { cleanSyllabusFields } from "@/lib/syllabus-text";
import { serializeJsonLd } from "@/lib/seo";
import { usePrerequisiteGraphData } from "./usePrerequisiteGraphData";
import CourseGradeStatistics, {
  type CourseGradeStatisticsResponse,
} from "./CourseGradeStatistics";
import CourseOverallGradeSummary, {
  hasCourseOverallGradeSummary,
} from "./CourseOverallGradeSummary";
import {
  courseCodeFromRawId,
  courseStatisticsKey,
} from "./courseGradeStatisticsLogic";
import {
  normalizePttReview,
  parsePttResponse,
  type PttReview,
} from "@/lib/ptt";
import { useLocalizedZhData } from "@/hooks/useLocalizedZh";
import {
  CourseDetailSection,
  type CourseDetailSectionId,
} from "./courseDetailSections";
import ReviewsSection from "@/components/Reviews/ReviewsSection";
import { normaliseInstructorName } from "@/lib/instructors";

const safeCreateModuleKey = (department: string, course: string) => {
  try {
    return createModuleKey(department, course);
  } catch {
    return "";
  }
};

const PDFViewerDynamic = lazyWithRetry(
  () => import("@/components/CourseDetails/PDFViewer"),
);
const SelectCourseButtonDynamic = lazyWithRetry(
  () => import("@/components/Courses/SelectCourseButton"),
);

type CourseStatisticsApi = {
  contribute: {
    grades: {
      ":courseCode": {
        $get: (args: { param: { courseCode: string } }) => Promise<{
          ok: boolean;
          json: () => Promise<CourseGradeStatisticsResponse>;
        }>;
      };
    };
  };
};

type CleanSyllabusDescription = ReturnType<
  typeof cleanSyllabusFields
>["content"];

export {
  COURSE_DETAIL_SECTION_IDS,
  COURSE_DETAIL_DIALOG_EXCLUDED_SECTION_IDS,
  getCourseDetailDialogSectionIds,
} from "./courseDetailSections";

export const buildCourseProviderJsonLd = (providerAlternateName: string) => ({
  "@type": "EducationalOrganization",
  name: "National Tsing Hua University",
  alternateName: providerAlternateName,
  url: "https://www.nthu.edu.tw",
});

type MembershipSectionId = Extract<
  CourseDetailSectionId,
  | "compulsory-membership"
  | "elective-membership"
  | "first-specialization-membership"
  | "second-specialization-membership"
>;

const CourseMembershipSection = ({
  id,
  title,
  values,
  filterKey,
  lang,
  formatValue,
}: {
  id: MembershipSectionId;
  title: string;
  values: readonly string[];
  filterKey: string;
  lang: string;
  formatValue?: (value: string) => ReactNode;
}) => (
  <CourseDetailSection id={id}>
    {values.length > 0 && (
      <div className="flex flex-col gap-1">
        <h3 className="font-bold text-base">{title}</h3>
        <div className="flex flex-row gap-2 flex-wrap">
          {values.map((value, index) => (
            <CourseDialogLink
              key={index}
              to={`/${lang}/courses?nthu_courses%5BrefinementList%5D%5B${filterKey}%5D%5B0%5D=${values}`}
            >
              <Badge variant="outline">
                {formatValue ? formatValue(value) : value}
              </Badge>
            </CourseDialogLink>
          ))}
        </div>
      </div>
    )}
  </CourseDetailSection>
);

const renderSyllabusDescription = (
  content: CleanSyllabusDescription,
  hasFile: boolean,
  courseId: string,
): React.ReactNode => {
  if (content.text) {
    if (content.sections.length > 1) {
      return content.sections.map((section, index) => (
        <Fragment key={`${section.key}-${section.title}-${index}`}>
          {index > 0 ? "\n" : null}
          {section.title ? (
            <>
              <span className="font-bold">{section.title}</span>
              {"\n"}
            </>
          ) : null}
          {section.body}
        </Fragment>
      ));
    }
    return content.text;
  }

  if (!hasFile) return null;
  return (
    <div className="flex flex-col gap-2">
      <DownloadSyllabus courseId={courseId} />
      <Suspense fallback={null}>
        <PDFViewerDynamic
          file={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/syllabus/${encodeURIComponent(courseId)}.pdf`}
        />
      </Suspense>
    </div>
  );
};

const TOCNavItem = ({
  href,
  children,
  label,
  active,
}: {
  href: string;
  children?: React.ReactNode;
  label: string;
  active?: boolean;
}) => {
  return (
    <li className="mt-0 pt-2">
      <a
        href={href}
        className={`inline-block no-underline transition-colors hover:text-foreground ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}
      >
        {label}
      </a>
      {children}
    </li>
  );
};

const CrossDisciplineTagList = ({ course }: { course: CourseDefinition }) => {
  if (!course.cross_discipline?.length) return null;
  return (
    <div className="flex flex-row gap-2 flex-wrap">
      {course.cross_discipline?.map((m, index) => (
        <div
          key={index}
          className="flex min-w-[65px] flex-row items-center justify-center rounded-md bg-muted px-2 py-2 text-sm text-foreground select-none"
        >
          {m}
        </div>
      ))}
    </div>
  );
};

const CourseDetailContainer = ({
  lang,
  courseId,
  bottomAware = false,
  modal = false,
  courseChanges,
  hasCourseChanges = false,
}: {
  lang: Language;
  courseId: string;
  bottomAware?: boolean;
  modal?: boolean;
  courseChanges?: ReactNode;
  hasCourseChanges?: boolean;
}) => {
  const dict = useDictionary();
  const localizeData = useLocalizedZhData();
  const { openCourse } = useCourseLink();
  const courseStatisticsClient = client as unknown as CourseStatisticsApi;

  // Use React Query to fetch the course data
  const {
    data: course,
    isLoading,
    error,
    refetch: refetchCourse,
  } = useQuery({
    queryKey: ["course", courseId, "syllabus"],
    queryFn: async () => {
      const res = await client.course[":courseId"].syllabus.$get({
        param: { courseId },
      });
      if (!res.ok) throw new Error("Failed to load course");
      return res.json();
    },
  });

  const { parsedPrerequisite, hasStructuredPrerequisites, prerequisiteRows } =
    usePrerequisiteGraphData(course);

  // Use React Query for reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ["course", courseId, "ptt", 2],
    queryFn: async () => {
      const res = await client.course[":courseId"].ptt.$get({
        param: { courseId },
      });
      if (!res.ok) throw new Error("Failed to load course reviews");
      const payload = (await res.json()) as unknown;
      return Array.isArray(payload) ? payload.map(parsePttResponse) : [];
    },
    select: (data: PttReview[]) => data.map(normalizePttReview),
    enabled: !!course, // Only fetch if course data is available
  });

  // Use React Query for related courses
  const {
    data: otherClasses = [],
    error: relatedError,
    refetch: refetchRelated,
  } = useQuery({
    queryKey: ["course", courseId, "related"],
    queryFn: async () => {
      const res = await client.course[":courseId"].related.$get({
        param: { courseId },
      });
      if (!res.ok) throw new Error("Failed to load related courses");
      return res.json();
    },
    enabled: !!course, // Only fetch if course data is available
  });

  const {
    data: contributedGradeStatistics,
    error: contributedGradeStatisticsError,
  } = useQuery<CourseGradeStatisticsResponse>({
    queryKey: ["course", courseId, "contributed-grade-statistics"],
    queryFn: async () => {
      const res = await courseStatisticsClient.contribute.grades[
        ":courseCode"
      ].$get({
        param: {
          courseCode: courseCodeFromRawId(course!.raw_id),
        },
      });
      if (!res.ok) throw new Error("Failed to load course grade statistics");
      return (await res.json()) as CourseGradeStatisticsResponse;
    },
    enabled: !!course,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Which terms this course runs in, across every semester on record.
  const moduleKey = course
    ? safeCreateModuleKey(course.department, course.course)
    : "";
  const { data: moduleHistory } = useQuery({
    queryKey: ["module-history", moduleKey],
    queryFn: () => getModuleHistory(moduleKey),
    enabled: Boolean(moduleKey),
    staleTime: 7 * 24 * 60 * 60 * 1000,
    retry: false,
  });
  const moduleVariant =
    course && moduleHistory
      ? getModuleHistoryVariant(moduleHistory, course.name_zh)
      : undefined;
  const syllabus = cleanSyllabusFields(course?.course_syllabus);
  const seoCourseName =
    lang === "en"
      ? course?.name_en || course?.name_zh || ""
      : course?.name_zh
        ? localizeData(course.name_zh)
        : "";
  const seoAlternateName = lang === "en" ? course?.name_zh : course?.name_en;
  const seoInstructors =
    (lang === "en"
      ? course?.teacher_en
      : course?.teacher_zh?.map(localizeData)
    )?.join(dict.course.details.seo.instructor_separator) ?? "";
  const seoSemester = course ? toPrettySemester(course.semester) : "";
  const fillSeo = (template: string) =>
    template
      .replace("{department}", course?.department ?? "")
      .replace("{course}", seoCourseName)
      .replace("{courseEn}", course?.name_en ?? "")
      .replace("{instructors}", seoInstructors)
      .replace("{semester}", seoSemester);
  const encodedCourseId = course ? encodeURIComponent(course.raw_id) : "";
  const courseCanonicalUrl = `https://nthumods.com/${lang}/courses/${encodedCourseId}`;

  // Dynamic SEO metadata for course detail pages (full-page view only)
  const courseJsonLd =
    !modal && course
      ? {
          "@context": "https://schema.org",
          "@type": "Course",
          name: seoCourseName,
          alternateName: seoAlternateName,
          description:
            syllabus.brief ??
            fillSeo(dict.course.details.seo.course_description),
          provider: buildCourseProviderJsonLd(
            dict.course.details.seo.provider_alternate_name,
          ),
          instructor: (course.teacher_zh ?? []).map((t) => ({
            "@type": "Person",
            name: t,
          })),
          courseCode: `${course.department} ${course.course}-${course.class}`,
          educationalLevel: "University",
          inLanguage: intlLocale(lang),
          url: courseCanonicalUrl,
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "TWD",
            availability: "https://schema.org/InStock",
          },
        }
      : null;

  const breadcrumbData =
    !modal && course
      ? [
          {
            name: dict.course.details.seo.home,
            url: `https://nthumods.com/${lang}`,
          },
          {
            name: dict.course.details.seo.course_breadcrumb,
            url: `https://nthumods.com/${lang}/courses`,
          },
          {
            name: course.department,
            url: `https://nthumods.com/${lang}/courses?department=${encodeURIComponent(course.department)}`,
          },
          {
            name: localizeData(course.name_zh),
            url: courseCanonicalUrl,
          },
        ]
      : null;

  const breadcrumbJsonLd = breadcrumbData
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbData.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }
    : null;

  const webPageJsonLd =
    !modal && course
      ? {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `${seoCourseName} | NTHUMods`,
          description: fillSeo(dict.course.details.seo.page_description),
          url: courseCanonicalUrl,
          inLanguage: intlLocale(lang),
          isPartOf: { "@type": "WebSite", url: "https://nthumods.com" },
        }
      : null;

  // Handle loading state
  if (isLoading) {
    return <CourseDetailsSkeleton />;
  }

  // Handle error state
  if (error) {
    return (
      <>
        {!modal && (
          <Helmet>
            <meta name="robots" content="noindex, nofollow" />
            <meta name="googlebot" content="noindex, nofollow" />
          </Helmet>
        )}
        <div className="px-4">
          <ErrorState
            title={dict.common.load_error}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetchCourse()}
              >
                {dict.common.try_again}
              </Button>
            }
          />
        </div>
      </>
    );
  }

  if (!course) {
    return (
      <div className="px-4">
        <ErrorState
          title={dict.course.details.not_found}
          action={
            <CourseDialogLink to="../">
              <Button size="sm" variant="outline">
                <ChevronLeft /> {dict.common.back}
              </Button>
            </CourseDialogLink>
          }
        />
      </div>
    );
  }

  const missingSyllabus = course.course_syllabus == null;
  const bilingualNamesAreAligned =
    (course.teacher_zh?.length ?? 0) === (course.teacher_en?.length ?? 0);
  const teacherByCourse = new Map<string, readonly string[]>();
  for (const offering of [course, ...otherClasses]) {
    teacherByCourse.set(
      courseStatisticsKey(offering.semester, offering.raw_id),
      offering.teacher_zh ?? [],
    );
  }

  return (
    <Fade>
      {!modal && course && (
        <Helmet>
          <title>{fillSeo(dict.course.details.seo.title)}</title>
          <meta
            name="description"
            content={fillSeo(dict.course.details.seo.description)}
          />
          <link rel="canonical" href={courseCanonicalUrl} />
          <link
            rel="alternate"
            hrefLang="zh-TW"
            href={`https://nthumods.com/zh/courses/${encodedCourseId}`}
          />
          <link
            rel="alternate"
            hrefLang="en"
            href={`https://nthumods.com/en/courses/${encodedCourseId}`}
          />
          <link
            rel="alternate"
            hrefLang="zh-CN"
            href={`https://nthumods.com/zh-cn/courses/${encodedCourseId}`}
          />
          <link
            rel="alternate"
            hrefLang="x-default"
            href={`https://nthumods.com/zh/courses/${encodedCourseId}`}
          />
          <meta
            property="og:title"
            content={fillSeo(dict.course.details.seo.open_graph_title)}
          />
          <meta
            property="og:description"
            content={fillSeo(dict.course.details.seo.open_graph_description)}
          />
          <meta property="og:url" content={courseCanonicalUrl} />
          <meta name="twitter:card" content="summary" />
          <meta
            name="twitter:title"
            content={fillSeo(dict.course.details.seo.open_graph_title)}
          />
          <meta
            name="twitter:description"
            content={fillSeo(dict.course.details.seo.twitter_description)}
          />
          {courseJsonLd && (
            <script type="application/ld+json">
              {serializeJsonLd(
                [courseJsonLd, breadcrumbJsonLd, webPageJsonLd].filter(Boolean),
              )}
            </script>
          )}
        </Helmet>
      )}
      <div className={cn("relative flex min-w-0 flex-col pb-6")}>
        <div className={cn("flex min-w-0 flex-col gap-4 pb-20 md:pb-0")}>
          <CourseDetailSection id="header">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex min-w-0 w-full flex-1 flex-col gap-2">
                <div className="font-medium text-base">
                  {toPrettySemester(course.semester)}{" "}
                  {dict.course.details.semester}
                </div>
                <div className="font-bold text-xl text-nthu-600">{`${course.department} ${course.course}-${course.class}`}</div>
                <h1 className="flex min-w-0 flex-row flex-wrap gap-1 font-bold text-xl">
                  <span className="min-w-0 whitespace-normal">
                    {localizeData(course.name_zh)}
                  </span>
                  <span>
                    {course.teacher_zh?.map((displayName, index) => (
                      <Fragment key={`${displayName}-${index}`}>
                        {index > 0 ? "," : ""}
                        <InstructorLink
                          lang={contentLanguage(lang)}
                          name={course.teacher_zh?.[index] ?? ""}
                        >
                          {localizeData(displayName)}
                        </InstructorLink>
                      </Fragment>
                    ))}
                  </span>
                </h1>
                <h2 className="flex min-w-0 flex-row flex-wrap gap-1 font-medium">
                  <span className="min-w-0 whitespace-normal">
                    {course.name_en}
                  </span>
                  <span>
                    {course.teacher_en?.map((displayName, index) => (
                      <Fragment key={`${displayName}-${index}`}>
                        {index > 0 ? "," : ""}
                        <InstructorLink
                          lang={contentLanguage(lang)}
                          name={
                            bilingualNamesAreAligned
                              ? (course.teacher_zh?.[index] ?? "")
                              : ""
                          }
                        >
                          {displayName}
                        </InstructorLink>
                      </Fragment>
                    ))}
                  </span>
                </h2>
              </div>
              <CourseTagList course={course} />
              <div>
                {course.venues ? (
                  course.venues.map((vn, i) => (
                    <p key={vn} className="text-muted-foreground text-sm">
                      {localizeData(vn)}{" "}
                      <span className="text-foreground">
                        {course.times![i]}
                      </span>
                    </p>
                  ))
                ) : (
                  <p>{dict.course.details.no_venues}</p>
                )}
              </div>
              <CrossDisciplineTagList course={course} />
            </div>
            <CourseDetailSection id="actions">
              <div className="hidden md:flex flex-col gap-2 absolute top-0 right-0 mt-4 mr-4">
                <Suspense fallback={null}>
                  <SelectCourseButtonDynamic courseId={course.raw_id} />
                </Suspense>
                <ShareCourseButton
                  link={`https://nthumods.com/courses/${course.raw_id}`}
                  displayName={`${course.name_zh} ${course.teacher_zh.join(",")}`}
                />
              </div>
              <div
                className={cn(
                  "md:hidden fixed left-0 pt-2 px-4 w-full h-16 flex flex-row gap-2 bg-background z-50",
                  bottomAware ? "bottom-20" : "bottom-0",
                )}
              >
                <ShareCourseButton
                  link={`https://nthumods.com/courses/${course.raw_id}`}
                  displayName={`${course.name_zh} ${course.teacher_zh.join(",")}`}
                />
                <div className="flex-1 flex flex-col">
                  <Suspense fallback={null}>
                    <SelectCourseButtonDynamic courseId={course.raw_id} />
                  </Suspense>
                </div>
              </div>
            </CourseDetailSection>
          </CourseDetailSection>
          <Separator />
          {hasCourseOverallGradeSummary(
            contributedGradeStatistics?.statistics,
            contributedGradeStatisticsError,
          ) && (
            <CourseDetailSection id="overall-grade-summary">
              <CourseOverallGradeSummary
                statistics={contributedGradeStatistics?.statistics}
                error={contributedGradeStatisticsError}
                copy={{
                  title: dict.course.details.overall_grade_summary,
                  average: dict.course.details.average,
                  enrollmentSummary:
                    dict.course.details.overall_grade_summary_enrollment,
                  trendUp: dict.course.details.overall_grade_summary_trend_up,
                  trendDown:
                    dict.course.details.overall_grade_summary_trend_down,
                  trendFlat:
                    dict.course.details.overall_grade_summary_trend_flat,
                  gpaScale: dict.course.details.past_grade_statistics_gpa,
                  percentScale:
                    dict.course.details.past_grade_statistics_percent,
                  source: dict.course.details.overall_grade_summary_source,
                }}
              />
            </CourseDetailSection>
          )}
          <div
            className={"flex min-w-0 flex-col-reverse gap-4 lg:flex-row w-full"}
          >
            <div className="flex min-w-0 flex-col gap-4 lg:flex-1">
              <CourseDetailSection id="syllabus-summary">
                {!missingSyllabus && (
                  <SyllabusSummary courseId={course.raw_id} />
                )}
              </CourseDetailSection>
              <CourseDetailSection id="syllabus-brief">
                {!missingSyllabus && (
                  <div className="flex flex-col gap-2">
                    <h3 className="font-bold" id="brief">
                      {dict.course.details.brief}
                    </h3>
                    <p className="whitespace-pre-line text-sm">
                      {syllabus.brief}
                    </p>
                  </div>
                )}
              </CourseDetailSection>
              <CourseDetailSection id="syllabus-description">
                {!missingSyllabus && (
                  <div className="flex flex-col gap-2">
                    <h3 className="font-bold" id="description">
                      {dict.course.details.description}
                    </h3>
                    <p className="whitespace-pre-line text-sm">
                      {renderSyllabusDescription(
                        syllabus.content,
                        course.course_syllabus!.has_file,
                        course.raw_id,
                      )}
                    </p>
                  </div>
                )}
              </CourseDetailSection>
              <CourseDetailSection id="prerequisites">
                {course?.prerequisites && (
                  <div className="flex flex-col gap-2">
                    <h3 className="font-bold" id="prerequesites">
                      {dict.course.details.prerequesites}
                    </h3>
                    {hasStructuredPrerequisites && parsedPrerequisite ? (
                      <>
                        <PrerequisiteBlock
                          parsed={parsedPrerequisite}
                          course={course}
                          rows={prerequisiteRows}
                          lang={contentLanguage(lang)}
                          dict={dict}
                        />
                        <details>
                          <summary className="cursor-pointer text-sm text-muted-foreground">
                            {dict.course.details.prerequisite_original}
                          </summary>
                          <div
                            className="mt-2 whitespace-pre-line text-sm"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeCourseHtml(course.prerequisites),
                            }}
                          />
                        </details>
                      </>
                    ) : (
                      <div
                        className="whitespace-pre-line text-sm"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeCourseHtml(course.prerequisites),
                        }}
                      />
                    )}
                  </div>
                )}
              </CourseDetailSection>
              {moduleKey && (
                <CourseDetailSection id="native-reviews">
                  <ReviewsSection
                    lang={lang}
                    moduleKey={moduleKey}
                    prioritizeInstructors
                    instructors={(course.teacher_zh ?? []).map(
                      normaliseInstructorName,
                    )}
                    semesterOptions={
                      [course, ...otherClasses]
                        .filter((offering) =>
                          (offering.teacher_zh ?? []).some((teacher) =>
                            course.teacher_zh?.some(
                              (courseTeacher) =>
                                normaliseInstructorName(courseTeacher) ===
                                normaliseInstructorName(teacher),
                            ),
                          ),
                        )
                        .map((offering) => offering.semester) ?? []
                    }
                    livePttReviews={reviews}
                  />
                </CourseDetailSection>
              )}
              <CourseDetailSection id="current-scores">
                {course.course_scores && (
                  <div className="flex flex-col gap-2">
                    <h3 className="font-bold" id="scores">
                      {dict.course.details.scores}
                    </h3>
                    {/* TODO: make scores prettier with a graph */}
                    <p className="text-sm">
                      <span className="font-bold">
                        {dict.course.details.average}
                        {
                          dict.course.details.score_types[
                            course.course_scores.type as "gpa" | "percent"
                          ]
                        }
                        :
                      </span>{" "}
                      {course.course_scores.average}
                    </p>
                    <p className="text-sm">
                      <span className="font-bold">
                        {dict.course.details.standard_deviation}:
                      </span>{" "}
                      {course.course_scores.std_dev}
                    </p>
                  </div>
                )}
              </CourseDetailSection>
              <CourseDetailSection id="historical-grade-statistics">
                <CourseGradeStatistics
                  lang={lang}
                  statistics={contributedGradeStatistics?.statistics}
                  error={contributedGradeStatisticsError}
                  teacherByCourse={teacherByCourse}
                  copy={{
                    title: dict.course.details.past_grade_statistics,
                    semester: dict.course.details.semester,
                    instructor: dict.course.details.instructor,
                    enrollment: dict.course.details.enrollment,
                    average: dict.course.details.average,
                    standardDeviation: dict.course.details.standard_deviation,
                    gpaScale: dict.course.details.past_grade_statistics_gpa,
                    percentScale:
                      dict.course.details.past_grade_statistics_percent,
                    contributed:
                      dict.course.details.past_grade_statistics_contributed,
                  }}
                />
              </CourseDetailSection>
              <CourseDetailSection id="same-code-courses">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row">
                    <h3 className="flex-1 font-bold" id="other">
                      {dict.course.details.related_courses}
                    </h3>
                    <Button variant="ghost" asChild>
                      <CourseDialogLink
                        to={`/${lang}/courses?nthu_courses%5BrefinementList%5D%5Bdepartment%5D%5B0%5D=${course.department}&nthu_courses%5Bquery%5D=${course.name_zh} ${course.teacher_zh.join(" ")}`}
                      >
                        {dict.course.details.view_more}{" "}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </CourseDialogLink>
                    </Button>
                  </div>
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[110px] px-2">
                          {dict.course.details.semester_time_venue}
                        </TableHead>
                        <TableHead className="w-[80px] px-2">
                          {dict.course.details.instructor}
                        </TableHead>
                        <TableHead className="w-28 px-2">
                          {dict.course.details.historical_average}
                        </TableHead>
                        <TableHead className="w-14 p-0"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {otherClasses.map((m, index) => (
                        <TableRow key={index}>
                          <TableCell className="px-2">
                            <div className="flex flex-col gap-1">
                              <p>{toPrettySemester(m.semester)}</p>
                              <div className="flex flex-col">
                                {m.times.map((t, i) => (
                                  <p
                                    key={i}
                                    className="text-xs text-muted-foreground"
                                  >
                                    {m.venues[i]} {t}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-2">
                            {m.teacher_zh?.map((teacher, teacherIndex) => (
                              <Fragment key={`${teacher}-${teacherIndex}`}>
                                {teacherIndex > 0 ? "," : ""}
                                <InstructorLink lang={lang} name={teacher}>
                                  {teacher}
                                </InstructorLink>
                              </Fragment>
                            ))}
                          </TableCell>
                          <TableCell>
                            {m.course_scores && (
                              <div className="flex flex-col gap-1 text-xs">
                                <p>
                                  {getScoreType(m.course_scores.type)}{" "}
                                  {m.course_scores.average}
                                </p>
                                <p>
                                  {dict.course.details.standard_deviation}{" "}
                                  {m.course_scores.std_dev}
                                </p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="p-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={dict.a11y.view_course_details}
                              onClick={() => openCourse(m.raw_id)}
                            >
                              <ArrowRight size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CourseDetailSection>
              {courseChanges}
            </div>
            <div className="w-full lg:w-[284px] flex flex-col gap-4">
              <CourseDetailSection id="toc">
                <ScrollArea className="hidden lg:flex">
                  <div className="space-y-2">
                    <ul className="m-0 list-none">
                      {!missingSyllabus && (
                        <TOCNavItem
                          href="#brief"
                          label={dict.course.details.brief}
                        />
                      )}
                      {!missingSyllabus && (
                        <TOCNavItem
                          href="#description"
                          label={dict.course.details.description}
                        />
                      )}
                      {course?.prerequisites && (
                        <TOCNavItem
                          href="#prerequesites"
                          label={dict.course.details.prerequesites}
                        />
                      )}
                      {course.course_scores && (
                        <TOCNavItem
                          href="#scores"
                          label={dict.course.details.scores}
                        />
                      )}
                      {contributedGradeStatistics?.statistics.length ? (
                        <TOCNavItem
                          href="#past-grade-statistics"
                          label={dict.course.details.past_grade_statistics}
                        />
                      ) : null}
                      <TOCNavItem
                        href="#other"
                        label={dict.course.details.related_courses}
                      />
                      {hasCourseChanges && (
                        <TOCNavItem
                          href="#changes"
                          label={dict.course.details.changes.title}
                        />
                      )}
                    </ul>
                  </div>
                </ScrollArea>
              </CourseDetailSection>
              {relatedError ? (
                <ErrorState
                  title={dict.common.load_error}
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void refetchRelated()}
                    >
                      {dict.common.try_again}
                    </Button>
                  }
                />
              ) : (
                <>
                  <CourseDetailSection id="offering-history">
                    {moduleVariant && (
                      <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-base">
                          {dict.course.module.offering_history}
                        </h3>
                        <ModuleTermAvailability
                          semesters={moduleVariant.semesters}
                          size="sm"
                        />
                        <CourseDialogLink
                          to={`/${lang}/courses/module/${encodeURIComponent(moduleKey)}?title=${encodeURIComponent(course.name_zh)}`}
                          className="w-fit text-sm text-muted-foreground underline-offset-4 hover:underline"
                        >
                          {dict.course.module.view_all_semesters}
                        </CourseDialogLink>
                      </div>
                    )}
                  </CourseDetailSection>
                  <CourseDetailSection id="remarks">
                    {(course.note ?? "").trim().length > 0 && (
                      <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-base">
                          {dict.course.details.remarks}
                        </h3>
                        <p className="text-sm">{course.note}</p>
                      </div>
                    )}
                  </CourseDetailSection>
                  <CourseDetailSection id="restrictions">
                    {(course.restrictions ?? "").trim().length > 0 && (
                      <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-base">
                          {dict.course.details.restrictions}
                        </h3>
                        <p className="text-sm">{course.restrictions}</p>
                      </div>
                    )}
                  </CourseDetailSection>
                  <CourseMembershipSection
                    id="compulsory-membership"
                    title={dict.course.details.compulsory}
                    values={course.compulsory_for ?? []}
                    filterKey="compulsory_for"
                    lang={lang}
                    formatValue={(value) =>
                      getFormattedClassCode(value, course.semester, lang)
                    }
                  />
                  <CourseMembershipSection
                    id="elective-membership"
                    title={dict.course.details.elective}
                    values={course.elective_for ?? []}
                    filterKey="elective_for"
                    lang={lang}
                    formatValue={(value) =>
                      getFormattedClassCode(value, course.semester, lang)
                    }
                  />
                  <CourseMembershipSection
                    id="first-specialization-membership"
                    title={dict.course.details.first_specialization}
                    values={course.first_specialization ?? []}
                    filterKey="first_specialization"
                    lang={lang}
                  />
                  <CourseMembershipSection
                    id="second-specialization-membership"
                    title={dict.course.details.second_specialization}
                    values={course.second_specialization ?? []}
                    filterKey="second_specialization"
                    lang={lang}
                  />

                  <CourseDetailSection id="updated-at">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-row gap-2 flex-wrap">
                        <p className="text-xs text-muted-foreground">
                          {dict.course.details.details_updated}{" "}
                          {format(
                            new Date(course.updated_at),
                            "yyyy-MM-dd HH:mm",
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dict.course.details.syllabus_updated}{" "}
                          {format(
                            new Date(course.course_syllabus?.updated_at ?? 0),
                            "yyyy-MM-dd HH:mm",
                          )}
                        </p>
                      </div>
                    </div>
                  </CourseDetailSection>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fade>
  );
};

export default CourseDetailContainer;
