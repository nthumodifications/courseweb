import { format } from "date-fns";
import { ResolvingMetadata } from "next";
import {
  AlertTriangle,
  ChevronLeft,
  CheckCircle,
  ArrowRight,
  Share,
  Share2,
  CalendarPlus,
} from "lucide-react";
import Link from "next/link";
import DownloadSyllabus from "./DownloadSyllabus";
import Fade from "@/components/Animation/Fade";
import { getDictionary } from "@/dictionaries/dictionaries";
import { getCoursePTTReview, getCourseWithSyllabus } from "@/lib/course";
import { LangProps } from "@/types/pages";
import { toPrettySemester } from "@/helpers/semester";
import CourseTagList from "@/components/Courses/CourseTagsList";
import {
  colorMapFromCourses,
  createTimetableFromCourses,
} from "@/helpers/timetable";
import { MinimalCourse, RawCourseID } from "@/types/courses";
import {
  hasTimes,
  getScoreType,
  getFormattedClassCode,
} from "@/helpers/courses";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import supabase, {
  CourseDefinition,
  CourseScoreDefinition,
} from "@/config/supabase";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { timetableColors } from "@/const/timetableColors";
import dynamicFn from "next/dynamic";
import { Language } from "@/types/settings";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "@/lib/utils";
import ShareCourseButton from "./ShareCourseButton";
import DateContributeForm from "./DateContributeForm";
import { getContribDates } from "@/lib/contrib_dates";
import { getCurrentUser } from "@/lib/firebase/auth";
import { currentSemester } from "@/const/semester";

const PDFViewerDynamic = dynamicFn(
  () => import("@/components/CourseDetails/PDFViewer"),
  { ssr: false },
);
const SelectCourseButtonDynamic = dynamicFn(
  () => import("@/components/Courses/SelectCourseButton"),
  { ssr: false },
);
const TimetableDynamic = dynamicFn(
  () => import("@/components/Timetable/Timetable"),
  { ssr: false },
);
const CommmentsSectionDynamic = dynamicFn(
  () =>
    import("@/components/CourseDetails/CommentsContainer").then(
      (m) => m.CommmentsSection,
    ),
  { ssr: false },
);

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
  return (
    <div className="flex flex-row gap-2 flex-wrap">
      {course.cross_discipline?.map((m, index) => (
        <div
          key={index}
          className="flex flex-row items-center justify-center min-w-[65px] space-x-2 px-2 py-2 select-none rounded-md text-sm bg-neutral-200 dark:bg-neutral-800"
        >
          {m}
        </div>
      ))}
    </div>
  );
};

const getOtherClasses = async (course: MinimalCourse) => {
  const semester = parseInt(course.semester.substring(0, 3));
  const getsemesters = [semester - 2, semester - 1, semester, semester + 1]
    .map((s) => [s.toString() + "10", s.toString() + "20"])
    .flat();

  const { data, error } = await supabase
    .from("courses")
    .select("*, course_scores(*)")
    .eq("department", course.department)
    .eq("course", course.course)
    .eq("name_zh", course.name_zh) //due to the way the course ids are arranged, this is the best way to get the same course
    .in("semester", getsemesters)
    .not("raw_id", "eq", course.raw_id)
    .order("raw_id", { ascending: false });

  if (error) throw error;
  if (!data) throw new Error("No data");
  return data as unknown as (CourseDefinition & {
    course_scores: CourseScoreDefinition | undefined;
  })[];
};

