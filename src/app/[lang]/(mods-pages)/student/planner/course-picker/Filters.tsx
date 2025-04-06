import useDictionary from "@/dictionaries/useDictionary";
import { departments } from "@/const/departments";
import { GETargetCodes } from "@/const/ge_target";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { semesterInfo } from "@/const/semester";
import SemesterSelector from "./SemesterSelector";
import ExpandableFilter from "./ExpandableFilter";
import ExpandableClassFilter from "./ExpandableClassFilter";

const latestSemID = semesterInfo[semesterInfo.length - 1].id;

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

const Filters = () => {
  const dict = useDictionary();

  return (
    <div className="w-full p-4">
      <div className="w-full flex flex-col gap-6">
        <SemesterSelector />
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
          <span className="text-sm">{dict.course.refine.special_tags}</span>
          <ExpandableFilter attribute="tags" clientSearch={true} />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">{dict.course.refine.language}</span>
          <ExpandableFilter
            attribute="language"
            searchable={false}
            synonms={languageSynonyms}
            clientSearch={true}
          />
          <div className="flex flex-col gap-2">
            <span className="text-sm">{dict.course.refine.level}</span>
            <ExpandableFilter
              attribute="courseLevel"
              searchable={true}
              limit={20}
            />
          </div>
        </div>
      </div>

      <Accordion type="multiple">
        <AccordionItem value="semester">
          <AccordionTrigger className="outline-none">
            {dict.course.refine.ge_filters}
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-sm">{dict.course.refine.geTarget}</span>
              <ExpandableFilter
                attribute="ge_target"
                clientSearch={true}
                synonms={geTargetSynonyms}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm">
                {dict.course.refine.gecDimensions}
              </span>
              <ExpandableFilter attribute="ge_type" clientSearch={true} />
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="advanced">
          <AccordionTrigger className="outline-none">
            {dict.course.refine.advanced_filters}
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-6">
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default Filters;
