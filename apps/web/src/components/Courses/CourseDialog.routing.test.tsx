import { afterEach, describe, expect, jest, test } from "bun:test";
import { installTestDom } from "@/testDom";
import {
  createCourseDialogHistoryState,
  getCourseDialogCloseNavigation,
  getPreviousCourseDialogDelta,
  parseCourseDialogPath,
} from "./courseDialogRouting";
import { createCourseSearchRouter } from "./courseSearchRouting";

describe("course dialog routing seams", () => {
  test("creates a serialisable dialog entry that keeps the opener query", () => {
    const state = createCourseDialogHistoryState(
      {
        pathname: "/en/courses",
        search: "?department=CS",
        hash: "#results",
        key: "background",
      },
      4,
    );

    expect(JSON.parse(JSON.stringify(state))).toEqual({
      dialog: {
        background: {
          pathname: "/en/courses",
          search: "?department=CS",
          hash: "#results",
          key: "background",
        },
        originIdx: 4,
      },
    });
  });

  test("parses course, instructor, and module dialog views with query", () => {
    expect(
      parseCourseDialogPath("/zh/courses/11420PE%20%20206097?source=search"),
    ).toMatchObject({
      type: "course",
      id: "11420PE  206097",
      search: "?source=search",
    });
    expect(
      parseCourseDialogPath(
        "/zh/courses/instructor/%E7%8E%8B%E5%AC%BF%E5%A9%B7",
      ),
    ).toMatchObject({ type: "instructor", name: "王嬿婷" });
    expect(
      parseCourseDialogPath("/en/courses/module/CS%201010?title=Discrete"),
    ).toMatchObject({
      type: "module",
      key: "CS 1010",
      search: "?title=Discrete",
    });
    expect(parseCourseDialogPath("/en/courses")).toBeNull();
  });

  test("steps back one dialog view and closes to the original entry", () => {
    expect(getPreviousCourseDialogDelta({ currentIdx: 6, originIdx: 4 })).toBe(
      -1,
    );
    expect(
      getPreviousCourseDialogDelta({ currentIdx: 5, originIdx: 4 }),
    ).toBeUndefined();
    expect(
      getCourseDialogCloseNavigation({
        background: {
          pathname: "/en/courses",
          search: "?department=CS",
          hash: "",
          key: "background",
        },
        currentIdx: 6,
        originIdx: 4,
      }),
    ).toEqual({ type: "delta", delta: -2 });
    expect(
      getCourseDialogCloseNavigation({
        background: {
          pathname: "/en/courses",
          search: "?department=CS",
          hash: "",
          key: "background",
        },
        currentIdx: undefined,
        originIdx: undefined,
      }),
    ).toEqual({ type: "replace", path: "/en/courses?department=CS" });
  });
});

describe("course search history routing", () => {
  let active: ReturnType<typeof installTestDom> | undefined;
  let router: ReturnType<typeof createCourseSearchRouter> | undefined;

  afterEach(() => {
    jest.useRealTimers();
    router?.dispose();
    router = undefined;
    active?.restore();
    active = undefined;
  });

  test("cannot replace an open dialog entry, then writes after it closes", () => {
    active = installTestDom("/en/courses/11420PE%20%20206097");
    window.history.replaceState(
      {
        usr: {
          dialog: {
            background: {
              pathname: "/en/courses",
              search: "?nthu_courses%5Bmenu%5D%5Bsemester%5D=11420",
              hash: "",
            },
          },
        },
      },
      "",
      "/en/courses/11420PE%20%20206097",
    );
    jest.useFakeTimers();

    router = createCourseSearchRouter(active.dom.window);
    const dialogHistoryLength = window.history.length;
    router.write({ nthu_courses: { menu: { semester: "11420" } } });
    jest.runAllTimers();

    expect(window.location.pathname).toBe("/en/courses/11420PE%20%20206097");
    expect(window.history).toHaveLength(dialogHistoryLength);

    window.history.replaceState(
      null,
      "",
      "/en/courses?nthu_courses%5Bmenu%5D%5Bsemester%5D=11420",
    );
    router.write({ query: "discrete" });
    jest.runAllTimers();

    expect(window.location.pathname).toBe("/en/courses");
    expect(window.location.search).toContain("discrete");
    expect(window.history).toHaveLength(dialogHistoryLength + 1);
  });
});
