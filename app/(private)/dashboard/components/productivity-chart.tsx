// components/dashboard/productivity-chart.tsx
"use client";

import { useState, useEffect } from "react";
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
import { useMediaQuery } from "@/hooks/use-media-query";

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
  if (i >= 8 && i <= 11) count = Math.floor(Math.random() * 50) + 100;
  if (i >= 14 && i <= 17) count = Math.floor(Math.random() * 40) + 80;
  return { hour: `${i}h`, count };
});

export function ProductivityChart({
  data,
  isBlocked,
  blockedText,
  className,
}: ProductivityChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const isMobile = useMediaQuery("(max-width: 639px)");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartData = isBlocked ? dummyData : data;

  return (
    <div
      className={cn(
        "flex flex-col relative overflow-hidden",
        isBlocked ? "h-[210px] lg:h-[340px]" : "h-[235px] sm:h-[290px] lg:h-[340px]",
        "p-4 sm:p-5 rounded-2xl",
        "bg-white dark:bg-zinc-900/60",
        "border border-zinc-200/80 dark:border-zinc-800/60",
        "shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="mb-3 sm:mb-5">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
          Ritmo de Produtividade
        </h3>
      </div>

      {/* Chart */}
      <div className="flex-1 relative min-h-0">
        {isBlocked && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-900/70 backdrop-blur-[6px] rounded-xl">
            <div className="p-2.5 sm:p-3 bg-white dark:bg-zinc-800 rounded-full shadow-lg mb-2 sm:mb-3 border border-zinc-100 dark:border-zinc-700">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 mb-1">
              Módulo Restrito
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 px-5 sm:px-6 text-center max-w-[240px] leading-relaxed">
              {blockedText}
            </span>
          </div>
        )}

        {isMounted && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart
              data={chartData}
              margin={isMobile ? { top: 6, right: 6, left: -24, bottom: 0 } : { top: 8, right: 8, left: -20, bottom: 0 }}
            >
            <defs>
              <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="#10b981"
                  stopOpacity={isBlocked ? 0.15 : 0.35}
                />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(0,0,0,0.06)"
              className="dark:stroke-zinc-800/50"
            />
            <XAxis
              dataKey="hour"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: isMobile ? 10 : 11, fill: "#a1a1aa" }}
              dy={isMobile ? 6 : 10}
              minTickGap={isMobile ? 36 : 30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: isMobile ? 10 : 11, fill: "#a1a1aa" }}
              tickCount={isMobile ? 4 : 5}
              allowDecimals={false}
            />

            {!isBlocked && (
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: "rgba(255, 255, 255, 0.97)",
                  boxShadow: "0 8px 32px -4px rgb(0 0 0 / 0.12)",
                  padding: "8px 14px",
                }}
                labelStyle={{ fontWeight: 700, color: "#18181b", fontSize: 12 }}
                itemStyle={{ fontWeight: 600, color: "#10b981", fontSize: 12 }}
              />
            )}

            <Area
              type="monotone"
              dataKey="count"
              name="Leituras"
              stroke={isBlocked ? "rgba(16,185,129,0.25)" : "#10b981"}
              strokeWidth={isBlocked ? 1 : 2.5}
              fill="url(#colorProd)"
              activeDot={
                !isBlocked ? { r: 5, fill: "#10b981", strokeWidth: 0 } : false
              }
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
