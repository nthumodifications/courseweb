import type { MinimalCourse } from "@/types/courses";

export function useItemListJsonLd({
  courses,
  maxItems = 10,
}: {
  courses: MinimalCourse[];
  maxItems?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: courses.slice(0, maxItems).map((course, index) => ({
      "@type": "Course",
      position: index + 1,
      name: course.name_zh,
      url: `https://nthumods.com/zh/courses/${course.raw_id}`,
    })),
  };
}
