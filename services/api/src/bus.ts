import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { parseHTML } from "linkedom/worker";

interface BusScheduleItem {
  time: string;
  description: string;
  route: "校園公車" | "南大區間車";
  dep_stop?: string;
  line?: string;
  type?: "route1" | "route2";
}

interface RouteInfo {
  direction: string;
  duration: string;
  route: string;
  routeEN: string;
}

interface ParsedBusData {
  towardTSMCBuildingInfo?: RouteInfo;
  towardMainGateInfo?: RouteInfo;
  towardNandaInfo?: RouteInfo;
  towardMainCampusInfo?: RouteInfo;
  weekdayBusScheduleTowardTSMCBuilding?: Array<{
    time: string;
    depStop: string;
    line: string;
    description: string;
  }>;
  weekendBusScheduleTowardTSMCBuilding?: Array<{
    time: string;
    depStop: string;
    line: string;
    description: string;
  }>;
  weekdayBusScheduleTowardMainGate?: Array<{
    time: string;
    depStop: string;
    line: string;
    description: string;
  }>;
  weekendBusScheduleTowardMainGate?: Array<{
    time: string;
    depStop: string;
    line: string;
    description: string;
  }>;
  weekdayBusScheduleTowardNanda?: Array<{
    time: string;
    line: string;
    description: string;
  }>;
  weekendBusScheduleTowardNanda?: Array<{
    time: string;
    line: string;
    description: string;
  }>;
  weekdayBusScheduleTowardMainCampus?: Array<{
    time: string;
    line: string;
    description: string;
  }>;
  weekendBusScheduleTowardMainCampus?: Array<{
    time: string;
    line: string;
    description: string;
  }>;
}

interface CompleteBusData {
  main: {
    toward_TSMC_building_info: RouteInfo;
    toward_main_gate_info: RouteInfo;
    weekday: {
      toward_TSMC_building: Array<{
        time: string;
        description: string;
        route: "校園公車";
        dep_stop: string;
        line: string;
      }>;
      toward_main_gate: Array<{
        time: string;
        description: string;
        route: "校園公車";
        dep_stop: string;
        line: string;
      }>;
    };
    weekend: {
      toward_TSMC_building: Array<{
        time: string;
        description: string;
        route: "校園公車";
        dep_stop: string;
        line: string;
      }>;
      toward_main_gate: Array<{
        time: string;
        description: string;
        route: "校園公車";
        dep_stop: string;
        line: string;
      }>;
    };
  };
  nanda: {
    toward_south_campus_info: RouteInfo;
    toward_main_campus_info: RouteInfo;
    weekday: {
      toward_south_campus: Array<{
        time: string;
        description: string;
        route: "南大區間車";
        type?: "route1" | "route2";
      }>;
      toward_main_campus: Array<{
        time: string;
        description: string;
        route: "南大區間車";
        type?: "route1" | "route2";
      }>;
    };
    weekend: {
      toward_south_campus: Array<{
        time: string;
        description: string;
        route: "南大區間車";
        type?: "route1" | "route2";
      }>;
      toward_main_campus: Array<{
        time: string;
        description: string;
        route: "南大區間車";
        type?: "route1" | "route2";
      }>;
    };
  };
}

