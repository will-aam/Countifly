// components/dashboard/productivity-chart.tsx
"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductivityData {
  hour: string;
  count: number;
}

interface ProductivityChartProps {
  data: ProductivityData[];
  isBlocked?: boolean;
  blockedText?: string;
  className?: string;
}

const dummyData: ProductivityData[] = Array.from({ length: 24 }).map((_, i) => {
  let count = 0;
  if (i >= 8 && i <= 11) count = Math.floor(Math.random() * 50) + 100; // Pico manhã
  if (i >= 14 && i <= 17) count = Math.floor(Math.random() * 40) + 80; // Pico tarde
  return { hour: `${i}h`, count };
});

export function ProductivityChart({
  data,
  isBlocked,
  blockedText,
  className,
}: ProductivityChartProps) {
  const chartData = isBlocked ? dummyData : data;

  return (
    <div
      className={cn(
        "flex flex-col relative overflow-hidden h-full",
        "py-6 px-0 bg-transparent border-none shadow-none",
        "md:p-6 md:rounded-2xl md:shadow-sm md:backdrop-blur-md",
        "md:bg-blue-950/5 dark:md:bg-blue-950/40",
        "md:border md:border-blue-900/10 dark:md:border-blue-800/30",
        className,
      )}
    >
      <div className="flex items-center gap-3 mb-6 px-4 md:px-0">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Ritmo de Produtividade
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Volume de bips por horário (Gestão de Sala).
          </p>
        </div>
      </div>

      <div className="flex-1 w-full h-[250px] min-h-[250px] relative px-4 md:px-0">
        {isBlocked && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/40 dark:bg-zinc-950/50 backdrop-blur-[4px] rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 m-4 md:m-0">
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-full shadow-lg mb-3">
              <Lock className="w-6 h-6 text-zinc-400" />
            </div>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Módulo Restrito
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 px-6 text-center">
              {blockedText}
            </span>
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="#10b981"
                  stopOpacity={isBlocked ? 0.2 : 0.4}
                />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e4e4e7"
              className="dark:stroke-zinc-800/50"
            />
            {/* Eixo X reduzido para não poluir com 24 números */}
            <XAxis
              dataKey="hour"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#71717a" }}
              dy={10}
              minTickGap={30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#71717a" }}
              allowDecimals={false}
            />

            {!isBlocked && (
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
                labelStyle={{ fontWeight: 600, color: "#27272a" }}
                itemStyle={{ fontWeight: 600, color: "#10b981" }}
              />
            )}

            <Area
              type="monotone"
              dataKey="count"
              name="Leituras"
              stroke="#10b981"
              strokeWidth={3}
              fill="url(#colorProd)"
              activeDot={
                !isBlocked ? { r: 6, fill: "#10b981", strokeWidth: 0 } : false
              }
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
