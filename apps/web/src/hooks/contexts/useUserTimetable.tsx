import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useMemo,
  useLayoutEffect,
} from "react";
import { CourseDefinition } from "@/config/supabase";
import { RawCourseID } from "@/types/courses";
import { lastSemester, timetableColors } from "@courseweb/shared";
import { getSemesterFromID } from "@/helpers/courses";
import { event } from "@/lib/gtag";

import { useQuery } from "@tanstack/react-query";
import useSyncedStorage from "../useSyncedStorage";
import {
  mergeCourseStorage,
  mergeCustomTimetableStorage,
  mergeStringArray,
} from "../syncedStorage";
import client from "@/config/api";
import { CustomTimetableItem, CustomTimetableStorage } from "@/types/timetable";
import { normalizeCustomTimetableStorage, valuesEqual } from "../syncedStorage";

export type TimetableFieldKey =
  | "code"
  | "title"
  | "time"
  | "teacher"
  | "venue"
  | "credits";

export const DEFAULT_FIELD_ORDER: TimetableFieldKey[] = [
  "code",
  "title",
  "time",
  "teacher",
  "venue",
  "credits",
];

export type TimetableFontSize = "xs" | "sm" | "base" | "lg";
export type TimetableFontFamily =
  | "system"
  | "sans"
  | "serif"
  | "mono"
  | "rounded";

export const TIMETABLE_FONT_SIZE_CLASSES: Record<TimetableFontSize, string> = {
  xs: "text-[10px]",
  sm: "text-xs",
  base: "text-sm",
  lg: "text-base",
};

export const TIMETABLE_FONT_FAMILIES: Record<TimetableFontFamily, string> = {
  system: "system-ui, sans-serif",
  sans: "ui-sans-serif, system-ui, sans-serif",
  serif: "ui-serif, Georgia, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  rounded: 'ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif',
};

export interface TimetableDisplayPreferences {
  language: "app" | "zh" | "en";
  align: "left" | "center" | "right";
  verticalAlign: "top" | "center" | "bottom";
  fontSize: TimetableFontSize;
  fontFamily: TimetableFontFamily;
  display: {
    title: boolean;
    code: boolean;
    time: boolean;
    venue: boolean;
    teacher: boolean;
    credits: boolean;
  };
  fieldOrder: TimetableFieldKey[];
}

export const DEFAULT_TIMETABLE_DISPLAY_PREFERENCES: TimetableDisplayPreferences =
  {
    language: "app",
    align: "center",
    verticalAlign: "top",
    fontSize: "sm",
    fontFamily: "system",
    display: {
      title: true,
      code: false,
      time: true,
      venue: true,
      teacher: false,
      credits: false,
    },
    fieldOrder: DEFAULT_FIELD_ORDER,
  };

const normalizeTimetableDisplayPreferences = (
  value: Partial<TimetableDisplayPreferences> | undefined,
): TimetableDisplayPreferences => ({
  ...DEFAULT_TIMETABLE_DISPLAY_PREFERENCES,
  ...value,
  fontSize: value?.fontSize ?? DEFAULT_TIMETABLE_DISPLAY_PREFERENCES.fontSize,
  fontFamily:
    value?.fontFamily ?? DEFAULT_TIMETABLE_DISPLAY_PREFERENCES.fontFamily,
  display: {
    ...DEFAULT_TIMETABLE_DISPLAY_PREFERENCES.display,
    ...(value?.display ?? {}),
  },
  fieldOrder:
    value?.fieldOrder?.filter((field) => DEFAULT_FIELD_ORDER.includes(field))
      .length === DEFAULT_FIELD_ORDER.length
      ? value.fieldOrder
      : DEFAULT_FIELD_ORDER,
});

export type CourseLocalStorage = { [sem: string]: RawCourseID[] };

const userTimetableContext = createContext<
  ReturnType<typeof useUserTimetableProvider>