const ImportantDates = async ({
  raw_id,
  lang,
}: {
  raw_id: RawCourseID;
  lang: Language;
}) => {
  const dates = await getContribDates(raw_id);
  const dict = await getDictionary(lang);
  const session = await getCurrentUser();

  const sortedDates = dates?.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row justify-between">
        <h3 className="font-semibold text-base">
          {dict.course.details.important_dates}
        </h3>
        {session && currentSemester?.id == raw_id.substring(0, 5) && (
          <DateContributeForm courseId={raw_id}>
            <Button size="sm" variant="ghost" className="h-6">
              <CalendarPlus className="w-4 h-4" />
            </Button>
          </DateContributeForm>
        )}
      </div>
      {sortedDates && (
        <div className="flex flex-col gap-1">
          {sortedDates.map((m, index) => (
            <div key={index} className="flex flex-row gap-2">
              <p className="text-sm min-w-20">
                {format(new Date(m.date), "yyyy-MM-dd")}
              </p>
              <p className="text-sm font-semibold">
                <Badge variant="secondary" className="mr-2">
                  {
                    dict.dialogs.DateContributeForm.types[
                      m.type as keyof typeof dict.dialogs.DateContributeForm.types
                    ]
                  }
                </Badge>
                {m.title}
              </p>
            </div>
          ))}
        </div>
      )}
      {!sortedDates?.length && (
        <p className="text-sm text-gray-500">No Information</p>
      )}
    </div>
  );
};

