import type { Location } from "react-router-dom";

export type CourseDialogView =
  | { type: "course"; id: string; path: string; search: string }
  | { type: "instructor"; name: string; path: string; search: string }
  | { type: "module"; key: string; path: string; search: string };

export type CourseDialogBackground = Pick<
  Location,
  "pathname" | "search" | "hash" | "key"
>;

export type CourseDialogHistoryState = {
  dialog?: {
    background: CourseDialogBackground;
    originIdx?: number;
  };
};

export const parseCourseDialogPath = (
  path: string,
): CourseDialogView | null => {
  const url = new URL(path, "https://courseweb.local");
  const courseMatch = /^(?:\/(en|zh)\/courses\/([^/]+))$/.exec(url.pathname);
  if (courseMatch) {
    return {
      type: "course",
      id: decodeURIComponent(courseMatch[2]),
      path: `${url.pathname}${url.search}${url.hash}`,
      search: url.search,
    };
  }

  const instructorMatch = /^(?:\/(en|zh)\/courses\/instructor\/([^/]+))$/.exec(
    url.pathname,
  );
  if (instructorMatch) {
    return {
      type: "instructor",
      name: decodeURIComponent(instructorMatch[2]),
      path: `${url.pathname}${url.search}${url.hash}`,
      search: url.search,
    };
  }

  const moduleMatch = /^(?:\/(en|zh)\/courses\/module\/([^/]+))$/.exec(
    url.pathname,
  );
  if (moduleMatch) {
    return {
      type: "module",
      key: decodeURIComponent(moduleMatch[2]),
      path: `${url.pathname}${url.search}${url.hash}`,
      search: url.search,
    };
  }

  return null;
};