>({
  getSemesterCourses: () => [],
  semesterCourses: [],
  timetableTheme: Object.keys(timetableColors)[0],
  currentColors: [],
  userDefinedColors: {},
  courses: {},
  customItems: {},
  semesterCustomItems: [],
  getSemesterCustomItems: () => [],
  setCustomItems: () => {},
  hoverCourse: null,
  setHoverCourse: () => {},
  colorMap: {},
  setCourses: () => {},
  clearCourses: () => {},
  deleteCourse: () => {},
  setColorMap: () => {},
  addCourse: () => {},
  setTimetableTheme: () => {},
  setUserDefinedColors: () => {},
  setColor: () => {},
  addCustomItem: () => {},
  updateCustomItem: () => {},
  deleteCustomItem: () => {},
  setCustomItemColor: () => {},
  isCourseSelected: () => false,
  isLoading: true,
  error: null,
  semester: lastSemester.id,
  isCoursesEmpty: true,
  setSemester: () => {},
  preferences: {
    language: "app",
    align: "center",
    verticalAlign: "top",
    fontSize: "sm",
    fontFamily: "system",
    display: {
      title: true,
      code: false,
      time: true,
      venue: true,
      teacher: false,
      credits: false,
    },
    fieldOrder: DEFAULT_FIELD_ORDER,
  },
  setPreferences: () => {},
  favourites: [],
  setFavourites: () => {},
});

