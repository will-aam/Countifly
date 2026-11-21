// components/dashboard/history-chart.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
  BarChart,
  ResponsiveContainer,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MONTHS_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MONTHS_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

interface HistoryChartProps {
  data?: {
    label: string;
    count: number;
  }[];
  rawHistory?: {
    created_at: string | Date;
  }[];
  className?: string;
}

export function HistoryChart({ data, rawHistory, className }: HistoryChartProps) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // 1. Extração inteligente dos anos que realmente contêm dados (Seção solicitada)
  const availableYears = useMemo(() => {
    if (!rawHistory || rawHistory.length === 0) {
      return [currentYear];
    }

    const yearsSet = new Set<number>();
    rawHistory.forEach((item) => {
      const d = new Date(item.created_at);
      const yr = d.getFullYear();
      if (!isNaN(yr)) yearsSet.add(yr);
    });

    if (yearsSet.size === 0) {
      yearsSet.add(currentYear);
    }

    // Ordenação cronológica crescente: ex [2024, 2026]
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [rawHistory, currentYear]);

  // Ano selecionado (inicia no ano atual se houver dados, senão no ano mais recente com dados)
  const defaultYear = availableYears.includes(currentYear)
    ? currentYear
    : availableYears[availableYears.length - 1];

  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sincroniza estado caso availableYears mude
  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(
        availableYears.includes(currentYear)
          ? currentYear
          : availableYears[availableYears.length - 1]
      );
    }
  }, [availableYears, currentYear, selectedYear]);

  // Controles de navegação: índice do ano selecionado
  const currentIndex = availableYears.indexOf(selectedYear);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < availableYears.length - 1 && currentIndex !== -1;

  const handlePrevYear = () => {
    if (canGoPrev) {
      setSelectedYear(availableYears[currentIndex - 1]);
    }
  };

  const handleNextYear = () => {
    if (canGoNext) {
      setSelectedYear(availableYears[currentIndex + 1]);
    }
  };

  // 2. Consolidação mensal dos inventários para o ano selecionado
  const chartData = useMemo(() => {
    if (rawHistory && rawHistory.length > 0) {
      const countsPerMonth = new Array(12).fill(0);
      rawHistory.forEach((item) => {
        const d = new Date(item.created_at);
        if (d.getFullYear() === selectedYear) {
          const m = d.getMonth();
          if (m >= 0 && m < 12) {
            countsPerMonth[m] += 1;
          }
        }
      });

      return MONTHS_SHORT.map((label, idx) => ({
        label,
        monthIndex: idx,
        fullName: MONTHS_NAMES[idx],
        count: countsPerMonth[idx],
      }));
    }

    // Fallback para quando receber data diretamente
    return (data || []).map((d, idx) => ({
      label: d.label,
      monthIndex: idx,
      fullName: MONTHS_NAMES[idx] || d.label,
      count: d.count,
    }));
  }, [rawHistory, data, selectedYear]);

  // Total do ano
  const totalCountsYear = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0);
  }, [chartData]);

  const hasData = totalCountsYear > 0;

  return (
    <div
      className={cn(
        "flex flex-col h-[340px]",
        "p-4 sm:p-5 rounded-2xl",
        "bg-white dark:bg-zinc-900/60",
        "border border-zinc-200/80 dark:border-zinc-800/60",
        "shadow-xs",
        className
      )}
    >
      {/* Header com Título e Seletor de Ano Inteligente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 shrink-0">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
            Evolução de Inventários
          </h3>
          <p className="text-xs text-muted-foreground">
            {hasData ? (
              <span>
                <strong>{totalCountsYear}</strong> {totalCountsYear === 1 ? "inventário realizado" : "inventários realizados"} em {selectedYear}
              </span>
            ) : (
              <span>Nenhum inventário registrado em {selectedYear}</span>
            )}
          </p>
        </div>

        {/* Seletor de Ano Inteligente (Seta Esquerda - Ano Central - Seta Direita) */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevYear}
            disabled={!canGoPrev}
            className="h-7 w-7 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
            title={canGoPrev ? `Ir para ${availableYears[currentIndex - 1]}` : "Sem dados em anos anteriores"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center px-2.5 py-0.5 min-w-[50px] justify-center text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
            <span>{selectedYear}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextYear}
            disabled={!canGoNext}
            className="h-7 w-7 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
            title={canGoNext ? `Ir para ${availableYears[currentIndex + 1]}` : "Sem dados em anos posteriores"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chart Responsivo com Recharts */}
      <div className="flex-1 relative w-full min-h-0">
        {!hasData && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300 bg-white/95 dark:bg-zinc-900/95 px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xs">
              Nenhum inventário realizado em {selectedYear}
            </span>
          </div>
        )}

        {isMounted && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
          >
            <defs>
              {/* Gradiente Azul para Transparente */}
              <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.15} />
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
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#a1a1aa" }}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  const count = item.count;

                  return (
                    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-2.5 px-3 shadow-lg text-xs space-y-1">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        <span>{item.fullName} de {selectedYear}</span>
                      </div>
                      <div className="text-zinc-600 dark:text-zinc-300 font-medium">
                        <strong className="text-primary font-mono text-sm">{count}</strong>{" "}
                        {count === 1 ? "contagem realizada" : "contagens realizadas"}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: "rgba(59, 130, 246, 0.06)", radius: 6 }}
            />
            <Bar
              dataKey="count"
              fill="url(#colorHist)"
              radius={[6, 6, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
