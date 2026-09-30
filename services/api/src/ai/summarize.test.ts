import { describe, expect, it } from "bun:test";
import { normalizeSyllabusSummary } from "./summarize";

describe("normalizeSyllabusSummary", () => {
  it("limits bullets and clamps difficulty to an integer from one to five", () => {
    const result = normalizeSyllabusSummary(
      {
        bullets: ["a", "b", "c", "d"],
        workload: "Light",
        audience: "Students",
        difficultyRating: 8.9,
      },
      true,
    );
    expect(result.bullets).toEqual(["a", "b", "c"]);
    expect(result.difficultyRating).toBe(5);
    expect(result.workload).toBe("Light");
  });

  it("accepts English workload values for a Chinese response", () => {
    const result = normalizeSyllabusSummary(
      {
        bullets: [],
        workload: "Heavy",
        audience: "學生",
        difficultyRating: 0,
      },
      false,
    );
    expect(result.workload).toBe("繁重");
    expect(result.difficultyRating).toBe(1);
  });
});
