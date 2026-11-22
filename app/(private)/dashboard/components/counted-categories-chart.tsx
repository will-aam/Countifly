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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ChevronRight, Layers, Search } from "lucide-react";
import type { CountedItemData } from "@/lib/dashboard-counted-categories";

const MONTHS_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MONTHS_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

interface CountedCategoriesChartProps {
  data: CountedItemData[];
  className?: string;
}

export function CountedCategoriesChart({ data, className }: CountedCategoriesChartProps) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [open, setOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");

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

  // Filtragem da lista do modal/drawer
  const modalFilteredData = useMemo(() => {
    if (!modalSearch.trim()) return aggregatedData;
    const q = modalSearch.toLowerCase();
    return aggregatedData.filter((i) => i.name.toLowerCase().includes(q));
  }, [aggregatedData, modalSearch]);

  const renderRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-xs">
          1
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0">
          2
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-[10px] flex items-center justify-center shrink-0">
          3
        </span>
      );
    }
    return (
      <span className="w-5 h-5 rounded-md bg-transparent text-zinc-400 dark:text-zinc-500 font-medium text-[10px] flex items-center justify-center shrink-0">
        {index + 1}
      </span>
    );
  };

  const renderBarItem = (item: { name: string; count: number }, index: number, isModal = false) => {
    const percent = totalPeriodCount > 0 ? Math.round((item.count / totalPeriodCount) * 100) : 0;

    return (
      <div
        key={item.name}
        className={cn(
          "group flex flex-col gap-1.5 transition-colors",
          !isModal && "p-1.5 -mx-1.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
        )}
      >
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            {renderRankBadge(index)}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate text-[12px]">
              {item.name}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
              {item.count.toLocaleString("pt-BR")}{" "}
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">un</span>
            </span>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 py-0.5 px-1.5 rounded-md tabular-nums">
              {percent}%
            </span>
          </div>
        </div>

        {/* Barra de Progresso com Gradiente */}
        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-500 dark:to-indigo-400 transition-all duration-500 ease-out"
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        </div>
      </div>
    );
  };

  const allBarsList = (
    <div className="space-y-3 pt-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
        <Input
          placeholder={`Buscar ${viewType}...`}
          value={modalSearch}
          onChange={(e) => setModalSearch(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 px-1">
        <span>{modalFilteredData.length} registros</span>
        <span>Total: {totalPeriodCount.toLocaleString("pt-BR")} un</span>
      </div>

      <ScrollArea className="h-[50vh] pr-2">
        <div className="flex flex-col gap-3 py-1">
          {modalFilteredData.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Nenhuma correspondência encontrada.
            </div>
          ) : (
            modalFilteredData.map((item, idx) => renderBarItem(item, idx, true))
          )}
        </div>
      </ScrollArea>
    </div>
  );

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
      {/* Header com Título e Ação */}
      <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
        <div className="space-y-0.5 min-w-0">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
            Categorias Contadas
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {topCategory ? (
              <span>
                Líder: <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{topCategory.name}</strong> ({topCategory.count.toLocaleString("pt-BR")} un)
              </span>
            ) : (
              "Ranking por volume de itens contados"
            )}
          </p>
        </div>

        {/* Botão Ver Todas */}
        {hasMore &&
          (isDesktop ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs font-semibold text-blue-600 dark:text-blue-400 gap-1 px-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg shrink-0"
                >
                  Ver todas ({aggregatedData.length})
                  <ChevronRight className="h-3.5 w-3.5" />
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
                  className="h-7 text-xs font-semibold text-blue-600 dark:text-blue-400 gap-1 px-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg shrink-0"
                >
                  Ver todas ({aggregatedData.length})
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-4 pb-8">
                <DrawerHeader className="px-0 pt-4 pb-2">
                  <DrawerTitle className="text-zinc-900 dark:text-zinc-100 text-sm font-bold">
                    {viewType === "categoria" ? "Todas as Categorias Contadas" : "Todas as Subcategorias Contadas"}
                  </DrawerTitle>
                </DrawerHeader>
                {allBarsList}
              </DrawerContent>
            </Drawer>
          ))}
      </div>

      {/* Barra de Filtros Minimalista */}
      <div className="flex items-center justify-between gap-2 mb-4 shrink-0">
        {/* Alternador Segmentado */}
        <div className="inline-flex p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60">
          <button
            type="button"
            onClick={() => setViewType("categoria")}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
              viewType === "categoria"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            )}
          >
            Categorias
          </button>
          <button
            type="button"
            onClick={() => setViewType("subcategoria")}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
              viewType === "subcategoria"
                ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            )}
          >
            Subcategorias
          </button>
        </div>

        {/* Seletores Discretos com shadcn Select */}
        <div className="flex items-center gap-1.5">
          {/* Mês */}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-7 text-[11px] font-medium border-zinc-200 dark:border-zinc-700/80 px-2 gap-1 min-w-[95px] max-w-[115px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent align="end" className="text-xs">
              <SelectItem value="all" className="text-xs">
                Todos os meses
              </SelectItem>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={String(m)} className="text-xs">
                  {MONTHS_NAMES[m - 1]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Ano */}
          <Select
            value={String(selectedYear)}
            onValueChange={(val) => setSelectedYear(Number(val))}
          >
            <SelectTrigger className="h-7 text-[11px] font-medium font-mono border-zinc-200 dark:border-zinc-700/80 px-2 gap-1 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="text-xs">
              {availableYears.map((yr) => (
                <SelectItem key={yr} value={String(yr)} className="text-xs font-mono">
                  {yr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conteúdo: Lista Top 5 ou Estado Vazio */}
      <div className="flex flex-col justify-center flex-1 min-h-0">
        {top5.length > 0 ? (
          <div className="flex flex-col justify-around h-full py-1">
            {top5.map((item, idx) => renderBarItem(item, idx))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full border border-dashed border-zinc-200/80 dark:border-zinc-800 rounded-xl p-4 text-center">
            <div className="p-2.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-2">
              <Layers className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Nenhuma contagem no período
            </span>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-[210px] leading-relaxed">
              Alterne o mês ou ano, ou realize novos inventários para visualizar o ranking.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