const useUserTimetableProvider = (loadCourse = true) => {
  const [courses, setCourses] = useSyncedStorage<CourseLocalStorage>(
    "courses",
    {},
    mergeCourseStorage,
  );
  const [hoverCourse, setHoverCourse] = useState<CourseDefinition | null>(null);
  const [colorMap, setColorMap] = useSyncedStorage<{
    [courseID: string]: string;
  }>("course_color_map", {}); //map from courseID to color
  const [timetableTheme, _setTimetableTheme] = useSyncedStorage<string>(
    "timetable_theme",
    "pastelColors",
  );
  const [userDefinedColors, setUserDefinedColors] = useSyncedStorage<{
    [theme_name: string]: string[];
  }>("user_defined_colors", {});
  const [storedPreferences, setStoredPreferences] =
    useSyncedStorage<TimetableDisplayPreferences>(
      "timetable_display_preferences",
      DEFAULT_TIMETABLE_DISPLAY_PREFERENCES,
    );
  const preferences = useMemo(
    () => normalizeTimetableDisplayPreferences(storedPreferences),
    [storedPreferences],
  );
  useEffect(() => {
    if (
      !Object.prototype.hasOwnProperty.call(storedPreferences, "fontSize") ||
      !Object.prototype.hasOwnProperty.call(storedPreferences, "fontFamily")
    ) {
      setStoredPreferences(preferences);
    }
  }, [preferences, setStoredPreferences, storedPreferences]);
  const setPreferences = useCallback(
    (
      nextPreferences:
        | TimetableDisplayPreferences
        | ((
            previous: TimetableDisplayPreferences,
          ) => TimetableDisplayPreferences),
    ) => {
      setStoredPreferences((previous) => {
        const normalizedPrevious =
          normalizeTimetableDisplayPreferences(previous);
        const nextValue =
          typeof nextPreferences === "function"
            ? nextPreferences(normalizedPrevious)
            : nextPreferences;
        return normalizeTimetableDisplayPreferences(nextValue);
      });
    },
    [setStoredPreferences],
  );
  const [storedCustomItems, setStoredCustomItems] =
    useSyncedStorage<CustomTimetableStorage>(
      "timetable_custom_items",
      {},
      mergeCustomTimetableStorage,
    );
  const customItems = useMemo(
    () => normalizeCustomTimetableStorage(storedCustomItems),
    [storedCustomItems],
  );
  const setCustomItems = useCallback(
    (
      nextItems:
        | CustomTimetableStorage
        | ((previous: CustomTimetableStorage) => CustomTimetableStorage),
    ) => {
      setStoredCustomItems((previous) =>
        normalizeCustomTimetableStorage(
          typeof nextItems === "function"
            ? nextItems(normalizeCustomTimetableStorage(previous))
            : nextItems,
        ),
      );
    },
    [setStoredCustomItems],
  );
  useEffect(() => {
    if (!valuesEqual(storedCustomItems, customItems)) {
      setStoredCustomItems(customItems);
    }
  }, [customItems, setStoredCustomItems, storedCustomItems]);
  const [favourites, setFavourites] = useSyncedStorage<string[]>(
    "course_favourites",
    [],
    mergeStringArray,
  );
  const [semester, setSemester] = useState<string>(lastSemester.id);
  const setTimetableTheme = useCallback(
    (theme: string) => {
      //if theme updated, remap colors and override all
      const newColors =
        timetableColors[theme] ??
        timetableColors[Object.keys(timetableColors)[0]];
      const newColorMap: { [courseID: string]: string } = {};

      const coursesCopy = { ...courses };

      // Check and confirm if coursesCopy is traversable
      if (Object.keys(coursesCopy).length === 0) return;
      if (Object.keys(coursesCopy).find((sem) => sem.length !== 5)) return;
      if (
        Object.keys(coursesCopy).find((sem) => !Array.isArray(coursesCopy[sem]))
      )
        return;

      Object.keys(coursesCopy).forEach((sem) => {
        (coursesCopy[sem] ?? []).forEach((courseID, i) => {
          newColorMap[courseID] = newColors[i % newColors.length];
        });
      });
      setColorMap(newColorMap);
      setUserDefinedColors({});
      _setTimetableTheme(theme);
    },
    [courses],
  );

  //fix timetableTheme if it is not in timetableColors
  useLayoutEffect(() => {
    if (typeof window == "undefined") return;
    const themes = [
      ...Object.keys(timetableColors),
      ...Object.keys(userDefinedColors),
    ];
    if (!themes.includes(timetableTheme)) {
      setTimetableTheme(themes[0]);
    }
    event({
      action: "selected_theme",
      category: "theme",
      label: !themes.includes(timetableTheme) ? themes[0] : timetableTheme,
    });
  }, [timetableTheme, Object.keys(userDefinedColors).length]);

  const {
    data: user_courses_data = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: ["courses", [...Object.values(courses).flat()].sort()],
    queryFn: async () => {
      if (Object.values(courses).flat().length == 0) return [];
      const res = await client.course.$get({
        query: { courses: [...Object.values(courses).flat()].sort() },
      });

      const data = await res.json();
      if (!data) throw new Error("No data");
      return data as CourseDefinition[];
    },
    placeholderData: (prev) =>
      (prev ?? []).filter((c: CourseDefinition) =>
        Object.values(courses).flat().includes(c.raw_id),
      ),
  });

  const getSemesterCourses = useCallback(
    (semester: keyof CourseLocalStorage | undefined) => {
      if (!semester) return [];
      if (!courses[semester]) return [];
      const semesterFilteredCourses: CourseDefinition[] =
        user_courses_data.filter((course) =>
          courses[semester].includes(course.raw_id),
        );
      //sort according to the order in courses[semester]
      const sortedCourses = courses[semester]
        .map(
          (courseID) =>
            semesterFilteredCourses.find((c) => c.raw_id == courseID)!,
        )
        .filter((c) => c);
      return sortedCourses;
    },
    [courses, user_courses_data],
  );

  //migration from old localStorage key "semester_1121"
  useEffect(() => {
    //check if the old localStorage key "semester_1121" exists
    if (typeof window == "undefined") return;
    const oldCourses = window.localStorage.getItem("semester_1121");
    if (!oldCourses) return;

    //migrate old data to new data format
    const oldCoursesArray = JSON.parse(oldCourses) as RawCourseID[];
    oldCoursesArray.forEach(addCourse);

    setCourses((courses) => {
      const newCourses = { ...courses };
      delete newCourses["11210"];
      return newCourses;
    });

    //remove old data
    window.localStorage.removeItem("semester_1121");
  }, []);

  //handlers for courses
  const addCourse = (courseID: string | string[]) => {
    const courseIDs = Array.isArray(courseID) ? courseID : [courseID];
    setCourses((courses) => {
      //get first 5 characters of courseID
      let oldCourses = { ...courses };
      courseIDs.forEach((courseID) => {
        const semester = getSemesterFromID(courseID);
        if (!semester) throw new Error("Invalid courseID");
        const oldSemesterCourses = oldCourses[semester] ?? [];

        //check if courseID already exists
        if (oldSemesterCourses.includes(courseID)) return;

        setColorMap((colorMap) => {
          return {
            ...colorMap,
            [courseID]:
              currentColors[oldSemesterCourses.length % currentColors.length],
          };
        });
        oldCourses = {
          ...oldCourses,
          [semester]: [...oldSemesterCourses, courseID],
        };
        event({
          action: "add_course",
          category: "timetable",
          label: courseID,
        });
      });
      return oldCourses;
    });
  };

  const deleteCourse = (courseID: string | string[]) => {
    const courseIDs = Array.isArray(courseID) ? courseID : [courseID];
    setCourses((courses) => {
      //get first 5 characters of courseID
      let oldCourses = { ...courses };
      courseIDs.forEach((courseID) => {
        const semester = getSemesterFromID(courseID);
        if (!semester) throw new Error("Invalid courseID");
        const oldSemesterCourses = oldCourses[semester] ?? [];

        //check if courseID already exists
        if (!oldSemesterCourses.includes(courseID)) return;

        //remove color from colorMap
        setColorMap((colorMap) => {
          const newColorMap = { ...colorMap };
          delete newColorMap[courseID];
          return newColorMap;
        });

        oldCourses = {
          ...oldCourses,
          [semester]: oldSemesterCourses.filter((c) => c != courseID),
        };
        event({
          action: "delete_course",
          category: "timetable",
          label: courseID,
        });
      });

      return oldCourses;
    });
  };

  const setColor = (courseID: string, color: string) => {
    setColorMap((colorMap) => {
      const newColorMap = {
        ...colorMap,
        [courseID]: color,
      };
      return newColorMap;
    });
  };

  const isCourseSelected = useCallback(
    (courseID: string) => {
      const semester = getSemesterFromID(courseID);
      if (!semester) throw new Error("Invalid courseID");
      const oldSemesterCourses = courses[semester] ?? [];

      //check if courseID already exists
      return oldSemesterCourses.includes(courseID);
    },
    [courses],
  );

  const semesterCourses = courses[semester] ?? [];
  const semesterCustomItems = Array.isArray(customItems[semester])
    ? customItems[semester]
    : [];

  const getSemesterCustomItems = useCallback(
    (semesterId: string | undefined) =>
      semesterId && Array.isArray(customItems[semesterId])
        ? customItems[semesterId]
        : [],
    [customItems],
  );

  const addCustomItem = useCallback(
    (item: CustomTimetableItem) => {
      setCustomItems((items) => ({
        ...items,
        [semester]: [
          ...(Array.isArray(items[semester]) ? items[semester] : []),
          item,
        ],
      }));
      event({
        action: "add_custom_timetable_item",
        category: "timetable",
        label: item.id,
      });
    },
    [semester, setCustomItems],
  );

  const updateCustomItem = useCallback(
    (item: CustomTimetableItem) => {
      setCustomItems((items) => ({
        ...items,
        [semester]: (Array.isArray(items[semester]) ? items[semester] : []).map(
          (current) => (current.id === item.id ? item : current),
        ),
      }));
    },
    [semester, setCustomItems],
  );

  const deleteCustomItem = useCallback(
    (itemId: string) => {
      setCustomItems((items) => ({
        ...items,
        [semester]: (Array.isArray(items[semester])
          ? items[semester]
          : []
        ).filter((item) => item.id !== itemId),
      }));
      event({
        action: "delete_custom_timetable_item",
        category: "timetable",
        label: itemId,
      });
    },
    [semester, setCustomItems],
  );

  const setCustomItemColor = useCallback(
    (itemId: string, color: string) => {
      setCustomItems((items) => ({
        ...items,
        [semester]: (Array.isArray(items[semester]) ? items[semester] : []).map(
          (item) => (item.id === itemId ? { ...item, color } : item),
        ),
      }));
    },
    [semester, setCustomItems],
  );

  const clearCourses = () => {
    setCourses({});
  };

  const currentColors = useMemo(() => {
    //merge default colors with user defined colors
    const colors = { ...timetableColors, ...userDefinedColors };
    //check if timetableTheme exists in colors
    if (!Object.keys(colors).includes(timetableTheme)) {
      return colors[Object.keys(colors)[0]];
    }
    return colors[timetableTheme];
  }, [timetableTheme, userDefinedColors]);

  const isCoursesEmpty = useMemo(() => {
    return Object.keys(courses).length == 0;
  }, [courses]);

  return {
    getSemesterCourses,
    colorMap,
    semester,
    timetableTheme,
    currentColors,
    userDefinedColors,
    setSemester,
    semesterCourses,
    setCourses,
    setColorMap,
    addCourse,
    deleteCourse,
    clearCourses,
    isCourseSelected,
    setTimetableTheme,
    setUserDefinedColors,
    setColor,
    isLoading,
    isCoursesEmpty,
    error,
    courses,
    customItems,
    semesterCustomItems,
    getSemesterCustomItems,
    setCustomItems,
    hoverCourse,
    setHoverCourse,
    preferences,
    setPreferences,
    addCustomItem,
    updateCustomItem,
    deleteCustomItem,
    setCustomItemColor,
    favourites,
    setFavourites,
  };
};

const useUserTimetable = () => useContext(userTimetableContext);

export const UserTimetableProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const value = useUserTimetableProvider();
  return (
    <userTimetableContext.Provider value={value}>
      {children}
    </userTimetableContext.Provider>
  );
};

export default useUserTimetable;
