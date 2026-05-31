// components/dashboard/history-chart.tsx
"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoryChartProps {
  data: {
    label: string;
    count: number;
  }[];
  className?: string;
}

export function HistoryChart({ data, className }: HistoryChartProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        // MOBILE (Padrão): Chapado na tela, sem fundo, sem borda e sem padding lateral
        "py-6 px-0 bg-transparent border-none shadow-none",
        // DESKTOP (md:): Volta o estilo de card "vidrado" e o padding completo
        "md:p-6 md:rounded-2xl md:shadow-sm md:backdrop-blur-md",
        "md:bg-blue-950/5 dark:md:bg-blue-950/40",
        "md:border md:border-blue-900/10 dark:md:border-blue-800/30",
        className,
      )}
    >
      {/* O px-4 md:px-0 garante que o título não cole na borda da tela no celular, 
          mas fique alinhado normalmente dentro do card no desktop */}
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

      <div className="flex-1 w-full h-[250px] min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          {/* A margem esquerda negativa (left: -20) puxa os números do eixo Y para mais perto da borda, ganhando ainda mais espaço útil no celular */}
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              cursor={{
                stroke: "#3b82f6",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="Arquivos Salvos"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCount)"
              activeDot={{ r: 6, strokeWidth: 0, fill: "#3b82f6" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