const CourseDetailContainer = async ({
  lang,
  courseId,
  bottomAware = false,
  modal = false,
}: {
  lang: Language;
  courseId: string;
  bottomAware?: boolean;
  modal?: boolean;
}) => {
  const dict = await getDictionary(lang);
  const course = await getCourseWithSyllabus(courseId);

  if (!course)
    return (
      <div className="py-6 px-4">
        <div className="flex flex-col gap-2 border-l border-neutral-500 pl-4 pr-6">
          <h1 className="text-2xl font-bold">404</h1>
          <p className="text-xl">找不到課程</p>

          <Link href="../">
            <Button size="sm" variant="outline">
              <ChevronLeft /> Back
            </Button>
          </Link>
        </div>
      </div>
    );
  const missingSyllabus = course.course_syllabus == null;

  const reviews = (await getCoursePTTReview(courseId)) ?? [];
  const otherClasses = await getOtherClasses(course as MinimalCourse);

  // times might not be available, check if it is empty list or its items are all empty strings
  const showTimetable = hasTimes(course as MinimalCourse);

  const colorMap = colorMapFromCourses(
    [course as MinimalCourse].map((c) => c.raw_id),
    timetableColors[Object.keys(timetableColors)[0]],
  );
  const timetableData = showTimetable
    ? createTimetableFromCourses([course as MinimalCourse], colorMap)
    : [];

  return (
    <Fade>
      <div
        className={cn(
          "flex flex-col pb-6 relative",
          modal
            ? "max-w-[min(72rem,calc(100vw-52px))]"
            : "max-w-[min(72rem,calc(100vw-16px))]",
        )}
      >
        <div className={cn("flex flex-col gap-4 pb-20 md:pb-0")}>
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="space-y-4 flex-1 w-full">
              <div className="space-y-2">
                <div className="font-semibold text-base ">
                  {toPrettySemester(course.semester)} 學期
                </div>
                <div className="font-bold text-xl mb-4 text-nthu-600">{`${course?.department} ${course?.course}-${course?.class}`}</div>
                <h1 className="font-semibold text-3xl flex flex-row flex-wrap gap-1">
                  <span>{course!.name_zh}</span>
                  <span>{course?.teacher_zh?.join(",") ?? ""}</span>
                </h1>
                <h2 className="font-semibold text-xl flex flex-row flex-wrap gap-1">
                  <span>{course!.name_en}</span>
                  <span>{course?.teacher_en?.join(",") ?? ""}</span>
                </h2>
              </div>
              <CourseTagList course={course} />
              {course.venues ? (
                course.venues.map((vn, i) => (
                  <p
                    key={vn}
                    className="text-blue-600 dark:text-blue-400 text-sm"
                  >
                    {vn}{" "}
                    <span className="text-black dark:text-white">
                      {course.times![i]}
                    </span>
                  </p>
                ))
              ) : (
                <p>No Venues</p>
              )}
              <CrossDisciplineTagList course={course} />
            </div>
            <div className="hidden md:flex flex-col gap-2 absolute top-0 right-0 mt-4 mr-4">
              <SelectCourseButtonDynamic courseId={course.raw_id} />
              <ShareCourseButton
                link={`https://nthumods.com/courses/${course.raw_id}`}
                displayName={`${course.name_zh} ${course.teacher_zh.join(",")}`}
              />
            </div>
            <div
              className={cn(
                "md:hidden fixed left-0 pt-2 px-4 shadow-md w-full h-16 flex flex-row gap-2 bg-background z-50",
                bottomAware ? "bottom-20" : "bottom-0",
              )}
            >
              <ShareCourseButton
                link={`https://nthumods.com/courses/${course.raw_id}`}
                displayName={`${course.name_zh} ${course.teacher_zh.join(",")}`}
              />
              <div className="flex-1 flex flex-col">
                <SelectCourseButtonDynamic courseId={course.raw_id} />
              </div>
            </div>
          </div>
          <Separator />
          <div className={"flex flex-col-reverse lg:flex-row gap-6 w-full"}>
            <div className="flex flex-col gap-4 min-w-0 lg:max-w-[calc(100%-284px)]">
              {!missingSyllabus && (
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold text-xl" id="brief">
                    {dict.course.details.brief}
                  </h3>
                  <p className="whitespace-pre-line text-sm">
                    {course.course_syllabus.brief}
                  </p>
                </div>
              )}
              {!missingSyllabus && (
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold text-xl" id="description">
                    {dict.course.details.description}
                  </h3>
                  <p className="whitespace-pre-line text-sm">
                    {course.course_syllabus.content ?? (
                      <div className="flex flex-col gap-2">
                        <DownloadSyllabus courseId={course.raw_id} />
                        <PDFViewerDynamic
                          file={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/syllabus/${encodeURIComponent(course.raw_id)}.pdf`}
                        />
                      </div>
                    )}
                  </p>
                </div>
              )}
              {course?.prerequisites && (
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold text-xl" id="prerequesites">
                    {dict.course.details.prerequesites}
                  </h3>
                  <div
                    className="whitespace-pre-line text-sm"
                    dangerouslySetInnerHTML={{ __html: course.prerequisites }}
                  />
                </div>
              )}
              {/* {showTimetable && <div className="flex flex-col gap-2">
                            <h3 className="font-semibold text-xl" id="timetable">{dict.course.details.timetable}</h3>
                            <TimetableDynamic timetableData={timetableData} />
                        </div>} */}
              {reviews.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold text-xl" id="ptt">
                    {dict.course.details.ptt_title}
                  </h3>
                  <Alert>
                    <AlertTriangle />
                    <AlertDescription>
                      {dict.course.details.ptt_disclaimer}
                    </AlertDescription>
                  </Alert>
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex space-x-4 pr-4">
                      {reviews.map((m, index) => (
                        <Dialog key={index}>
                          <DialogTrigger asChild>
                            <Card className="max-w-lg shrink-0">
                              <CardHeader>
                                <CardTitle className="text-lg">
                                  {index + 1}.{" "}
                                  {format(new Date(m.date ?? 0), "yyyy-MM-dd")}{" "}
                                  的心得
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <article className="whitespace-pre-line line-clamp-4 text-sm">
                                  {m.content}
                                </article>
                              </CardContent>
                            </Card>
                          </DialogTrigger>
                          <DialogContent className="">
                            <ScrollArea className="max-h-[90vh] whitespace-nowrap">
                              <p className="whitespace-pre-line text-sm">
                                {m.content}
                              </p>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              )}
              {course.course_scores && (
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold text-xl" id="scores">
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
              <div className="flex flex-col gap-2">
                <div className="flex flex-row">
                  <h3 className="font-semibold text-xl flex-1" id="other">
                    {dict.course.details.related_courses}
                  </h3>
                  <Button variant="ghost" asChild>
                    <Link
                      href={`/${lang}/courses?nthu_courses%5BrefinementList%5D%5Bdepartment%5D%5B0%5D=${course.department}&nthu_courses%5Bquery%5D=${course.name_zh} ${course.teacher_zh.join(" ")}`}
                    >
                      查看更多 <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </div>
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[110px] px-2">
                        學期/時間地點
                      </TableHead>
                      <TableHead className="w-[80px] px-2">開課教授</TableHead>
                      <TableHead className="w-28 px-2">歷年平均成績</TableHead>
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
                                <p key={i} className="text-xs text-gray-500">
                                  {m.venues[i]} {t}
                                </p>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-2">
                          {m.teacher_zh?.join(",")}
                        </TableCell>
                        <TableCell>
                          {m.course_scores && (
                            <div className="flex flex-col gap-1 text-xs">
                              <p>
                                {getScoreType(m.course_scores.type)}{" "}
                                {m.course_scores.average}
                              </p>
                              <p>標準差 {m.course_scores.std_dev}</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="p-0">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/${lang}/courses/${m.raw_id}`}>
                              <ArrowRight size={16} />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="w-full lg:w-[284px] flex flex-col gap-4">
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
                    {/* {showTimetable && <TOCNavItem href="#timetable" label={dict.course.details.timetable} />} */}
                    {course.course_scores && (
                      <TOCNavItem
                        href="#scores"
                        label={dict.course.details.scores}
                      />
                    )}
                    {reviews.length > 0 && (
                      <TOCNavItem href="#ptt" label={dict.course.details.ptt} />
                    )}
                    <TOCNavItem
                      href="#other"
                      label={dict.course.details.related_courses}
                    />
                  </ul>
                </div>
              </ScrollArea>
              <ImportantDates raw_id={course.raw_id} lang={lang} />
              {(course.note ?? "").trim().length > 0 && (
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-base">
                    {dict.course.details.remarks}
                  </h3>
                  <p className="text-sm">{course.note}</p>
                </div>
              )}
              {(course.restrictions ?? "").trim().length > 0 && (
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-base">
                    {dict.course.details.restrictions}
                  </h3>
                  <p className="text-sm">{course.restrictions}</p>
                </div>
              )}
              {(course.compulsory_for ?? []).length > 0 && (
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-base">
                    {dict.course.details.compulsory}
                  </h3>
                  <div className="flex flex-row gap-2 flex-wrap">
                    {course.compulsory_for?.map((m, index) => (
                      <Link
                        key={index}
                        href={`/${lang}/courses?nthu_courses%5BrefinementList%5D%5Bcompulsory_for%5D%5B0%5D=${course.compulsory_for}`}
                      >
                        <Badge variant="outline">
                          {getFormattedClassCode(m, course.semester, lang)}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {(course.elective_for ?? []).length > 0 && (
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-base">
                    {dict.course.details.elective}
                  </h3>
                  <div className="flex flex-row gap-2 flex-wrap">
                    {course.elective_for?.map((m, index) => (
                      <Link
                        key={index}
                        href={`/${lang}/courses?nthu_courses%5BrefinementList%5D%5Belective_for%5D%5B0%5D=${course.elective_for}`}
                      >
                        <Badge variant="outline">
                          {getFormattedClassCode(m, course.semester, lang)}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {(course.first_specialization ?? []).length > 0 && (
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-base">
                    {dict.course.details.first_specialization}
                  </h3>
                  <div className="flex flex-row gap-2 flex-wrap">
                    {course.first_specialization?.map((m, index) => (
                      <Link
                        key={index}
                        href={`/${lang}/courses?nthu_courses%5BrefinementList%5D%5Bfirst_specialization%5D%5B0%5D=${course.first_specialization}`}
                      >
                        <Badge variant="outline">{m}</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {(course.second_specialization ?? []).length > 0 && (
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-base">
                    {dict.course.details.second_specialization}
                  </h3>
                  <div className="flex flex-row gap-2 flex-wrap">
                    {course.second_specialization?.map((m, index) => (
                      <Link
                        key={index}
                        href={`/${lang}/courses?nthu_courses%5BrefinementList%5D%5Bsecond_specialization%5D%5B0%5D=${course.second_specialization}`}
                      >
                        <Badge variant="outline">{m}</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <CommmentsSectionDynamic course={course as MinimalCourse} />
        </div>
      </div>
    </Fade>
  );
};

export default CourseDetailContainer;
