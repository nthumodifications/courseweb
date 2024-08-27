"use client";
import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useMemo,
  useLayoutEffect,
} from "react";
import supabase, { CourseDefinition } from "@/config/supabase";
import { RawCourseID } from "@/types/courses";
import { lastSemester } from "@/const/semester";
import { getSemesterFromID } from "@/helpers/courses";
import { event } from "@/lib/gtag";
import { timetableColors } from "@/const/timetableColors";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/config/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import useSyncedStorage from "../useSyncedStorage";

export interface TimetableDisplayPreferences {
  language: "app" | "zh" | "en";
  align: "left" | "center" | "right";
  display: {
    title: boolean;
    code: boolean;
    time: boolean;
    venue: boolean;
  };
}

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
  colorMap: {},
  setCourses: () => {},
  clearCourses: () => {},
  deleteCourse: () => {},
  setColorMap: () => {},
  addCourse: () => {},
  setTimetableTheme: () => {},
  setUserDefinedColors: () => {},
  setColor: () => {},
  isCourseSelected: () => false,
  isLoading: true,
  error: null,
  semester: lastSemester.id,
  isCoursesEmpty: true,
  setSemester: () => {},
  preferences: {
    language: "app",
    align: "center",
    display: {
      title: true,
      code: false,
      time: true,
      venue: true,
    },
  },
  setPreferences: () => {},
});

const useUserTimetableProvider = (loadCourse = true) => {
  const [courses, setCourses] = useSyncedStorage<CourseLocalStorage>(
    "courses",
    {},
  );
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
  const [preferences, setPreferences] =
    useSyncedStorage<TimetableDisplayPreferences>(
      "timetable_display_preferences",
      {
        language: "app",
        align: "center",
        display: {
          title: true,
          code: false,
          time: true,
          venue: true,
        },
      },
    );
  const [semester, setSemester] = useState<string>(lastSemester.id);
  const [user] = useAuthState(auth);
  const setTimetableTheme = useCallback(
    (theme: string) => {
      //if theme updated, remap colors and override all
      const newColors = timetableColors[theme];
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
      console.log("colorMap updated");
      _setTimetableTheme(theme);
    },
    [courses, user],
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
    console.log("timetable theme", timetableTheme);
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
      const { data = [], error } = await supabase
        .from("courses")
        .select("*")
        .in("raw_id", [...Object.values(courses).flat()].sort());
      if (error) throw error;
      if (!data) throw new Error("No data");
      return data as CourseDefinition[];
    },
    placeholderData: (prev) =>
      prev?.filter((c: CourseDefinition) =>
        Object.values(courses).flat().includes(c.raw_id),
      ) ?? [],
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
    preferences,
    setPreferences,
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
