import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface TrendPoint {
  date: string;
  amount: number;
}

interface TrendChartProps {
  data: TrendPoint[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ data = [] }) => {
  // Get today's date string in YYYY-MM-DD format (local time)
  const todayStr = new Date().toISOString().split("T")[0];

  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem);
      // Format to "Mon 24" or similar
      return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
    } catch {
      return tickItem;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dateVal = new Date(payload[0].payload.date);
      const formattedDate = dateVal.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      return (
        <div className="bg-bg-surface border border-border-default p-3 rounded-xl shadow-lg font-sans text-xs">
          <p className="text-text-tertiary mb-1 font-medium">{formattedDate}</p>
          <p className="text-accent-primary font-bold text-sm">
            ₹{payload[0].value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 rounded-2xl bg-bg-surface border border-border-default h-full transition-all duration-300 hover:shadow-md flex flex-col justify-between">
      <div className="mb-4">
        <h3 className="text-xs uppercase tracking-widest text-text-tertiary font-sans mb-1">
          The Chart Room
        </h3>
        <h2 className="text-sm font-bold font-cinzel text-text-primary">
          7-Day Spend Trend
        </h2>
      </div>

      <div className="h-48 w-full font-sans text-xs">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-tertiary">
            No plundered data logged yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                stroke="var(--text-tertiary)"
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis
                stroke="var(--text-tertiary)"
                tickLine={false}
                axisLine={false}
                dx={-8}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--bg-elevated)", opacity: 0.2 }} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => {
                  const isToday = entry.date === todayStr;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill="var(--accent-primary)"
                      fillOpacity={isToday ? 1.0 : 0.45}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
