// components/dashboard/history-chart.tsx
"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
        "flex flex-col h-[340px]",
        "p-5 rounded-2xl",
        "bg-white dark:bg-zinc-900/60",
        "border border-zinc-200/80 dark:border-zinc-800/60",
        "shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <img
          src="https://img.icons8.com/pulsar-color/48/cloud-line-chart.png"
          alt="Evolução de Inventários"
          width={28}
          height={28}
          loading="eager"
          decoding="async"
        />
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
            Evolução de Inventários
          </h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Arquivos salvos neste ano
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 relative w-full overflow-x-auto overflow-y-hidden no-scrollbar">
        {!hasData && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 bg-white/90 dark:bg-zinc-900/90 px-4 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
              Nenhum inventário salvo este ano
            </span>
          </div>
        )}

        <div style={{ width: 800, height: "100%" }} className="min-h-[220px]">
          <BarChart
            width={800}
            height={260}
            data={data}
            margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(0,0,0,0.06)"
              className="dark:stroke-zinc-800/50"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#a1a1aa" }}
              dy={10}
              interval="preserveStartEnd"
              minTickGap={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#a1a1aa" }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "none",
                backgroundColor: "rgba(255, 255, 255, 0.97)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 8px 32px -4px rgb(0 0 0 / 0.12)",
                padding: "8px 14px",
              }}
              labelStyle={{ fontWeight: 700, color: "#18181b", fontSize: 12, textTransform: "capitalize" }}
              itemStyle={{ fontWeight: 600, color: "#3b82f6", fontSize: 12 }}
              cursor={{ fill: "rgba(59, 130, 246, 0.08)", radius: 6 }}
            />
            <Bar
              dataKey="count"
              name="Arquivos Salvos"
              fill="url(#colorHist)"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </div>
      </div>
    </div>
  );
}
