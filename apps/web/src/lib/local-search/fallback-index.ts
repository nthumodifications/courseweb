import { matchesLocalQuery } from "./tokenizer";
import type { SearchProjectionRecord } from "./projection";

/**
 * SSR/test fallback used only when Worker is unavailable. Browser production
 * builds use index.worker.ts, so this deliberately favors correctness and a
 * small implementation over reproducing FlexSearch's internal data structure.
 */
export const searchWithoutWorker = (
  records: readonly SearchProjectionRecord[],
  query: string,
) =>
  records.reduce<number[]>((ids, record, index) => {
    if (matchesLocalQuery(record, query)) ids.push(index);
    return ids;
  }, []);
