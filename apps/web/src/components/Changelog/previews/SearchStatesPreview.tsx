import useDictionary from "@/dictionaries/useDictionary";
import { SearchResultCount } from "@/components/Search/SearchResultCount";
import { COURSE_SEARCH_PREVIEW } from "./sampleData";

// Mirrors the compact course row from CourseListItem without changing that
// production component just to make a static changelog preview.
const SearchPreviewCourseRow = () => {
  const dict = useDictionary();
  const course = COURSE_SEARCH_PREVIEW;

  return (
    <div className="flex min-w-0 flex-row gap-4 py-4 @container">
      <div className="min-w-0 flex-1">
        <div className="mb-2 space-y-1 @md:pt-0">
          <div className="flex flex-row items-center gap-2">
            <p className="text-nthu-500 text-sm font-bold">
              {course.department} {course.course}
              {course.class.padStart(2, "0")}
            </p>
          </div>
          <div className="flex min-w-0 max-w-full flex-row items-start gap-1 text-left font-bold">
            <span className="min-w-0 whitespace-normal">
              {course.name_zh} - {course.teacher_zh.join(",")}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            {course.venues.map((venue, index) => (
              <div key={venue} className="text-muted-foreground text-xs">
                {venue} / {course.times[index]}
              </div>
            ))}
          </div>
          <div className="flex flex-row flex-wrap gap-1 text-sm">
            <span className="rounded-md bg-muted px-1 py-1 text-xs text-foreground">
              {course.enrolled} {dict.course.tags.enrolled_suffix}
            </span>
            <span className="rounded-md bg-muted px-1 py-1 text-xs text-foreground">
              {course.credits} {dict.course.credits}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const SearchStatesPreview = () => {
  const dict = useDictionary();

  return (
    <div className="pointer-events-none flex h-full flex-col justify-center gap-3 overflow-hidden p-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">
          {dict.changelog.preview.search.loading_state}
        </span>
        <SearchResultCount
          status="loading"
          nbHits={0}
          processingTimeMS={0}
          showProcessingTime={false}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">
          {dict.changelog.preview.search.offline_state}
        </span>
        <SearchResultCount
          status="idle"
          nbHits={22}
          processingTimeMS={0}
          showProcessingTime={false}
        />
      </div>
      <div className="min-h-0 overflow-hidden divide-y divide-border">
        <SearchPreviewCourseRow />
      </div>
    </div>
  );
};

export default SearchStatesPreview;
