/**
 * RecurrenceSelector - UI for configuring event recurrence (RRULE)
 */

import React, { useState, useEffect } from "react";
import { Button, Label, Input, Switch } from "@courseweb/ui";
import { Repeat, X } from "lucide-react";
import { RRule, type Weekday } from "rrule";
import { getRecurrenceSummary } from "@/lib/utils/calendar-rrule-utils";

export interface RecurrenceSelectorProps {
  value?: string; // RRULE string
  onChange: (rrule: string | undefined) => void;
  startDate: string; // ISO date string
}

type FrequencyType = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
type EndType = "never" | "count" | "until";

export function RecurrenceSelector({
  value,
  onChange,
  startDate,
}: RecurrenceSelectorProps) {
  const [enabled, setEnabled] = useState(Boolean(value));
  const [frequency, setFrequency] = useState<FrequencyType>("WEEKLY");
  const [interval, setInterval] = useState(1);
  const [endType, setEndType] = useState<EndType>("never");
  const [count, setCount] = useState(10);
  const [until, setUntil] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);

  // Parse existing RRULE if provided
  useEffect(() => {
    if (value) {
      try {
        const rule = RRule.fromString(value);
        const options = rule.options;

        // Map RRule.DAILY (3) to "DAILY" string
        const freqMap: Record<number, FrequencyType> = {
          [RRule.DAILY]: "DAILY",
          [RRule.WEEKLY]: "WEEKLY",
          [RRule.MONTHLY]: "MONTHLY",
          [RRule.YEARLY]: "YEARLY",
        };
        setFrequency(freqMap[options.freq] || "WEEKLY");
        setInterval(options.interval || 1);

        if (options.count) {
          setEndType("count");
          setCount(options.count);
        } else if (options.until) {
          setEndType("until");
          setUntil(options.until.toISOString().split("T")[0]);
        } else {
          setEndType("never");
        }

        if (options.byweekday) {
          const days = (
            Array.isArray(options.byweekday)
              ? options.byweekday
              : [options.byweekday]
          ) as Array<number | Weekday>;
          setWeekdays(days.map((d) => (typeof d === "number" ? d : d.weekday)));
        }
      } catch (error) {
        console.error("Failed to parse RRULE:", error);
      }
    }
  }, [value]);

  // Generate RRULE when configuration changes
  useEffect(() => {
    if (!enabled) {
      onChange(undefined);
      return;
    }

    try {
      const freqMap: Record<FrequencyType, number> = {
        DAILY: RRule.DAILY,
        WEEKLY: RRule.WEEKLY,
        MONTHLY: RRule.MONTHLY,
        YEARLY: RRule.YEARLY,
      };

      const options: Partial<any> = {
        freq: freqMap[frequency],
        interval,
        dtstart: new Date(startDate),
      };

      if (endType === "count") {
        options.count = count;
      } else if (endType === "until") {
        options.until = new Date(until);
      }

      if (frequency === "WEEKLY" && weekdays.length > 0) {
        options.byweekday = weekdays;
      }

      const rule = new RRule(options);
      onChange(rule.toString());
    } catch (error) {
      console.error("Failed to create RRULE:", error);
    }
  }, [
    enabled,
    frequency,
    interval,
    endType,
    count,
    until,
    weekdays,
    startDate,
  ]);

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort(),
    );
  };

  const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="space-y-4" data-testid="recurrence-selector">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="repeat-toggle" className="flex items-center gap-2">
          <Repeat className="h-4 w-4" />
          Repeat
        </Label>
        <Switch
          id="repeat-toggle"
          checked={enabled}
          onCheckedChange={setEnabled}
          data-testid="recurrence-toggle"
        />
      </div>

      {enabled && (
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
          {/* Summary */}
          {value && (
            <div
              className="text-sm text-gray-600 flex items-center gap-2"
              data-testid="recurrence-summary"
            >
              <Repeat className="h-4 w-4" />
              {getRecurrenceSummary(value)}
            </div>
          )}

          {/* Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Repeat every</Label>
              <div className="flex gap-2">
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  max="999"
                  value={interval}
                  onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                  className="w-20"
                  data-testid="recurrence-interval"
                />
                <select
                  id="frequency"
                  value={frequency}
                  onChange={(e) =>
                    setFrequency(e.target.value as FrequencyType)
                  }
                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  data-testid="recurrence-frequency"
                >
                  <option value="DAILY">Day(s)</option>
                  <option value="WEEKLY">Week(s)</option>
                  <option value="MONTHLY">Month(s)</option>
                  <option value="YEARLY">Year(s)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Weekday selector for weekly recurrence */}
          {frequency === "WEEKLY" && (
            <div className="space-y-2">
              <Label>Repeat on</Label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekday(day)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                      weekdays.includes(day)
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    data-testid={`recurrence-weekday-${day}`}
                  >
                    {weekdayLabels[day]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* End condition */}
          <div className="space-y-2">
            <Label>Ends</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="end-type"
                  value="never"
                  checked={endType === "never"}
                  onChange={() => setEndType("never")}
                  data-testid="recurrence-end-never"
                />
                <span className="text-sm">Never</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="end-type"
                  value="count"
                  checked={endType === "count"}
                  onChange={() => setEndType("count")}
                  data-testid="recurrence-end-count"
                />
                <span className="text-sm">After</span>
                <Input
                  type="number"
                  min="1"
                  max="999"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 10)}
                  disabled={endType !== "count"}
                  className="w-20"
                  data-testid="recurrence-count-input"
                />
                <span className="text-sm">occurrences</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="end-type"
                  value="until"
                  checked={endType === "until"}
                  onChange={() => setEndType("until")}
                  data-testid="recurrence-end-until"
                />
                <span className="text-sm">On</span>
                <Input
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  disabled={endType !== "until"}
                  className="flex-1"
                  data-testid="recurrence-until-input"
                />
              </label>
            </div>
          </div>

          {/* Clear button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setEnabled(false);
              onChange(undefined);
            }}
            className="w-full"
            data-testid="recurrence-clear"
          >
            <X className="h-4 w-4 mr-2" />
            Clear recurrence
          </Button>
        </div>
      )}
    </div>
  );
}
