import type { LaundryMachineType } from "@/const/laundry-machines";

export type LaundryState =
  | "available"
  | "paying"
  | "awaiting-start"
  | "running"
  | "paused"
  | "pickup"
  | "error"
  | "offline"
  | "no-data"
  | "unknown";

export type LaundryStatusFlags = {
  additionalPayment: boolean;
  doorOpen: boolean;
  unused04: boolean;
  manual: boolean;
  luckyThresholdMet: boolean;
  lockCycleSelection: boolean;
  unused40: boolean;
  unavailable: boolean;
};

export type LaundryMachineStatus = {
  mac: string;
  state: LaundryState;
  raw: number;
  status: number;
  main: number;
  sub: number;
  flags: LaundryStatusFlags;
  ts: number;
  receivedAtMs: number;
  timeLeft: number | null;
  totalTime: number | null;
  type?: LaundryMachineType;
};

export const FUTURE_TIMESTAMP_TOLERANCE_MS = 10 * 60 * 1000;

type WipePayStatusPayload = {
  type?: unknown;
  mac?: unknown;
  status?: unknown;
  ts?: unknown;
  timeLeft?: unknown;
  totalTime?: unknown;
};

function decodeFlags(sub: number): LaundryStatusFlags {
  return {
    additionalPayment: (sub & 0x01) !== 0,
    doorOpen: (sub & 0x02) !== 0,
    unused04: (sub & 0x04) !== 0,
    manual: (sub & 0x08) !== 0,
    luckyThresholdMet: (sub & 0x10) !== 0,
    lockCycleSelection: (sub & 0x20) !== 0,
    unused40: (sub & 0x40) !== 0,
    unavailable: (sub & 0x80) !== 0,
  };
}

function stateForMain(main: number): LaundryState {
  switch (main) {
    case 0:
    case 1:
      return "available";
    case 2:
      return "paying";
    case 4:
    case 5:
      return "awaiting-start";
    case 8:
    case 9:
    case 10:
      return "running";
    case 11:
      return "paused";
    case 12:
      return "pickup";
    case 128:
      return "error";
    default:
      return "unknown";
  }
}

function mainStateFromRaw(raw: number, isInteger: boolean): number {
  if (raw === -1) return -1;
  if (!isInteger) return 0;
  return (raw >> 8) & 0xff;
}

function stateFromRaw(
  raw: number,
  isInteger: boolean,
  main: number,
): LaundryState {
  if (raw === -1) return "offline";
  if (!isInteger) return "unknown";
  return stateForMain(main);
}

export function decodeLaundryStatus(
  payload: unknown,
  receivedAtMs: number,
  machineType?: LaundryMachineType,
): LaundryMachineStatus | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as WipePayStatusPayload;
  if (
    typeof value.mac !== "string" ||
    typeof value.status !== "number" ||
    !Number.isFinite(value.status)
  )
    return null;
  const ts =
    typeof value.ts === "number" && Number.isFinite(value.ts)
      ? value.ts
      : receivedAtMs / 1000;
  const raw = value.status;
  const isInteger = Number.isInteger(raw);
  const main = mainStateFromRaw(raw, isInteger);
  const sub = raw === -1 || !isInteger ? 0 : raw & 0xff;
  const state = stateFromRaw(raw, isInteger, main);
  return {
    mac: value.mac,
    state,
    raw,
    status: raw,
    main,
    sub,
    flags: decodeFlags(sub),
    ts,
    receivedAtMs,
    timeLeft:
      typeof value.timeLeft === "number" && Number.isFinite(value.timeLeft)
        ? value.timeLeft
        : null,
    totalTime:
      typeof value.totalTime === "number" && Number.isFinite(value.totalTime)
        ? value.totalTime
        : null,
    type: machineType,
  };
}

export function shouldAcceptLaundryStatus(
  next: LaundryMachineStatus,
  previous: LaundryMachineStatus | undefined,
): boolean {
  return previous === undefined || next.ts >= previous.ts;
}

export function remainingSeconds(
  status: LaundryMachineStatus,
  nowMs: number,
): number | null {
  if (status.timeLeft === null || ![8, 9, 10, 11].includes(status.main))
    return null;
  if (status.main !== 8) return Math.max(0, Math.floor(status.timeLeft));
  const timestampMs = status.ts * 1000;
  const baseMs =
    timestampMs - nowMs > FUTURE_TIMESTAMP_TOLERANCE_MS
      ? status.receivedAtMs
      : timestampMs;
  return Math.max(0, Math.floor(status.timeLeft - (nowMs - baseMs) / 1000));
}
