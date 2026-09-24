import { describe, expect, test } from "bun:test";
import {
  getBranchFromItem,
  getCategoryFromItem,
  getLocalizedSpaceTypeName,
  getZoneCapacity,
  getBranchOpenStatus,
  getTaipeiTimeParts,
  isTaiwanNationalHoliday,
  type LibraryVacancyItem,
} from "./library";

describe("library status helpers", () => {
  test("getBranchFromItem identifies branches correctly", () => {
    const moonlightItem: LibraryVacancyItem = {
      spacetype: 8,
      spacetypename: "夜讀區",
      zoneid: "8_4A",
      zonename: "4F-夜讀區A",
      count: 36,
    };
    expect(getBranchFromItem(moonlightItem)).toBe("moonlight");

    const hssItem: LibraryVacancyItem = {
      spacetype: 10,
      spacetypename: "資訊島",
      zoneid: "10_1AA",
      zonename: "人社1F-資訊島",
      count: 2,
    };
    expect(getBranchFromItem(hssItem)).toBe("hss");

    const ctmItem: LibraryVacancyItem = {
      spacetype: 2,
      spacetypename: "討論室",
      zoneid: "2_9A",
      zonename: "科管院3F-討論室",
      count: 3,
    };
    expect(getBranchFromItem(ctmItem)).toBe("ctm");

    const mainItem: LibraryVacancyItem = {
      spacetype: 10,
      spacetypename: "資訊島",
      zoneid: "10_1A",
      zonename: "1F-資訊島",
      count: 17,
    };
    expect(getBranchFromItem(mainItem)).toBe("main");
  });

  test("getCategoryFromItem classifies spacetype correctly", () => {
    expect(getCategoryFromItem({ spacetype: 8 } as any)).toBe("moonlight");
    expect(getCategoryFromItem({ spacetype: 2 } as any)).toBe("discussion");
    expect(getCategoryFromItem({ spacetype: 4 } as any)).toBe("discussion");
    expect(getCategoryFromItem({ spacetype: 1 } as any)).toBe("carrel");
    expect(getCategoryFromItem({ spacetype: 7 } as any)).toBe("carrel");
    expect(getCategoryFromItem({ spacetype: 14 } as any)).toBe("carrel");
    expect(getCategoryFromItem({ spacetype: 10 } as any)).toBe("workstation");
    expect(getCategoryFromItem({ spacetype: 9 } as any)).toBe("workstation");
    expect(getCategoryFromItem({ spacetype: 3 } as any)).toBe("av");
    expect(getCategoryFromItem({ spacetype: 5 } as any)).toBe("group");
    expect(getCategoryFromItem({ spacetype: 6 } as any)).toBe("group");
  });

  test("getLocalizedSpaceTypeName returns localized string from dictionary", () => {
    const dictEn = {
      library: {
        filter_cat_discussion: "Discussion Rooms",
        filter_cat_workstation: "PC Workstations",
      },
    };
    const item: LibraryVacancyItem = {
      spacetype: 2,
      spacetypename: "討論室",
      zoneid: "2_2A",
      zonename: "2F-討論室",
      count: 5,
    };
    expect(getLocalizedSpaceTypeName(item, dictEn)).toBe("Discussion Rooms");
  });

  test("getZoneCapacity provides reasonable capacities or null for unknown", () => {
    const knownItem: LibraryVacancyItem = {
      spacetype: 8,
      spacetypename: "夜讀區",
      zoneid: "8_4A",
      zonename: "4F-夜讀區A",
      count: 36,
    };
    expect(getZoneCapacity(knownItem)).toBe(45);

    const discussionItem: LibraryVacancyItem = {
      spacetype: 2,
      spacetypename: "討論室",
      zoneid: "2_2A",
      zonename: "2F-討論室",
      count: 5,
    };
    expect(getZoneCapacity(discussionItem)).toBe(8);

    const unknownItem: LibraryVacancyItem = {
      spacetype: 99,
      spacetypename: "未知空間",
      zoneid: "99_1A",
      zonename: "未知區域",
      count: 20,
    };
    expect(getZoneCapacity(unknownItem)).toBeNull();
  });

  test("getBranchOpenStatus handles Weekdays, Weekends, and Holidays", () => {
    // Weekday Afternoon: 2026-09-18 14:00 Taipei time (UTC 06:00, Friday)
    const fridayAfternoon = new Date("2026-09-18T06:00:00Z");
    expect(getBranchOpenStatus("main", fridayAfternoon)).toEqual({
      status: "open",
      openTill: "22:00",
    });

    // Saturday Afternoon: 2026-09-26 14:00 Taipei time (UTC 06:00, Saturday)
    const saturdayAfternoon = new Date("2026-09-26T06:00:00Z");
    expect(getBranchOpenStatus("main", saturdayAfternoon)).toEqual({
      status: "open",
      openTill: "17:00",
    });

    // Sunday Afternoon: 2026-09-27 14:00 Taipei time (UTC 06:00, Sunday)
    // HSS is closed on Sundays
    const sundayAfternoon = new Date("2026-09-27T06:00:00Z");
    expect(getBranchOpenStatus("hss", sundayAfternoon)).toEqual({
      status: "closed",
    });

    // National Holiday: 2026-10-10 10:00 Taipei time (National Day)
    const nationalDay = new Date("2026-10-10T02:00:00Z");
    expect(isTaiwanNationalHoliday(nationalDay)).toBe(true);

    // Main library is closed on National Day
    expect(getBranchOpenStatus("main", nationalDay)).toEqual({
      status: "closed",
      isHoliday: true,
    });

    // Moonlight Area (24H) remains open 24/7 on National Holidays
    expect(getBranchOpenStatus("moonlight", nationalDay)).toEqual({
      status: "open_24h",
      is24h: true,
    });

    // Dynamic Lunar Holidays tests:
    // Mid-Autumn 2026 (2026-09-25 UTC ~ Taipei 2026-09-25)
    const midAutumn2026 = new Date("2026-09-25T02:00:00Z");
    expect(isTaiwanNationalHoliday(midAutumn2026)).toBe(true);

    // Dragon Boat 2026 (2026-06-19 UTC ~ Taipei 2026-06-19)
    const dragonBoat2026 = new Date("2026-06-19T02:00:00Z");
    expect(isTaiwanNationalHoliday(dragonBoat2026)).toBe(true);

    // Lunar New Year Day 1 2026 (2026-02-17 UTC ~ Taipei 2026-02-17)
    const lunarNewYear2026 = new Date("2026-02-17T02:00:00Z");
    expect(isTaiwanNationalHoliday(lunarNewYear2026)).toBe(true);
  });
});
