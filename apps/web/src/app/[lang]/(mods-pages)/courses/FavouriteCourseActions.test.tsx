import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";
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
