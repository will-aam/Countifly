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
import { Store, Lock } from "lucide-react";
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

// Dados falsos bonitos apenas para mostrar atrás do desfoque quando bloqueado
const dummyData: CompanyData[] = [
  { name: "Matriz", count: 120 },
  { name: "Filial Sul", count: 85 },
  { name: "Filial Norte", count: 105 },
  { name: "Loja Shopping", count: 60 },
];

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
        "flex flex-col relative overflow-hidden h-full",
        // MOBILE
        "py-6 px-0 bg-transparent border-none shadow-none",
        // DESKTOP
        "md:p-6 md:rounded-2xl md:shadow-sm md:backdrop-blur-md",
        "md:bg-blue-950/5 dark:md:bg-blue-950/40",
        "md:border md:border-blue-900/10 dark:md:border-blue-800/30",
        className,
      )}
    >
      <div className="flex items-center gap-3 mb-6 px-4 md:px-0">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Comparativo por Loja
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Volume de arquivos salvos por filial.
          </p>
        </div>
      </div>

      <div className="flex-1 w-full h-[250px] min-h-[250px] relative px-4 md:px-0">
        {/* Overlay de Bloqueio */}
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
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e4e4e7"
                className="dark:stroke-zinc-800/50"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#71717a" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#71717a" }}
                allowDecimals={false}
              />
              {!isBlocked && (
                <Tooltip
                  cursor={{ fill: "rgba(99, 102, 241, 0.1)" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                  labelStyle={{ fontWeight: 600, color: "#27272a" }}
                  itemStyle={{ fontWeight: 600, color: "#6366f1" }}
                />
              )}
              <Bar dataKey="count" name="Arquivos" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill="#6366f1"
                    fillOpacity={isBlocked ? 0.3 : 0.9}
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
