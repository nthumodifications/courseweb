import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getDefaultSemester,
  getSemesterRevision,
  semesterInfo,
  subscribeSemesters,
} from "@courseweb/shared";

export const useSemesterRevision = () =>
  useSyncExternalStore(
    subscribeSemesters,
    getSemesterRevision,
    getSemesterRevision,
  );

export const useSemesters = () => {
  useSemesterRevision();
  return semesterInfo;
};

/** Re-render when hydrated dates or the local calendar day changes. */
export const useDefaultSemesterId = () => {
  useSemesterRevision();
  const [dayVersion, setDayVersion] = useState(0);
  useEffect(() => {
    const now = new Date();
    const nextDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      100,
    );
    const timer = window.setTimeout(() => {
      setDayVersion((version) => version + 1);
    }, nextDay.getTime() - now.getTime());
    return () => window.clearTimeout(timer);
  }, [dayVersion]);

  return getDefaultSemester().id;
};
