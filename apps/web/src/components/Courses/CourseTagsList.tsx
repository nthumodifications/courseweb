import { CourseDefinition } from "@/config/supabase";
import useDictionary from "@/dictionaries/useDictionary";
import { getGECType } from "@/helpers/courses";
import { Badge } from "@courseweb/ui";

type CourseBadgeVariant = "secondary" | "outline" | "destructive";

const CourseBadge = ({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: CourseBadgeVariant;
}) => (
  <Badge
    variant={variant}
    className="max-w-full whitespace-normal break-words tabular-nums"
  >
    {children}
  </Badge>
);

const CourseTagList = ({ course }: { course: CourseDefinition }) => {
  const dict = useDictionary();
  return (
    <div className="flex max-w-full flex-row flex-wrap gap-1 text-sm">
      {course.closed_mark && (
        <CourseBadge variant="destructive">{course.closed_mark}</CourseBadge>
      )}
      <CourseBadge variant="secondary">
        <span>
          {course.capacity ?? "-"}
          {(course.reserve ?? 0) > 0 && (
            <>{` ${dict.course.tags.reserve_prefix} ${course.reserve}`}</>
          )}{" "}
          {dict.course.tags.people}
        </span>
      </CourseBadge>
      {course.enrolled != undefined && (
        <CourseBadge variant="secondary">
          <span>
            {course.enrolled} {dict.course.tags.enrolled_suffix}{" "}
          </span>
        </CourseBadge>
      )}
      <CourseBadge variant="secondary">
        <span>
          {course.credits} {dict.course.credits}
        </span>
      </CourseBadge>
      {course.tags.includes("16周") && (
        <CourseBadge variant="outline">
          <span>{dict.course.tags.sixteen_weeks}</span>
        </CourseBadge>
      )}
      {course.tags.includes("18周") && (
        <CourseBadge variant="outline">
          <span>{dict.course.tags.eighteen_weeks}</span>
        </CourseBadge>
      )}
      {course.language == "英" ? (
        <CourseBadge variant="outline">{dict.course.tags.english}</CourseBadge>
      ) : (
        <CourseBadge variant="outline">{dict.course.tags.chinese}</CourseBadge>
      )}
      {course.tags.includes("X-Class") && (
        <CourseBadge variant="outline">{dict.course.tags.x_class}</CourseBadge>
      )}
      {(course.ge_target?.trim() || "").length > 0 && (
        <CourseBadge variant="outline">
          {course.ge_target} {dict.course.tags.general_education}
        </CourseBadge>
      )}
      {getGECType(course.ge_type || "") && (
        <CourseBadge variant="outline">
          {dict.course.tags.general_education_core}{" "}
          {getGECType(course.ge_type!)}
        </CourseBadge>
      )}
    </div>
  );
};

export default CourseTagList;
