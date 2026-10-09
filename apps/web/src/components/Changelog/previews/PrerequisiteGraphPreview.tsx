import useDictionary from "@/dictionaries/useDictionary";
import PrerequisiteBlock from "@/components/CourseDetails/PrerequisiteBlock";
import {
  PREREQUISITE_PREVIEW_COURSE,
  PREREQUISITE_PREVIEW_PARSED,
  PREREQUISITE_PREVIEW_ROWS,
} from "./sampleData";

const PrerequisiteGraphPreview = ({ language }: { language: "zh" | "en" }) => {
  const dict = useDictionary();

  return (
    <div className="pointer-events-none flex h-full min-w-0 items-center overflow-hidden px-3">
      <div className="w-full min-w-0">
        <PrerequisiteBlock
          parsed={PREREQUISITE_PREVIEW_PARSED}
          course={PREREQUISITE_PREVIEW_COURSE}
          rows={PREREQUISITE_PREVIEW_ROWS}
          lang={language}
          dict={dict}
        />
      </div>
    </div>
  );
};

export default PrerequisiteGraphPreview;
