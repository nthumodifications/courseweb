"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { getCDSCourseSubmissions, getCDSTerm } from "@/lib/cds_actions";

const CoursePicker = ({
  termObj,
  courses,
}: {
  termObj: Awaited<ReturnType<typeof getCDSTerm>>;
  courses: Awaited<ReturnType<typeof getCDSCourseSubmissions>>;
}) => {
  const [semester, setSemester] = useState(termObj.ref_sem);
  const { lang } = useParams();

  const getColor = (count: number, capacity: number) => {
    // capacity = 0 is gray
    // 0% is green
    // 70% or more is yellow
    // 90% or more is orange
    // 100% or more is red

    if (capacity === 0) {
      return "gray";
    }

    const percentage = count / capacity;
    if (percentage >= 0) {
      return "green";
    }
    if (percentage >= 0.7) {
      return "yellow";
    }
    if (percentage >= 0.9) {
      return "orange";
    }
    if (percentage >= 1) {
      return "red";
    }
  };

  return (
    <Tabs
      defaultValue={termObj.ref_sem}
      value={semester}
      onValueChange={setSemester}
    >
      <TabsList>
        <TabsTrigger value={termObj.ref_sem}>上學期</TabsTrigger>
        <TabsTrigger value={termObj.ref_sem_2}>下學期</TabsTrigger>
      </TabsList>
      <div className="w-full flex flex-col">
        {courses
          .filter((m) => m.semester == semester)
          .map((course) => (
            <div key={course.raw_id} className="py-2 w-full">
              <Link
                href={`/${lang}/cds/admin/${termObj.term}/${course.raw_id}`}
              >
                <div className="flex flex-row gap-2">
                  <div className="flex flex-row gap-2">
                    <h2 className="text-xl font-bold text-gray-700 dark:text-neutral-200">
                      {course.department} {course.course}-{course.class}{" "}
                      {course.name_zh}
                    </h2>
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-2"
                        style={{
                          background: getColor(
                            (course.cds_counts as unknown as { count: number })
                              .count,
                            course.capacity || 0,
                          ),
                        }}
                      ></div>
                      <p className="text-gray-500 dark:text-neutral-500">
                        {
                          (course.cds_counts as unknown as { count: number })
                            .count
                        }
                        /{course.capacity} 人
                      </p>
                    </div>
                  </div>
                  <ChevronRight />
                </div>
              </Link>
            </div>
          ))}
      </div>
    </Tabs>
  );
};

export default CoursePicker;
