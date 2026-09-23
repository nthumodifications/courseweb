import { describe, expect, test } from "bun:test";
import {
  decodeLaundryStatus,
  remainingSeconds,
  shouldAcceptLaundryStatus,
} from "./laundry-status";

const now = 1_790_184_228_160;

function decode(mac: string, raw: number, extra: Record<string, number> = {}) {
  return decodeLaundryStatus(
    { mac, status: raw, ts: now / 1000, ...extra },
    now,
  )!;
}

describe("laundry status decoding", () => {
  test.each([
    [0, "available"],
    [256, "available"],
    [512, "paying"],
    [1024, "awaiting-start"],
    [1280, "awaiting-start"],
    [2048, "running"],
    [2304, "running"],
    [2560, "running"],
    [2816, "paused"],
    [3072, "pickup"],
    [32768, "error"],
    [-1, "offline"],
    [768, "unknown"],
  ])("maps raw status %s to %s", (raw, state) => {
    expect(decode("machine", raw).state).toBe(state);
  });

  test("preserves raw value, decoded bytes, and composite flags", () => {
    const status = decode("machine", 2178);
    expect(status).toMatchObject({
      raw: 2178,
      status: 2178,
      main: 8,
      sub: 0x82,
      state: "running",
    });
    expect(status.flags).toEqual({
      additionalPayment: false,
      doorOpen: true,
      unused04: false,
      manual: false,
      luckyThresholdMet: false,
      lockCycleSelection: false,
      unused40: false,
      unavailable: true,
    });
    expect(decode("machine", 2176)).toMatchObject({
      main: 8,
      sub: 0x80,
      state: "running",
    });
    expect(decode("machine", 2176).flags.unavailable).toBe(true);
    expect(decode("machine", 3200)).toMatchObject({
      main: 12,
      sub: 0x80,
      state: "pickup",
    });
  });

  test("uses watchdog timeout as offline without treating an old retained idle message as stale", () => {
    expect(decode("timeout", -1).main).toBe(-1);
    expect(decode("timeout", -1).state).toBe("offline");
    expect(
      decodeLaundryStatus(
        {
          mac: "old-idle",
          status: 256,
          ts: (now - 25 * 60 * 60 * 1000) / 1000,
        },
        now,
      )?.state,
    ).toBe("available");
  });

  test("counts only main state 8 down from its message timestamp", () => {
    const status = decodeLaundryStatus(
      {
        mac: "running",
        status: 2048,
        ts: (now - 30_000) / 1000,
        timeLeft: 90,
        totalTime: 120,
      },
      now,
    )!;
    expect(remainingSeconds(status, now)).toBe(60);
    expect(remainingSeconds(status, now + 31_000)).toBe(29);
    expect(remainingSeconds(status, now + 61_000)).toBe(0);
  });

  test("freezes timeLeft for door transitions and paused states", () => {
    expect(
      remainingSeconds(decode("locking", 2304, { timeLeft: 90 }), now + 30_000),
    ).toBe(90);
    expect(
      remainingSeconds(
        decode("unlocking", 2560, { timeLeft: 90 }),
        now + 30_000,
      ),
    ).toBe(90);
    expect(
      remainingSeconds(decode("paused", 2816, { timeLeft: 90 }), now + 30_000),
    ).toBe(90);
  });

  test("uses receive time for implausibly future timestamps and floors the result", () => {
    const status = decodeLaundryStatus(
      {
        mac: "future",
        status: 2048,
        ts: (now + 11 * 60 * 1000) / 1000,
        timeLeft: 90.9,
      },
      now,
    )!;
    expect(remainingSeconds(status, now + 30_000)).toBe(60);
  });

  test("rejects an older packet but accepts an equal timestamp", () => {
    const previous = decodeLaundryStatus(
      { mac: "machine", status: 2048, ts: 100, timeLeft: 90 },
      now,
    )!;
    const older = decodeLaundryStatus(
      { mac: "machine", status: 3072, ts: 99, timeLeft: 0 },
      now,
    )!;
    const equal = decodeLaundryStatus(
      { mac: "machine", status: 3072, ts: 100, timeLeft: 0 },
      now,
    )!;
    expect(shouldAcceptLaundryStatus(older, previous)).toBe(false);
    expect(shouldAcceptLaundryStatus(equal, previous)).toBe(true);
  });
});
