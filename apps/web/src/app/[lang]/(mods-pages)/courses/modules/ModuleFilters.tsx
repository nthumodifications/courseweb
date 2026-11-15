import useDictionary from "@/dictionaries/useDictionary";
import ExpandableFilter from "@/app/[lang]/(mods-pages)/student/planner/course-picker/ExpandableFilter";
import InlineCheckboxFilter from "@/app/[lang]/(mods-pages)/student/planner/course-picker/InlineCheckboxFilter";

const ModuleFilters = () => {
  const dict = useDictionary();
  const filters = dict.course.module.filters;

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-sm">{filters.department}</span>
          <ExpandableFilter
            attribute="department"
            mode="checkbox"
            searchable={true}
            limit={500}
            clientSearch={true}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">{filters.credits}</span>
          <InlineCheckboxFilter attribute="credits" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">{filters.language}</span>
          <InlineCheckboxFilter
            attribute="language"
            synonyms={filters.languageOptions}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">{filters.termOffered}</span>
          <InlineCheckboxFilter
            attribute="termOffered"
            synonyms={filters.termOptions}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">{filters.recentlyOffered}</span>
          <InlineCheckboxFilter
            attribute="recentlyOffered"
            synonyms={filters.recentOptions}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">{filters.level}</span>
          <InlineCheckboxFilter
            attribute="courseLevel"
            synonyms={filters.levelOptions}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm">{filters.englishTaught}</span>
          <InlineCheckboxFilter
            attribute="englishTaught"
            synonyms={filters.englishTaughtOptions}
          />
        </div>
      </div>
    </div>
  );
};

export default ModuleFilters;