const app = new Hono()
  .get("/", async (c) => {
    try {
      // Fetch both campus and inter-campus data
      const url1 =
        "https://affairs.site.nthu.edu.tw/p/412-1165-20978.php?Lang=zh-tw"; // campus bus (red/green)
      const url2 =
        "https://affairs.site.nthu.edu.tw/p/412-1165-20979.php?Lang=zh-tw"; // inter-campus (route1/route2)

      const [response1, response2] = await Promise.all([
        fetch(url1),
        fetch(url2),
      ]);

      let busData: ParsedBusData = {};

      // Parse campus bus data
      if (response1.ok) {
        const html1 = await response1.text();
        const { document: doc1 } = parseHTML(html1);
        const scripts1 = doc1.querySelectorAll("script");

        for (let i = 0; i < scripts1.length; i++) {
          const script = scripts1[i];
          const scriptContent = script.textContent || script.innerHTML;

          if (
            scriptContent.includes("towardTSMCBuildingInfo") ||
            scriptContent.includes("weekdayBusScheduleTowardTSMCBuilding")
          ) {
            const campusData = extractBusDataFromScript(scriptContent);
            busData = { ...busData, ...campusData };
            break;
          }
        }
      }

      // Parse inter-campus bus data
      if (response2.ok) {
        const html2 = await response2.text();
        const { document: doc2 } = parseHTML(html2);
        const scripts2 = doc2.querySelectorAll("script");

        for (let i = 0; i < scripts2.length; i++) {
          const script = scripts2[i];
          const scriptContent = script.textContent || script.innerHTML;

          if (
            scriptContent.includes("towardNandaInfo") ||
            scriptContent.includes("weekdayBusScheduleTowardNanda")
          ) {
            const intercampusData = extractBusDataFromScript(scriptContent);
            busData = { ...busData, ...intercampusData };
            break;
          }
        }
      }

      if (Object.keys(busData).length === 0) {
        throw new Error("Bus schedule data not found in either page");
      }

      // Transform the data into the organized structure
      const transformIntercampusBuses = (
        buses: Array<{ time: string; line: string; description: string }>,
      ) => {
        return buses.map((item) => {
          // Determine type based on line or description
          let type: "route1" | "route2" | undefined = undefined;
          if (
            item.line === "route1" ||
            item.description.includes("路線一") ||
            item.description.includes("Route I")
          ) {
            type = "route1";
          } else if (
            item.line === "route2" ||
            item.description.includes("路線二") ||
            item.description.includes("Route II")
          ) {
            type = "route2";
          }

          return {
            time: item.time,
            description: item.description,
            route: "南大區間車" as const,
            type,
          };
        });
      };

      const transformCampusBuses = (
        buses: Array<{
          time: string;
          depStop: string;
          line: string;
          description: string;
        }>,
      ) => {
        return buses.map((item) => ({
          time: item.time,
          description: item.description,
          route: "校園公車" as const,
          dep_stop: item.depStop,
          line: item.line,
        }));
      };

      const result: CompleteBusData = {
        main: {
          toward_TSMC_building_info: busData.towardTSMCBuildingInfo || {
            direction: "往台積館",
            duration: "約15分鐘",
            route: "紅線、綠線",
            routeEN: "Red Line, Green Line",
          },
          toward_main_gate_info: busData.towardMainGateInfo || {
            direction: "往北校門口",
            duration: "約15分鐘",
            route: "紅線、綠線",
            routeEN: "Red Line, Green Line",
          },
          weekday: {
            toward_TSMC_building: transformCampusBuses(
              busData.weekdayBusScheduleTowardTSMCBuilding || [],
            ),
            toward_main_gate: transformCampusBuses(
              busData.weekdayBusScheduleTowardMainGate || [],
            ),
          },
          weekend: {
            toward_TSMC_building: transformCampusBuses(
              busData.weekendBusScheduleTowardTSMCBuilding ||
                busData.weekdayBusScheduleTowardTSMCBuilding ||
                [],
            ),
            toward_main_gate: transformCampusBuses(
              busData.weekendBusScheduleTowardMainGate ||
                busData.weekdayBusScheduleTowardMainGate ||
                [],
            ),
          },
        },
        nanda: {
          toward_south_campus_info: busData.towardNandaInfo || {
            direction: "往南大校區",
            duration: "約20分鐘",
            route: "南大區間車",
            routeEN: "Nanda Shuttle",
          },
          toward_main_campus_info: busData.towardMainCampusInfo || {
            direction: "往校本部",
            duration: "約20分鐘",
            route: "南大區間車",
            routeEN: "Nanda Shuttle",
          },
          weekday: {
            toward_south_campus: transformIntercampusBuses(
              busData.weekdayBusScheduleTowardNanda || [],
            ),
            toward_main_campus: transformIntercampusBuses(
              busData.weekdayBusScheduleTowardMainCampus || [],
            ),
          },
          weekend: {
            toward_south_campus: transformIntercampusBuses(
              busData.weekendBusScheduleTowardNanda ||
                busData.weekdayBusScheduleTowardNanda ||
                [],
            ),
            toward_main_campus: transformIntercampusBuses(
              busData.weekendBusScheduleTowardMainCampus ||
                busData.weekdayBusScheduleTowardMainCampus ||
                [],
            ),
          },
        },
      };

      return c.json(result);
    } catch (error) {
      console.error("Error fetching bus schedule:", error);
      return c.json({ error: "Failed to fetch bus schedule data" }, 500);
    }
  })
  .get(
    "/schedules",
    zValidator(
      "query",
      z.object({
        bus_type: z
          .enum(["all", "main", "nanda", "red", "green", "route1", "route2"])
          .optional(),
        day: z.enum(["all", "weekday", "weekend", "current"]).optional(),
        direction: z.enum(["up", "down"]).optional(),
      }),
    ),
    async (c) => {
      const { bus_type, day, direction } = c.req.valid("query");

      try {
        // Get complete data from main endpoint
        const completeDataResponse = await fetch(
          `${c.req.url.replace("/schedules", "")}`,
        );
        const completeData: CompleteBusData = await completeDataResponse.json();

        if (!completeDataResponse.ok) {
          throw new Error("Failed to fetch complete bus data");
        }

        // Determine which schedule to return based on parameters
        const currentDay =
          day === "current" ? getCurrentDayType() : day || "weekday";
        const busDirection = direction || "up";

        let scheduleData: BusScheduleItem[] = [];

        if (busDirection === "up") {
          // Campus buses toward TSMC
          if (
            !bus_type ||
            bus_type === "all" ||
            bus_type === "main" ||
            bus_type === "red" ||
            bus_type === "green"
          ) {
            const campusSchedule =
              currentDay === "weekend"
                ? completeData.main.weekend.toward_TSMC_building
                : completeData.main.weekday.toward_TSMC_building;

            for (const item of campusSchedule) {
              if (
                (bus_type === "red" && item.line !== "red") ||
                (bus_type === "green" && item.line !== "green")
              ) {
                continue;
              }
              scheduleData.push(item);
            }
          }

          // Inter-campus toward Nanda
          if (
            !bus_type ||
            bus_type === "all" ||
            bus_type === "nanda" ||
            bus_type === "route1" ||
            bus_type === "route2"
          ) {
            const intercampusSchedule =
              currentDay === "weekend"
                ? completeData.nanda.weekend.toward_south_campus
                : completeData.nanda.weekday.toward_south_campus;

            for (const item of intercampusSchedule) {
              if (
                (bus_type === "route1" && item.type !== "route1") ||
                (bus_type === "route2" && item.type !== "route2") ||
                (bus_type === "nanda" && item.type !== undefined)
              ) {
                continue;
              }
              scheduleData.push(item);
            }
          }
        } else {
          // Campus buses toward Main Gate
          if (
            !bus_type ||
            bus_type === "all" ||
            bus_type === "main" ||
            bus_type === "red" ||
            bus_type === "green"
          ) {
            const campusSchedule =
              currentDay === "weekend"
                ? completeData.main.weekend.toward_main_gate
                : completeData.main.weekday.toward_main_gate;

            for (const item of campusSchedule) {
              if (
                (bus_type === "red" && item.line !== "red") ||
                (bus_type === "green" && item.line !== "green")
              ) {
                continue;
              }
              scheduleData.push(item);
            }
          }

          // Inter-campus toward Main Campus
          if (
            !bus_type ||
            bus_type === "all" ||
            bus_type === "nanda" ||
            bus_type === "route1" ||
            bus_type === "route2"
          ) {
            const intercampusSchedule =
              currentDay === "weekend"
                ? completeData.nanda.weekend.toward_main_campus
                : completeData.nanda.weekday.toward_main_campus;

            for (const item of intercampusSchedule) {
              if (
                (bus_type === "route1" && item.type !== "route1") ||
                (bus_type === "route2" && item.type !== "route2") ||
                (bus_type === "nanda" && item.type !== undefined)
              ) {
                continue;
              }
              scheduleData.push(item);
            }
          }
        }

        // Filter by current time if day is "current"
        if (day === "current") {
          scheduleData = filterCurrentSchedule(scheduleData);
        }

        // Sort by time
        scheduleData.sort((a, b) => {
          const timeA = a.time.split(":").map(Number);
          const timeB = b.time.split(":").map(Number);
          return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
        });

        return c.json(scheduleData);
      } catch (error) {
        console.error("Error fetching filtered bus schedule:", error);
        return c.json({ error: "Failed to fetch bus schedule data" }, 500);
      }
    },
  );

