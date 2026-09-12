import { CourseDefinition } from "@/config/supabase";
import useDictionary from "@/dictionaries/useDictionary";
import { getGECType } from "@/helpers/courses";
import {
  DetailedHTMLProps,
  FC,
  HTMLAttributes,
  PropsWithChildren,
} from "react";
import { Users } from "lucide-react";

const HighlightItem: FC<
  PropsWithChildren<
    DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>
  >
> = ({ children, className, ...props }) => {
  return (
    <div
      className={`flex min-w-[52px] flex-row items-center justify-center space-x-2 rounded-md bg-muted px-1 py-1 text-xs text-foreground select-none ${className ?? ""}`}
      {...props}
    >
      {children}
    </div>
  );
};
const CourseTagList = ({ course }: { course: CourseDefinition }) => {
  const dict = useDictionary();
  return (
    <div className="flex flex-row flex-wrap gap-1 text-sm">
      {course.closed_mark && (
        <HighlightItem className="bg-destructive text-destructive-foreground">
          {course.closed_mark}
        </HighlightItem>
      )}
      <HighlightItem>
        <span className="">
          {course.capacity ?? "-"}
          {(course.reserve ?? 0) > 0 && (
            <>{` ${dict.course.tags.reserve_prefix} ${course.reserve}`}</>
          )}{" "}
          {dict.course.tags.people}
        </span>
      </HighlightItem>
      {course.enrolled != undefined && (
        <HighlightItem>
          <span className="">
            {course.enrolled} {dict.course.tags.enrolled_suffix}{" "}
          </span>
        </HighlightItem>
      )}
      <HighlightItem>
        <span className="">
          {course.credits} {dict.course.credits}
        </span>
      </HighlightItem>
      {course.tags.includes("16周") && (
        <HighlightItem>
          <span className="">{dict.course.tags.sixteen_weeks}</span>
        </HighlightItem>
      )}
      {course.tags.includes("18周") && (
        <HighlightItem>
          <span className="">{dict.course.tags.eighteen_weeks}</span>
        </HighlightItem>
      )}
      {course.language == "英" ? (
        <HighlightItem className="bg-primary/10 text-primary">
          {dict.course.tags.english}
        </HighlightItem>
      ) : (
        <HighlightItem className="bg-primary/10 text-primary">
          {dict.course.tags.chinese}
        </HighlightItem>
      )}
      {course.tags.includes("X-Class") && (
        <HighlightItem className="bg-destructive text-destructive-foreground">
          {dict.course.tags.x_class}
        </HighlightItem>
      )}
      {(course.ge_target?.trim() || "").length > 0 && (
        <HighlightItem>
          {course.ge_target} {dict.course.tags.general_education}
        </HighlightItem>
      )}
      {getGECType(course.ge_type || "") && (
        <HighlightItem>
          {dict.course.tags.general_education_core} {getGECType(course.ge_type!)}
        </HighlightItem>
      )}
    </div>
  );
};

export default CourseTagList;
