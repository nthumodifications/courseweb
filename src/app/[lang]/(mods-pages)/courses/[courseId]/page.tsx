import { ResolvingMetadata } from "next";
import { getCourseWithSyllabus } from "@/lib/course";
import { LangProps } from "@/types/pages";
import CourseDetailContainer from "@/components/CourseDetails/CourseDetailsContainer";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type PageProps = {
  params: { courseId?: string };
};

export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata,
) {
  const course = await getCourseWithSyllabus(
    decodeURI(params.courseId as string),
  );

  if (!course) redirect("/404");

  return {
    ...parent,
    title: `${course?.department} ${course?.course}-${course?.class} ${course!.name_zh} ${course!.name_en}`,
    description: `${course!.teacher_zh?.join(",")} ${course!.teacher_en?.join(",")} \n ${course!.course_syllabus ? course!.course_syllabus.brief : ""}`,
    openGraph: {
      type: "website",
      title: `${course?.department} ${course?.course}-${course?.class} ${course!.name_zh} ${course!.name_en} | NTHUMods`,
      description: `${course!.teacher_zh?.join(",")} ${course!.teacher_en?.join(",")} \n ${course!.course_syllabus ? course!.course_syllabus.brief : ""}`,
      url: "https://nthumods.com",
      siteName: "NTHUMods",
      countryName: "Taiwan",
      locale: "en, zh",
    },
  };
}

const CourseDetailPage = async ({ params }: PageProps & LangProps) => {
  const courseId = decodeURI(params.courseId as string);

  return (
    <div className="flex flex-col gap-2 px-2">
      <div className="">
        <Button variant="ghost" asChild size="sm">
          <Link href={`/${params.lang}/courses`}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            回到課程列表
          </Link>
        </Button>
      </div>
      <CourseDetailContainer
        lang={params.lang}
        courseId={courseId}
        bottomAware
      />
    </div>
  );
};

export default CourseDetailPage;
