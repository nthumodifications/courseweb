import { CourseDefinition } from "@/config/supabase";
import useDictionary from "@/dictionaries/useDictionary";
import { getGECType } from "@/helpers/courses";
import {
  DetailedHTMLProps,
  FC,
  HTMLAttributes,
  PropsWithChildren,
} from "react";

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
const CourseTagList = ({
  course,
  showCredits = true,
  showEnrollment = true,
  showAdditionalTags = true,
  priority,
}: {
  course: CourseDefinition;
  showCredits?: boolean;
  showEnrollment?: boolean;
  showAdditionalTags?: boolean;
  priority?: number;
}) => {
  const dict = useDictionary();
  return (
    <div className="flex flex-row flex-wrap gap-1 text-sm">
      {showAdditionalTags && course.closed_mark && (
        <HighlightItem className="bg-destructive text-destructive-foreground">
          {course.closed_mark}
        </HighlightItem>
      )}
      {showEnrollment && (
        <>
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
        </>
      )}
      {showCredits && (
        <HighlightItem>
          <span className="">
            {course.credits} {dict.course.credits}
          </span>
        </HighlightItem>
      )}
      {showAdditionalTags && course.tags.includes("16周") && (
        <HighlightItem>
          <span className="">{dict.course.tags.sixteen_weeks}</span>
        </HighlightItem>
      )}
      {showAdditionalTags && course.tags.includes("18周") && (
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
      {showAdditionalTags && course.tags.includes("X-Class") && (
        <HighlightItem className="bg-destructive text-destructive-foreground">
          {dict.course.tags.x_class}
        </HighlightItem>
      )}
      {showAdditionalTags && (course.ge_target?.trim() || "").length > 0 && (
        <HighlightItem>
          {course.ge_target} {dict.course.tags.general_education}
        </HighlightItem>
      )}
      {showAdditionalTags && getGECType(course.ge_type || "") && (
        <HighlightItem>
          {dict.course.tags.general_education_core}{" "}
          {getGECType(course.ge_type!)}
        </HighlightItem>
      )}
      {showAdditionalTags && priority != null && priority !== 0 && (
        <HighlightItem className="bg-foreground text-muted">
          {priority} {dict.timetable.priority}
        </HighlightItem>
      )}
    </div>
  );
};

export default CourseTagList;
