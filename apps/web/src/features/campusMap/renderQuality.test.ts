import { describe, expect, test } from "bun:test";
import { getCampusRenderQuality } from "./renderQuality";
import { layoutCampusLabels, type LabelCandidate } from "./labelLayout";

describe("mobile rendering budget", () => {
  test("caps a touch device even without optional memory hints", () => {
    expect(getCampusRenderQuality({ coarsePointer: true }).maxDpr).toBe(1.25);
    expect(getCampusRenderQuality({ coarsePointer: true }).maxLabels).toBe(24);
  });
  test("reduces resolution on limited devices including desktop touchscreens", () => {
    expect(
      getCampusRenderQuality({ coarsePointer: false, deviceMemory: 4 }).maxDpr,
    ).toBe(1);
    expect(
      getCampusRenderQuality({ coarsePointer: true, hardwareConcurrency: 4 })
        .maxDpr,
    ).toBe(1);
  });
  test("keeps a bounded desktop resolution", () => {
    expect(
      getCampusRenderQuality({ coarsePointer: false, hardwareConcurrency: 12 })
        .maxDpr,
    ).toBe(1.5);
  });
});

describe("map label layout", () => {
  const label: LabelCandidate = {
    index: 0,
    x: 100,
    y: 100,
    width: 100,
    priority: 1,
    distance: 10,
  };
  const viewport = { width: 390, height: 700 };
  test("keeps the selected label ahead of overlapping nearer labels", () => {
    const selected = { ...label, index: 1, priority: 10, distance: 100 };
    expect(layoutCampusLabels([label, selected], viewport, 24)).toEqual([
      selected,
    ]);
  });
  test("culls labels behind the controls, attribution and offscreen", () => {
    expect(
      layoutCampusLabels(
        [
          { ...label, y: 10 },
          { ...label, y: 680 },
          { ...label, x: 500 },
          label,
        ],
        viewport,
        24,
      ),
    ).toEqual([label]);
  });
  test("caps visible labels while keeping stable layout order", () => {
    const candidates = [0, 1, 2, 3].map((index) => ({
      ...label,
      index,
      y: 100 + index * 50,
    }));
    expect(
      layoutCampusLabels(candidates, viewport, 2).map((l) => l.index),
    ).toEqual([0, 1]);
  });
});
