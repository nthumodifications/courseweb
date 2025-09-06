"use client";
import { toPrettySemester } from "@/helpers/semester";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const ClassRankChart = ({ lineData }: { lineData: any[] }) => {
  const max_class_rank = Math.max(
    ...lineData.map((semester) => semester.max_class_rank),
  );
  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={lineData}
          margin={{
            top: 5,
            right: 10,
            left: 10,
            bottom: 0,
          }}
        >
          <Tooltip
            content={({ active, payload, content }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Semester
                        </span>
                        <span className="font-bold text-muted-foreground">
                          {toPrettySemester(payload[0].payload.semester)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          班排名
                        </span>
                        <span className="font-bold">
                          {payload[0].payload.class_rank}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="class_rank"
            strokeWidth={2}
            activeDot={{
              r: 8,
            }}
          />
          <XAxis dataKey="semester" />
          <YAxis reversed domain={[1, max_class_rank]} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
