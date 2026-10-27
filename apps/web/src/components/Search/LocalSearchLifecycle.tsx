import { useEffect } from "react";
import { useInstantSearch } from "react-instantsearch";
import type { ResilientSearchClient } from "@/lib/search-client";

type LocalSearchLifecycleProps = {
  searchClient: ResilientSearchClient;
  semester: string;
};

const scheduleIdle = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback);
    return () => idleWindow.cancelIdleCallback?.(handle);
  }
  const handle = window.setTimeout(callback, 0);
  return () => window.clearTimeout(handle);
};

const LocalSearchLifecycle = ({
  searchClient,
  semester,
}: LocalSearchLifecycleProps) => {
  const { refresh } = useInstantSearch();

  useEffect(
    () =>
      searchClient.subscribeLocalReady((readySemester) => {
        if (readySemester !== semester) return;
        refresh();
      }),
    [refresh, searchClient, semester],
  );

  useEffect(
    () =>
      scheduleIdle(() => {
        void searchClient.prefetch(semester).catch((error) => {
          console.warn("Local course-search prefetch unavailable:", error);
        });
      }),
    [searchClient, semester],
  );

  return null;
};

export default LocalSearchLifecycle;
