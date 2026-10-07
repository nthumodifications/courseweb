import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useDictionary from "@/dictionaries/useDictionary";
import { toPrettySemester } from "@/helpers/semester";
import type { DemandPoint } from "@/lib/module-insights";

// One hue: the bar is darker when the semester was over-subscribed.
const FILL_UNDER = "#C19AE6"; // nthu-400
const FILL_OVER = "#7E42AE"; // nthu-700

const percent = (value: number) => `${Math.round(value * 100)}%`;

/** Seats filled per semester, as a share of capacity. */
export const ModuleDemandChart = ({
  series,
}: {
  series: readonly DemandPoint[];
}) => {
  const dict = useDictionary();
  const labels = dict.course.module.demand;
  const top = Math.max(1.25, ...series.map((point) => point.fill));
  const ticks = Array.from(
    { length: Math.ceil(top / 0.5) + 1 },
    (_, index) => index * 0.5,
  );

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={[...series]}
          margin={{ top: 8, right: 36, left: 0, bottom: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="semester"
            tickFormatter={(semester: string) => toPrettySemester(semester)}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            width={44}
            ticks={ticks}
            domain={[0, ticks.at(-1)!]}
            tickFormatter={percent}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <ReferenceLine
            y={1}
            stroke="hsl(var(--foreground))"
            strokeOpacity={0.45}
            label={{
              value: labels.full,
              position: "right",
              fontSize: 12,
              fill: "hsl(var(--muted-foreground))",
            }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as DemandPoint | undefined;
              if (!active || !point) return null;
              return (
                <div className="rounded-lg border bg-background p-2 text-sm shadow-sm">
                  <div className="font-bold">
                    {toPrettySemester(point.semester)}
                  </div>
                  <div>
                    {point.enrolled} / {point.capacity} {labels.seats} ·{" "}
                    {percent(point.fill)}
                  </div>
                  {point.sections > 1 && (
                    <div className="text-muted-foreground">
                      {point.sections} {dict.course.module.stats.classes}
                    </div>
                  )}
                </div>
              );
            }}
          />
          <Bar
            dataKey="fill"
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            {series.map((point) => (
              <Cell
                key={point.semester}
                fill={point.fill > 1 ? FILL_OVER : FILL_UNDER}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
