import { useMemo, useSyncExternalStore } from "react";
import { useInfiniteHits } from "react-instantsearch";
import {
  withCourseText,
  type ResilientSearchClient,
} from "@/lib/search-client";
import type { CourseSyllabusView } from "@/config/supabase";

/**
 * useInfiniteHits for course results, with brief/keywords filled in once the
 * local text tier lands after the hits were rendered and cached.
 */
export const useCourseTextHits = (
  searchClient: ResilientSearchClient,
  options: Parameters<typeof useInfiniteHits<CourseSyllabusView>>[0],
) => {
  const result = useInfiniteHits<CourseSyllabusView>(options);
  const searchVersion = useSyncExternalStore(
    searchClient.subscribe,
    searchClient.getVersion,
    () => 0,
  );
  const hits = useMemo(
    () => result.hits.map((hit) => withCourseText(hit, searchClient)),
    // searchVersion changes when the local text tier lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result.hits, searchClient, searchVersion],
  );
  return { ...result, hits };
};
