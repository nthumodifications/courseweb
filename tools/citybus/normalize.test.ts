import { describe, expect, test } from "bun:test";
import {
  isHsinchuCityStop,
  normalizeFrequency,
  normalizeScheduleRecords,
  normalizeTimetable,
  routeHasHsinchuCityStop,
} from "./normalize";

const stops = [
  {
    StopUID: "origin",
    StopName: { Zh_tw: "起點", En: "Origin" },
    StopSequence: 1,
  },
  {
    StopUID: "campus",
    StopName: { Zh_tw: "清華大學", En: "NTHU" },
    StopSequence: 2,
  },
];

describe("city bus schedule normalization", () => {
  test("filters intercity routes by Hsinchu stop coordinates, not stop names", () => {
    expect(
      isHsinchuCityStop({
        StopName: { Zh_tw: "清華山莊" },
        StopPosition: { PositionLat: 23.47667, PositionLon: 120.46526 },
      }),
    ).toBe(false);
    expect(
      isHsinchuCityStop({
        StopName: { Zh_tw: "新竹站" },
        StopPosition: { PositionLat: 24.8024, PositionLon: 120.9724 },
      }),
    ).toBe(true);
    expect(
      routeHasHsinchuCityStop({
        Stops: [
          {
            StopPosition: { PositionLat: 23.47667, PositionLon: 120.46526 },
          },
          {
            StopPosition: { PositionLat: 24.8024, PositionLon: 120.9724 },
          },
        ],
      }),
    ).toBe(true);
  });

  test("keeps all service days and stop times from a TDX timetable", () => {
    const schedule = normalizeTimetable(
      {
        ServiceDay: {
          Sunday: 1,
          Monday: 1,
          Tuesday: 1,
          Wednesday: 1,
          Thursday: 1,
          Friday: 1,
          Saturday: 1,
        },
        StopTimes: [
          { StopUID: "origin", StopSequence: 1, DepartureTime: "23:50" },
          { StopUID: "campus", StopSequence: 2, DepartureTime: "24:10" },
        ],
      },
      stops,
    );

    expect(schedule).toMatchObject({
      kind: "timetable",
      timeBasis: "stop",
      originStopId: "origin",
      originStopNameZh: "起點",
      serviceDays: {
        Sunday: true,
        Monday: true,
        Saturday: true,
      },
      timesByStop: { origin: ["23:50"], campus: ["24:10"] },
    });
  });

  test("normalizes a TDX frequency record without inventing departures", () => {
    const [schedule] = normalizeScheduleRecords(
      [
        {
          Frequencys: [
            {
              StartTime: "06:00",
              EndTime: "22:00",
              HeadwaySecs: 900,
              ServiceDay: { Monday: 1, Friday: 1 },
            },
          ],
        },
      ],
      stops,
    );

    expect(schedule).toMatchObject({
      kind: "frequency",
      timeBasis: "origin",
      frequency: { startTime: "06:00", endTime: "22:00", headwayMinutes: 15 },
      serviceDays: { Monday: true, Friday: true, Sunday: false },
    });
  });

  test("uses the requested stop as the frequency anchor when TDX provides one", () => {
    const schedule = normalizeFrequency(
      {
        StartTime: "06:00",
        EndTime: "09:00",
        Headway: 20,
        StopUID: "campus",
        ServiceDay: { Saturday: true },
      },
      stops,
    );

    expect(schedule).toMatchObject({
      kind: "frequency",
      timeBasis: "stop",
      originStopId: "campus",
      frequency: { headwayMinutes: 20 },
      serviceDays: { Saturday: true },
    });
  });
});
