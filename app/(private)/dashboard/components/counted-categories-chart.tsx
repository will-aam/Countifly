// components/dashboard/counted-categories-chart.tsx
"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ChevronRight } from "lucide-react";
import type { CountedItemData } from "@/lib/dashboard-counted-categories";

const MONTHS_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

interface CountedCategoriesChartProps {
  data: CountedItemData[];
  className?: string;
}

export function CountedCategoriesChart({ data, className }: CountedCategoriesChartProps) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [open, setOpen] = useState(false);

  // 1. Extração dinâmica de anos que possuem dados reais
  const availableYears = useMemo(() => {
    if (!data || data.length === 0) return [currentYear];
    const years = Array.from(new Set(data.map((item) => item.year))).sort((a, b) => b - a);
    return years.length > 0 ? years : [currentYear];
  }, [data, currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [viewType, setViewType] = useState<"categoria" | "subcategoria">("categoria");

  // 2. Meses disponíveis especificamente para o ano selecionado (apenas meses com dados reais)
  const availableMonths = useMemo(() => {
    if (!data || data.length === 0) return [];
    const monthsSet = new Set<number>();
    data.forEach((item) => {
      if (item.year === selectedYear) {
        monthsSet.add(item.month);
      }
    });
    return Array.from(monthsSet).sort((a, b) => a - b);
  }, [data, selectedYear]);

  // Se o mês selecionado não estiver nos meses disponíveis do novo ano, reseta para "all"
  React.useEffect(() => {
    if (selectedMonth !== "all") {
      const monthNum = parseInt(selectedMonth, 10);
      if (!availableMonths.includes(monthNum)) {
        setSelectedMonth("all");
      }
    }
  }, [availableMonths, selectedMonth]);

  // 3. Filtragem e agregação dos dados
  const aggregatedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const monthNum = selectedMonth === "all" ? null : parseInt(selectedMonth, 10);

    const filtered = data.filter((item) => {
      if (item.year !== selectedYear) return false;
      if (monthNum !== null && item.month !== monthNum) return false;
      return true;
    });

    const map = new Map<string, number>();

    filtered.forEach((item) => {
      const key = viewType === "categoria" ? item.categoria : item.subcategoria;
      if (!key || key.trim() === "") return;
      const current = map.get(key) || 0;
      map.set(key, current + item.quantidade);
    });

    // Remove entradas com contagem zero ou negativa
    const result: Array<{ name: string; count: number }> = [];
    map.forEach((count, name) => {
      if (count > 0) {
        result.push({ name, count });
      }
    });

    return result.sort((a, b) => b.count - a.count);
  }, [data, selectedYear, selectedMonth, viewType]);

  const totalPeriodCount = useMemo(() => {
    return aggregatedData.reduce((acc, curr) => acc + curr.count, 0);
  }, [aggregatedData]);

  const topCategory = aggregatedData.length > 0 ? aggregatedData[0] : null;
  const top5 = aggregatedData.slice(0, 5);
  const hasMore = aggregatedData.length > 5;

  const renderBarItem = (item: { name: string; count: number }, index: number) => {
    const percent = totalPeriodCount > 0 ? Math.round((item.count / totalPeriodCount) * 100) : 0;

    return (
      <div key={item.name} className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            <span className="font-mono text-[10px] text-muted-foreground w-3.5 shrink-0">
              {index + 1}.
            </span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
              {item.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-mono text-muted-foreground">
              {item.count.toLocaleString("pt-BR")} un
            </span>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 py-0.5 px-1.5 rounded">
              {percent}%
            </span>
          </div>
        </div>
        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out bg-blue-600 dark:bg-blue-500"
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        </div>
      </div>
    );
  };

  const allBarsList = (
    <ScrollArea className="h-[55vh] pr-3 mt-2">
      <div className="flex flex-col gap-4 py-1 pr-1">
        {aggregatedData.map((item, idx) => renderBarItem(item, idx))}
      </div>
    </ScrollArea>
  );

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
      {/* Header com Título e Filtros Minimalistas */}
      <div className="flex flex-col gap-2.5 mb-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
              Categorias Contadas
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {topCategory ? (
                <span>
                  Mais contada: <strong className="text-foreground">{topCategory.name}</strong> ({topCategory.count.toLocaleString("pt-BR")} un)
                </span>
              ) : (
                "Ranking por volume de itens contados"
              )}
            </p>
          </div>

          {/* Modal / Drawer Ver Todas */}
          {hasMore &&
            (isDesktop ? (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] font-medium text-blue-600 dark:text-blue-400 gap-1 px-2 hover:bg-blue-500/10 rounded-md"
                  >
                    Ver todas ({aggregatedData.length})
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                  <DialogHeader>
                    <DialogTitle className="text-zinc-900 dark:text-zinc-100 text-sm font-bold">
                      {viewType === "categoria" ? "Todas as Categorias Contadas" : "Todas as Subcategorias Contadas"}
                    </DialogTitle>
                  </DialogHeader>
                  {allBarsList}
                </DialogContent>
              </Dialog>
            ) : (
              <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] font-medium text-blue-600 dark:text-blue-400 gap-1 px-2 hover:bg-blue-500/10 rounded-md"
                  >
                    Ver todas ({aggregatedData.length})
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-4 pb-8">
                  <DrawerHeader className="px-0 pt-4 pb-3">
                    <DrawerTitle className="text-zinc-900 dark:text-zinc-100 text-sm font-bold">
                      {viewType === "categoria" ? "Todas as Categorias Contadas" : "Todas as Subcategorias Contadas"}
                    </DrawerTitle>
                  </DrawerHeader>
                  {allBarsList}
                </DrawerContent>
              </Drawer>
            ))}
        </div>

        {/* Linha de Filtros Discretos: Alternador Categoria/Subcategoria + Mês + Ano */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
          {/* Segmented Control Categoria / Subcategoria */}
          <div className="inline-flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-border/50 text-[11px]">
            <button
              type="button"
              onClick={() => setViewType("categoria")}
              className={cn(
                "px-2.5 py-0.5 rounded-md font-medium transition-all cursor-pointer",
                viewType === "categoria"
                  ? "bg-white dark:bg-zinc-900 text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Categorias
            </button>
            <button
              type="button"
              onClick={() => setViewType("subcategoria")}
              className={cn(
                "px-2.5 py-0.5 rounded-md font-medium transition-all cursor-pointer",
                viewType === "subcategoria"
                  ? "bg-white dark:bg-zinc-900 text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Subcategorias
            </button>
          </div>

          {/* Seletores de Mês e Ano */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-6 rounded-md border border-input bg-background px-2 text-[11px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="all">Todos os meses</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {MONTHS_NAMES[m - 1]}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-6 rounded-md border border-input bg-background px-2 text-[11px] font-mono font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Conteúdo: Lista Top 5 ou Estado Vazio */}
      <div className="flex flex-col justify-center gap-3.5 flex-1 min-h-0">
        {top5.length > 0 ? (
          top5.map((item, idx) => renderBarItem(item, idx))
        ) : (
          <div className="flex flex-col items-center justify-center h-full border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Nenhuma categoria contabilizada no período selecionado.
            </span>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
              Os dados aparecerão aqui conforme os inventários forem realizados.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
