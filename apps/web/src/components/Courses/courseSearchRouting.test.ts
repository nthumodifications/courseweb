import { afterEach, describe, expect, jest, test } from "bun:test";
import { installTestDom } from "@/testDom";
import { createCourseSearchRouter } from "./courseSearchRouting";

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

  test.each(["en", "zh"])(
    "reads the background and suppresses delayed writes for an open %s dialog",
    (language) => {
      active = installTestDom(`/${language}/courses/11420PE%20%20206097`);
      window.history.replaceState(
        {
          usr: {
            dialog: {
              background: {
                pathname: `/${language}/courses`,
                search: "?nthu_courses%5Bmenu%5D%5Bsemester%5D=11420",
                hash: "",
              },
            },
          },
        },
        "",
        `/${language}/courses/11420PE%20%20206097`,
      );
      jest.useFakeTimers();

      router = createCourseSearchRouter(active.dom.window);
      const historyLength = window.history.length;
      router.write({
        nthu_courses: { menu: { semester: "11420" } },
      });

      expect(router.read()).toMatchObject({
        nthu_courses: {
          menu: { semester: "11420" },
        },
      });
      expect(new URL(router.createURL({ query: "background" })).pathname).toBe(
        `/${language}/courses`,
      );

      jest.runAllTimers();
      expect(window.location.pathname).toBe(
        `/${language}/courses/11420PE%20%20206097`,
      );
      expect(window.history).toHaveLength(historyLength);

      window.history.replaceState(
        null,
        "",
        `/${language}/courses?nthu_courses%5Bmenu%5D%5Bsemester%5D=11420`,
      );
      router.write({ query: "discrete" });
      jest.runAllTimers();
      expect(window.location.pathname).toBe(`/${language}/courses`);
      expect(window.location.search).toContain("discrete");
      expect(window.history).toHaveLength(historyLength + 1);
    },
  );
});
