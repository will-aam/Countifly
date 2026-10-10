// components/dashboard/company-chart.tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyData {
  name: string;
  count: number;
}

interface CompanyChartProps {
  data: CompanyData[];
  isBlocked?: boolean;
  blockedText?: string;
  className?: string;
}

const dummyData: CompanyData[] = [
  { name: "Matriz", count: 120 },
  { name: "Filial Sul", count: 85 },
  { name: "Filial Norte", count: 105 },
  { name: "Loja Shopping", count: 60 },
];

const BAR_COLORS = ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"];

export function CompanyChart({
  data,
  isBlocked,
  blockedText,
  className,
}: CompanyChartProps) {
  const chartData = isBlocked || data.length === 0 ? dummyData : data;
  const hasData = isBlocked || data.length > 0;

  return (
    <div
      className={cn(
        "flex flex-col h-[340px] relative overflow-hidden",
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
          src="https://img.icons8.com/pulsar-color/48/company.png"
          alt="Comparativo por Loja"
          width={28}
          height={28}
          loading="eager"
          decoding="async"
        />
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
            Comparativo por Loja
          </h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Arquivos salvos por filial
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 relative">
        {isBlocked && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-900/70 backdrop-blur-[6px] rounded-xl">
            <div className="p-3 bg-white dark:bg-zinc-800 rounded-full shadow-lg mb-3 border border-zinc-100 dark:border-zinc-700">
              <Lock className="w-5 h-5 text-zinc-400" />
            </div>
            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
              Módulo Restrito
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 px-6 text-center max-w-[220px] leading-relaxed">
              {blockedText}
            </span>
          </div>
        )}

        {!hasData && !isBlocked ? (
          <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            <span className="text-sm text-zinc-400">
              Nenhuma empresa cadastrada.
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(0,0,0,0.06)"
                className="dark:stroke-zinc-800/50"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                allowDecimals={false}
              />
              {!isBlocked && (
                <Tooltip
                  cursor={{ fill: "rgba(99, 102, 241, 0.08)", radius: 6 }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: "rgba(255, 255, 255, 0.97)",
                    boxShadow: "0 8px 32px -4px rgb(0 0 0 / 0.12)",
                    padding: "8px 14px",
                  }}
                  labelStyle={{ fontWeight: 700, color: "#18181b", fontSize: 12 }}
                  itemStyle={{ fontWeight: 600, color: "#6366f1", fontSize: 12 }}
                />
              )}
              <Bar dataKey="count" name="Arquivos" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                    fillOpacity={isBlocked ? 0.25 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