function extractBusDataFromScript(scriptContent: string): ParsedBusData {
  try {
    // Use regex to extract the data objects directly
    const extractObject = (varName: string) => {
      const regex = new RegExp(`const ${varName} = \\{([\\s\\S]*?)\\}`, "m");
      const match = scriptContent.match(regex);
      if (match) {
        const result: any = {};
        const objContent = match[1];

        // Extract key-value pairs more carefully
        const lines = objContent.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("//")) {
            // Match property: value patterns
            const propMatch = trimmed.match(/(\w+):\s*['"`]([^'"`]*?)['"`],?/);
            if (propMatch) {
              result[propMatch[1]] = propMatch[2];
            }
          }
        }
        return Object.keys(result).length > 0 ? result : null;
      }
      return null;
    };

    const extractArray = (varName: string) => {
      const regex = new RegExp(`const ${varName} = \\[([\\s\\S]*?)\\]`, "m");
      const match = scriptContent.match(regex);
      if (match) {
        const result: any[] = [];
        const arrayContent = match[1];

        // Extract objects from the array content - handle multiline objects
        const objectMatches = arrayContent.match(/\{[\s\S]*?\}/g);
        if (objectMatches) {
          for (const objStr of objectMatches) {
            const obj: any = {};
            // Extract properties from each object
            const propMatches = objStr.match(/(\w+):\s*['"`]([^'"`]*?)['"`]/g);
            if (propMatches) {
              for (const propStr of propMatches) {
                const propMatch = propStr.match(
                  /(\w+):\s*['"`]([^'"`]*?)['"`]/,
                );
                if (propMatch) {
                  obj[propMatch[1]] = propMatch[2];
                }
              }
            }
            if (Object.keys(obj).length > 0) {
              // Map depStop to the correct format
              if (obj.depStop) {
                obj.depStop = obj.depStop.trim();
              }
              // Also check for dep_stop
              if (obj.dep_stop) {
                obj.dep_stop = obj.dep_stop.trim();
              }
              result.push(obj);
            }
          }
        }
        return result;
      }
      return [];
    };

    // Only extract data that actually exists in the script content
    const result: ParsedBusData = {};

    // Define all possible variables to extract
    const campusVars = [
      { key: "towardTSMCBuildingInfo", type: "object" },
      { key: "towardMainGateInfo", type: "object" },
      { key: "weekdayBusScheduleTowardTSMCBuilding", type: "array" },
      { key: "weekendBusScheduleTowardTSMCBuilding", type: "array" },
      { key: "weekdayBusScheduleTowardMainGate", type: "array" },
      { key: "weekendBusScheduleTowardMainGate", type: "array" },
    ];

    const intercampusVars = [
      { key: "towardNandaInfo", type: "object" },
      { key: "towardMainCampusInfo", type: "object" },
      { key: "weekdayBusScheduleTowardNanda", type: "array" },
      { key: "weekendBusScheduleTowardNanda", type: "array" },
      { key: "weekdayBusScheduleTowardMainCampus", type: "array" },
      { key: "weekendBusScheduleTowardMainCampus", type: "array" },
    ];

    // Only extract variables that exist in the script
    const allVars = [...campusVars, ...intercampusVars];

    for (const { key, type } of allVars) {
      if (scriptContent.includes(`const ${key} =`)) {
        if (type === "object") {
          const extracted = extractObject(key);
          if (extracted) {
            (result as any)[key] = extracted;
          }
        } else if (type === "array") {
          const extracted = extractArray(key);
          if (extracted.length > 0) {
            (result as any)[key] = extracted;
          }
        }
      }
    }

    return result;
  } catch (error) {
    throw new Error(
      `Failed to parse bus schedule data from script: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

function getCurrentDayType(): "weekday" | "weekend" {
  const today = new Date();
  const dayOfWeek = today.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6 ? "weekend" : "weekday";
}

function filterCurrentSchedule(
  scheduleData: BusScheduleItem[],
): BusScheduleItem[] {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  return scheduleData.filter((item) => {
    const [hour, minute] = item.time.split(":").map(Number);
    const itemTimeInMinutes = hour * 60 + minute;
    return itemTimeInMinutes > currentTimeInMinutes;
  });
}

export default app;
