import { describe, expect, test } from "bun:test";
import type { CampusLinearFeature } from "@courseweb/shared";
import { createRibbonGeometry } from "./sceneGeometry";

const origin = { lat: 24.79, lon: 120.99 };

describe("campus line geometry", () => {
  test("joins every point in one road into a continuous ribbon", () => {
    const road: CampusLinearFeature = {
      id: "bent-road",
      kind: "road",
      width: 6,
      points: [
        [120.99, 24.79],
        [120.9901, 24.79],
        [120.9901, 24.7901],
      ],
    };

    const geometry = createRibbonGeometry([road], origin);

    expect(geometry.getAttribute("position").count).toBe(6);
    expect(geometry.getIndex()?.count).toBe(12);
    expect(geometry.getAttribute("normal").getY(0)).toBeGreaterThan(0);
    geometry.dispose();
  });

  test("keeps separate roads disconnected while batching their draw call", () => {
    const roads: CampusLinearFeature[] = [0, 1].map((index) => ({
      id: `road-${index}`,
      kind: "road",
      width: 4,
      points: [
        [120.99 + index * 0.0001, 24.79],
        [120.99 + index * 0.0001, 24.7901],
      ],
    }));

    const geometry = createRibbonGeometry(roads, origin);

    expect(geometry.getAttribute("position").count).toBe(8);
    expect(geometry.getIndex()?.count).toBe(12);
    geometry.dispose();
  });
});
