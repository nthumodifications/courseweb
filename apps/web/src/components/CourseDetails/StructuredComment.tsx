import { useEffect, useState } from "react";
import { Textarea, Input, Checkbox, Label } from "@courseweb/ui";
import useDictionary from "@/dictionaries/useDictionary";
const StructuredComment = ({
  onValueChange,
}: {
  onValueChange: (value: string) => void;
}) => {
  const dict = useDictionary();
  const labels = dict.course.details.structured_comment;
  const [attendance, setAttendance] = useState<boolean>(false);
  const [hasPastYearMaterials, setHasPastYearMaterials] =
    useState<boolean>(false);
  const [extraSelection, setExtraSelection] = useState<string>("");
  const [suggestedPrerequisite, setSuggestedPrerequisite] =
    useState<string>("");
  const [courseMethod, setCourseMethod] = useState<string>("");
  const [scoring, setScoring] = useState<string>("");
  const [examType, setExamType] = useState<string>("");
  const [instructorPersonality, setInstructorPersonality] =
    useState<string>("");
  const [extraComments, setExtraComments] = useState<string>("");

  const handleValueChange = () => {
    const value = `# ${labels.attendance}${labels.separator}
  ${attendance ? labels.yes : labels.no}\n
  # ${labels.past_materials}${labels.separator}
  ${hasPastYearMaterials ? labels.yes : labels.no}\n
  # ${labels.extra_selection}${labels.separator}
  ${extraSelection}\n
  # ${labels.prerequisite}${labels.separator}
  ${suggestedPrerequisite}\n
  # ${labels.method}${labels.separator}
  ${courseMethod}\n
  # ${labels.grading}${labels.separator}
  ${scoring}\n
  # ${labels.exam_type}${labels.separator}
  ${examType}\n
  # ${labels.instructor_personality}${labels.separator}
  ${instructorPersonality}\n
  # ${labels.additional}${labels.separator}
  ${extraComments}\n
  `;
    onValueChange(value);
  };

  useEffect(() => {
    handleValueChange();
  }, [
    attendance,
    hasPastYearMaterials,
    extraSelection,
    suggestedPrerequisite,
    courseMethod,
    scoring,
    examType,
    instructorPersonality,
    extraComments,
    labels,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-2 items-center">
        <Label>{labels.attendance}</Label>
        <Checkbox
          aria-label={labels.attendance}
          checked={attendance}
          onCheckedChange={(v) =>
            typeof v == "string"
              ? setAttendance(v.valueOf() == "true")
              : setAttendance(v.valueOf())
          }
        />
      </div>
      <div className="flex flex-row gap-2 items-center">
        <Label>{labels.past_materials}</Label>
        <Checkbox
          aria-label={labels.past_materials}
          checked={hasPastYearMaterials}
          onCheckedChange={(v) =>
            typeof v == "string"
              ? setHasPastYearMaterials(v.valueOf() == "true")
              : setHasPastYearMaterials(v.valueOf())
          }
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{labels.extra_selection}</Label>
        <Input
          placeholder={labels.yes_no_placeholder}
          value={extraSelection}
          onChange={(e) => setExtraSelection(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{labels.prerequisite}</Label>
        <Input
          placeholder={labels.prerequisite_placeholder}
          value={suggestedPrerequisite}
          onChange={(e) => setSuggestedPrerequisite(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{labels.method}</Label>
        <Textarea
          placeholder={labels.method_placeholder}
          value={courseMethod}
          onChange={(e) => setCourseMethod(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{labels.grading}</Label>
        <Textarea
          placeholder={labels.grading_placeholder}
          value={scoring}
          onChange={(e) => setScoring(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{labels.exam_type}</Label>
        <Textarea
          placeholder={labels.exam_type_placeholder}
          value={examType}
          onChange={(e) => setExamType(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{labels.instructor_personality}</Label>
        <Textarea
          placeholder={labels.instructor_personality_placeholder}
          value={instructorPersonality}
          onChange={(e) => setInstructorPersonality(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{labels.additional}</Label>
        <Textarea
          placeholder={labels.additional_placeholder}
          value={extraComments}
          onChange={(e) => setExtraComments(e.target.value)}
        />
      </div>
    </div>
  );
};

export default StructuredComment;
