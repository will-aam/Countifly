// components/dashboard/history-chart.tsx
"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
} from "recharts";
import { cn } from "@/lib/utils";

interface HistoryChartProps {
  data: {
    label: string;
    count: number;
  }[];
  className?: string;
}

export function HistoryChart({ data, className }: HistoryChartProps) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <div
      className={cn(
        "flex flex-col",
        "p-5 rounded-2xl shadow-sm backdrop-blur-md",
        "bg-blue-950/5 dark:bg-blue-950/40",
        "border border-blue-900/10 dark:border-blue-800/30",
        className,
      )}
    >
      <div className="flex items-center gap-3 mb-6 px-4 md:px-0">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Evolução de Inventários
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Volume de arquivos salvos neste ano.
          </p>
        </div>
      </div>

      <div className="flex-1 relative w-full overflow-x-auto overflow-y-hidden no-scrollbar" style={{ height: 250, minHeight: 250 }}>
        {!hasData && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none left-0 w-full">
            <span className="font-bold text-zinc-900 dark:text-zinc-100 mb-1 bg-white/80 dark:bg-zinc-900/80 px-3 py-1 rounded-md">
              Nenhum dado
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 px-6 text-center bg-white/80 dark:bg-zinc-900/80 py-1 rounded-md mt-1">
              Você ainda não possui inventários salvos neste ano.
            </span>
          </div>
        )}
        
        <div style={{ width: 800, height: 250 }}>
          <BarChart
            width={800}
            height={250}
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e4e4e7"
              className="dark:stroke-zinc-800/50"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#71717a" }}
              dy={10}
              interval="preserveStartEnd"
              minTickGap={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#71717a" }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
              }}
              labelStyle={{
                fontWeight: 600,
                color: "#27272a",
                textTransform: "capitalize",
              }}
              itemStyle={{ fontWeight: 600, color: "#3b82f6" }}
              cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
            />
            <Bar
              dataKey="count"
              name="Arquivos Salvos"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </div>
      </div>
    </div>
  );
}
