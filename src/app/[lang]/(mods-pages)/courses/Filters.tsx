import useDictionary from '@/dictionaries/useDictionary'
import { departments } from "@/const/departments";
import { GETargetCodes } from '@/const/ge_target';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import TimeslotSelector from '@/components/Courses/TimeslotSelector';
import Timeslotfilteritem from './TimeslotFilterItem';
import FilterItem from './FilterItem';
import { semesterInfo } from '@/const/semester';
import {useClearRefinements} from 'react-instantsearch';
import ClassRefinementItem from './ClasssRefinementItem';

const latestSemID = semesterInfo[semesterInfo.length - 1].id;

const languageSynonyms: Record<string, string> = {
  "中": "Chinese",
  "英": "English",
}
const departmentSynonyms: Record<string, string> = departments.reduce((a, v) => ({ ...a, [v.code]: v.name_zh }), {})
const geTargetSynonyms: Record<string, string> = GETargetCodes.reduce((a, v) => ({ ...a, [v.code]: `${v.short_en} ${v.short_zh}` }), {})

const Filters = () => {

  const dict = useDictionary()

  return <div className="w-full p-4">
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm">
          {dict.course.refine.compulsory_elective}
        </span>
        <ClassRefinementItem
          searchable={true}
          limit={20}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm">{dict.course.refine.department}</span>
        <FilterItem
          attribute="department"
          searchable={true}
          limit={500}
          clientSearch={true}
          synonms={departmentSynonyms}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm">
          {dict.course.refine.special_tags}
        </span>
        <FilterItem
          attribute="tags"
          clientSearch={true}
        />
      </div>

      <div className="w-full flex flex-col gap-2">
        <span className="text-sm">{dict.course.refine.time}</span>
        <Timeslotfilteritem
          clientSearch={true}
        />
      </div>    
      
      <div className="flex flex-col gap-2">
        <span className="text-sm">{dict.course.refine.language}</span>
        <FilterItem
          attribute="language"
          searchable={false}
          synonms={languageSynonyms}
          clientSearch={true}
        />
      </div>  
    </div>

    <Accordion type="multiple">
      <AccordionItem value="semester">
        <AccordionTrigger className="outline-none">
          {dict.course.refine.ge_filters}
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm">
              {dict.course.refine.geTarget}
            </span>
            <FilterItem
              attribute="ge_target"
              clientSearch={true}
              synonms={geTargetSynonyms}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm">
              {dict.course.refine.gecDimensions}
            </span>
            <FilterItem
              attribute="ge_type"
              clientSearch={true}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="advanced">
        <AccordionTrigger className="outline-none">
          {dict.course.refine.advanced_filters}
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-6">
          

          <div className="flex flex-col gap-2">
            <span className="text-sm">
              {dict.course.refine.venues}
            </span>
            <FilterItem
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
            <FilterItem
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
            <FilterItem
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
            <FilterItem
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
}

export default Filters;