import { describe, expect, test } from "bun:test";
import { reconcileSearchState } from "./reconcile-search-state";

describe("reconcileSearchState", () => {
  test.each([
    ["branch=main", "branch=ctm", "manual", "ctm", "ctm"],
    ["branch=main", "branch=main", "manual", "ctm", "manual"],
  ])(
    "uses URL state only when the deep-link search changes",
    (previousKey, nextKey, currentState, nextState, expected) => {
      expect(
        reconcileSearchState(currentState, nextState, previousKey, nextKey),
      ).toBe(expected);
    },
  );
});
