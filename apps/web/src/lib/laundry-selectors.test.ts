import { describe, expect, test } from "bun:test";
import type { LaundryMachine } from "@/const/laundry-machines";
import { selectAreaMachines, selectAreaSummary } from "./laundry-selectors";
import {
  decodeLaundryStatus,
  type LaundryMachineStatus,
} from "./laundry-status";

const machine = (
  type: LaundryMachine["type"],
  number: number,
): LaundryMachine => ({
  mac: `${type}-${number}`,
  dorm: "義齋",
  area: "義齋",
  slug: "yi",
  gender: "mixed",
  type,
  number,
});
const machines: LaundryMachine[] = [
  ...[1, 2, 3].map((number) => machine("washer", number)),
  machine("dryer", 1),
];
const now = 1_790_184_228_160;
const status = (
  mac: string,
  value: number,
  extra: Record<string, number> = {},
) =>
  decodeLaundryStatus({ mac, status: value, ts: now / 1000, ...extra }, now)!;

describe("laundry selectors", () => {
  test("groups washers before dryers and sorts each group by machine number", () => {
    const shuffled = [machines[3], machines[2], machines[0], machines[1]];

    expect(
      selectAreaMachines(shuffled, "義齋").map(
        ({ type, number }) => `${type}-${number}`,
      ),
    ).toEqual(["washer-1", "washer-2", "washer-3", "dryer-1"]);
  });

  test("summarizes each machine type and picks the fastest ready machine", () => {
    const statuses: Record<string, LaundryMachineStatus> = {
      "washer-1": status("washer-1", 2048, { timeLeft: 90 }),
      "washer-3": status("washer-3", 512),
      "dryer-1": status("dryer-1", 512),
    };
    const summary = selectAreaSummary(machines, statuses, "義齋", now);
    expect(summary.washer).toMatchObject({
      total: 3,
      running: 1,
      paying: 1,
      unavailable: 1,
    });
    expect(summary.dryer).toMatchObject({
      total: 1,
      paying: 1,
      unavailable: 0,
    });
    expect(summary.fastestWasher).toEqual({
      state: "running",
      remainingSeconds: 90,
    });
    expect(summary.fastestDryer).toBeNull();
  });

  test("prefers any available machine over a running countdown", () => {
    const statuses = {
      "washer-1": status("washer-1", 2048, { timeLeft: 10 }),
      "washer-2": status("washer-2", 256),
    };
    expect(
      selectAreaSummary(machines, statuses, "義齋", now).fastestWasher,
    ).toEqual({ state: "available" });
  });

  test("groups offline, error, unknown, and missing snapshots as unavailable", () => {
    const statuses = {
      "washer-1": status("washer-1", -1),
      "washer-2": status("washer-2", 32768),
      "washer-3": status("washer-3", 768),
    };
    const summary = selectAreaSummary(machines, statuses, "義齋", now);
    expect(summary.washer.unavailable).toBe(3);
    expect(summary.dryer.unavailable).toBe(1);
  });

  test("does not use door transitions or paused machines as fastest-ready", () => {
    const statuses = {
      "washer-1": status("washer-1", 2304, { timeLeft: 10 }),
      "washer-2": status("washer-2", 2816, { timeLeft: 20 }),
    };
    expect(
      selectAreaSummary(machines, statuses, "義齋", now).fastestWasher,
    ).toBeNull();
  });
});
