import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
const StructuredComment = ({
  onValueChange,
}: {
  onValueChange: (value: string) => void;
}) => {
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
    const value = `# 有點名：
  ${attendance ? "有" : "沒有"}\n
  # 有考古：
  ${hasPastYearMaterials ? "有" : "沒有"}\n
  # 加簽：
  ${extraSelection}\n
  # 建議先修課程：
  ${suggestedPrerequisite}\n
  # 上課方式：
  ${courseMethod}\n
  # 給分：
  ${scoring}\n
  # 考試作業型態：
  ${examType}\n
  # 老師的喜好、個性：
  ${instructorPersonality}\n
  # 補充：
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
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row gap-2 items-center">
        <Label>有點名</Label>
        <Checkbox
          checked={attendance}
          onCheckedChange={(v) =>
            typeof v == "string"
              ? setAttendance(v.valueOf() == "true")
              : setAttendance(v.valueOf())
          }
        />
      </div>
      <div className="flex flex-row gap-2 items-center">
        <Label>有考古</Label>
        <Checkbox
          checked={hasPastYearMaterials}
          onCheckedChange={(v) =>
            typeof v == "string"
              ? setHasPastYearMaterials(v.valueOf() == "true")
              : setHasPastYearMaterials(v.valueOf())
          }
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>加簽</Label>
        <Input
          placeholder="是/否，補充~"
          value={extraSelection}
          onChange={(e) => setExtraSelection(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>建議先修課程</Label>
        <Input
          placeholder="建議先修課程"
          value={suggestedPrerequisite}
          onChange={(e) => setSuggestedPrerequisite(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>上課方式</Label>
        <Textarea
          placeholder="上課方式"
          value={courseMethod}
          onChange={(e) => setCourseMethod(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>給分</Label>
        <Textarea
          placeholder="給分"
          value={scoring}
          onChange={(e) => setScoring(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>考試作業型態</Label>
        <Textarea
          placeholder="考試作業型態"
          value={examType}
          onChange={(e) => setExamType(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>老師的喜好、個性</Label>
        <Textarea
          placeholder="老師的喜好、個性"
          value={instructorPersonality}
          onChange={(e) => setInstructorPersonality(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>補充</Label>
        <Textarea
          placeholder="補充"
          value={extraComments}
          onChange={(e) => setExtraComments(e.target.value)}
        />
      </div>
    </div>
  );
};

export default StructuredComment;
