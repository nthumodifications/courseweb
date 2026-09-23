import type {
  LaundryMachine,
  LaundryMachineType,
} from "@/const/laundry-machines";
import { remainingSeconds, type LaundryMachineStatus } from "./laundry-status";

export type LaundrySummary = {
  total: number;
  available: number;
  paying: number;
  running: number;
  paused: number;
  pickup: number;
  awaitingStart: number;
  unavailable: number;
};

export type FastestReady =
  | { state: "available" }
  | { state: "running"; remainingSeconds: number }
  | null;

export type LaundryAreaSummary = {
  washer: LaundrySummary;
  dryer: LaundrySummary;
  fastestWasher: FastestReady;
  fastestDryer: FastestReady;
};

const MACHINE_TYPE_ORDER: Record<LaundryMachineType, number> = {
  washer: 0,
  dryer: 1,
};

export function selectAreaMachines(
  machines: readonly LaundryMachine[],
  area: string,
  type?: LaundryMachineType,
): LaundryMachine[] {
  return machines
    .filter(
      (machine) => machine.area === area && (!type || machine.type === type),
    )
    .sort(
      (a, b) =>
        MACHINE_TYPE_ORDER[a.type] - MACHINE_TYPE_ORDER[b.type] ||
        a.number - b.number,
    );
}

function emptySummary(): LaundrySummary {
  return {
    total: 0,
    available: 0,
    paying: 0,
    running: 0,
    paused: 0,
    pickup: 0,
    awaitingStart: 0,
    unavailable: 0,
  };
}

function isUnavailable(state: LaundryMachineStatus["state"]): boolean {
  return (
    state === "offline" ||
    state === "error" ||
    state === "no-data" ||
    state === "unknown"
  );
}

export function summarizeMachines(
  machines: readonly LaundryMachine[],
  statuses: Readonly<Record<string, LaundryMachineStatus | undefined>>,
  type: LaundryMachineType,
  nowMs: number,
): LaundrySummary {
  const summary = emptySummary();
  for (const machine of machines) {
    if (machine.type !== type) continue;
    summary.total += 1;
    const state = statuses[machine.mac]?.state ?? "no-data";
    if (state === "available") summary.available += 1;
    else if (state === "paying") summary.paying += 1;
    else if (state === "running") summary.running += 1;
    else if (state === "paused") summary.paused += 1;
    else if (state === "pickup") summary.pickup += 1;
    else if (state === "awaiting-start") summary.awaitingStart += 1;
    else if (isUnavailable(state)) summary.unavailable += 1;
  }
  return summary;
}

export function fastestReady(
  machines: readonly LaundryMachine[],
  statuses: Readonly<Record<string, LaundryMachineStatus | undefined>>,
  type: LaundryMachineType,
  nowMs: number,
): FastestReady {
  let fastest: number | null = null;
  for (const machine of machines) {
    if (machine.type !== type) continue;
    const status = statuses[machine.mac];
    if (status?.state === "available") return { state: "available" };
    if (status?.state === "running" && status.main === 8) {
      const remaining = remainingSeconds(status, nowMs);
      if (remaining !== null && (fastest === null || remaining < fastest))
        fastest = remaining;
    }
  }
  return fastest === null
    ? null
    : { state: "running", remainingSeconds: fastest };
}

export function selectAreaSummary(
  machines: readonly LaundryMachine[],
  statuses: Readonly<Record<string, LaundryMachineStatus | undefined>>,
  area: string,
  nowMs: number,
): LaundryAreaSummary {
  const areaMachines = machines.filter((machine) => machine.area === area);
  return {
    washer: summarizeMachines(areaMachines, statuses, "washer", nowMs),
    dryer: summarizeMachines(areaMachines, statuses, "dryer", nowMs),
    fastestWasher: fastestReady(areaMachines, statuses, "washer", nowMs),
    fastestDryer: fastestReady(areaMachines, statuses, "dryer", nowMs),
  };
}
