import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { act, useState } from "react";
import { JSDOM } from "jsdom";
import { expect, test } from "bun:test";
import { captureGlobalState } from "@/test-utils/global-state";
import { FavouriteCourseActions } from "./FavouriteCourseActions";

test("labels the add-to-timetable button with its actual action", () => {
  const markup = renderToStaticMarkup(
    <FavouriteCourseActions
      courseId="course-1"
      isSelected={false}
      labels={{
        addToTimetable: "Add course to timetable",
        remove: "Remove",
        unfavorite: "Remove from favorites",
      }}
      onAdd={() => undefined}
      onRemove={() => undefined}
      onUnfavorite={() => undefined}
    />,
  );
  expect(markup).toMatch(
    /<button[^>]*aria-label="Add course to timetable"[^>]*>/,
  );
});

test("keeps add, remove and unfavourite actions working", async () => {
  const restoreGlobals = captureGlobalState([
    "window",
    "document",
    "navigator",
    "IS_REACT_ACT_ENVIRONMENT",
  ]);
  const dom = new JSDOM("<!doctype html><div id='root'></div>");
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const actions: string[] = [];
  const root = createRoot(dom.window.document.getElementById("root")!);

  const Harness = () => {
    const [selected, setSelected] = useState(false);
    return (
      <FavouriteCourseActions
        courseId="course-1"
        isSelected={selected}
        labels={{
          addToTimetable: "Add",
          remove: "Remove",
          unfavorite: "Unfavourite",
        }}
        onAdd={(id) => {
          actions.push(`add:${id}`);
          setSelected(true);
        }}
        onRemove={(id) => {
          actions.push(`remove:${id}`);
          setSelected(false);
        }}
        onUnfavorite={() => actions.push("unfavourite")}
      />
    );
  };

  try {
    await act(async () => root.render(<Harness />));
    for (const label of ["Add", "Remove", "Unfavourite"]) {
      const button = dom.window.document.querySelector<HTMLButtonElement>(
        `button[aria-label="${label}"]`,
      );
      expect(button).not.toBeNull();
      await act(async () => button!.click());
    }
    expect(actions).toEqual(["add:course-1", "remove:course-1", "unfavourite"]);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    restoreGlobals();
  }
});
