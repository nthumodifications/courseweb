import useDictionary from "@/dictionaries/useDictionary";
import { departments, GETargetCodes, semesterInfo } from "@courseweb/shared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@courseweb/ui";
import ClassRefinementItem from "./ClasssRefinementItem";
import ExpandableClassFilter from "../student/planner/course-picker/ExpandableClassFilter";
import ExpandableFilter from "../student/planner/course-picker/ExpandableFilter";
import InlineCheckboxFilter from "../student/planner/course-picker/InlineCheckboxFilter";
import TimeSelectionFilter from "./TimeSelectionFilter";
import { Label } from "@courseweb/ui";
import { MinimalCourse } from "@/types/courses";

const languageSynonyms: Record<string, string> = {
  中: "Chinese",
  英: "English",
};
const departmentSynonyms: Record<string, string> = departments.reduce(
  (a, v) => ({ ...a, [v.code]: `${v.code} ${v.name_zh}` }),
  {},
);
const geTargetSynonyms: Record<string, string> = GETargetCodes.reduce(
  (a, v) => ({ ...a, [v.code]: `${v.short_en} ${v.short_zh}` }),
  {},
);

const Filters = ({ selectedCourses }: { selectedCourses: MinimalCourse[] }) => {
  const dict = useDictionary();
  return (
    <div className="w-full flex flex-col gap-2">
      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-sm">
            {dict.course.refine.compulsory_elective}
          </span>
          <ExpandableClassFilter limit={20} />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">{dict.course.refine.department}</span>
          <ExpandableFilter
            attribute="department"
            searchable={true}
            limit={500}
            clientSearch={true}
            synonms={departmentSynonyms}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">{dict.course.refine.level}</span>
          <ExpandableFilter
            attribute="courseLevel"
            searchable={true}
            limit={20}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">上課時間</span>
          <TimeSelectionFilter
            attribute="separate_times"
            selectedCourses={selectedCourses}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">{dict.course.refine.special_tags}</span>
          <InlineCheckboxFilter attribute="tags" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">{dict.course.refine.language}</span>
          <InlineCheckboxFilter
            attribute="language"
            synonms={languageSynonyms}
          />
        </div>
      </div>
      {/* Advanced Filters Section */}
      <div>
        <h3 className="font-medium text-base mb-2">
          {dict.course.refine.ge_filters}
        </h3>
        <div className="w-full flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm">{dict.course.refine.geTarget}</span>
            <InlineCheckboxFilter
              attribute="ge_target"
              synonms={geTargetSynonyms}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm">{dict.course.refine.gecDimensions}</span>
            <InlineCheckboxFilter
              attribute="ge_type"
              filterFn={(items) => {
                // Ensure it starts with "核心通識"
                return items.filter((item) => {
                  return item.label.startsWith("核心通識");
                });
              }}
              sortFn={(items) => {
                // Sort by string order
                return items.sort((a, b) => {
                  return a.label.localeCompare(b.label);
                });
              }}
            />
          </div>
        </div>
      </div>
      <div>
        <h3 className="font-medium text-base mb-2">
          {dict.course.refine.advanced_filters}
        </h3>
        <div className="w-full flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm">{dict.course.refine.venues}</span>
            <ExpandableFilter
              attribute="venues"
              searchable={true}
              limit={20}
              placeholder="Search (to display more)..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm">
              {dict.course.refine.firstSpecialization}
            </span>
            <ExpandableFilter
              attribute="first_specialization"
              searchable={true}
              limit={20}
              placeholder="Search (to display more)..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm">
              {dict.course.refine.secondSpecialization}
            </span>
            <ExpandableFilter
              attribute="second_specialization"
              searchable={true}
              limit={20}
              placeholder="Search (to display more)..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm">
              {dict.course.refine.cross_discipline}
            </span>
            <ExpandableFilter
              attribute="cross_discipline"
              searchable={true}
              limit={20}
              placeholder="Search (to display more)..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Filters;
