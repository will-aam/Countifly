"use client";

// app/(private)/dashboard/components/mobile-dashboard.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  PieChart as PieChartIcon,
  ArrowUpRight,
  UploadCloud,
  LayoutGrid,
  Database,
  FileText,
  Building2,
  Tag,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileHistoryEntry {
  created_at: string;
  bucket: "erp" | "modular" | "other";
}

export interface MobileDashboardProps {
  history: MobileHistoryEntry[];
  movementDates: string[];
  hourlyProductivity: { hour: string; count: number }[];
  companies: { name: string; count: number }[];
  globalCatalogCount: number;
  categoryCount: number;
  subcategoryCount: number;
  perms: {
    importacao: boolean;
    modular: boolean;
    sala: boolean;
    livre: boolean;
    empresa: boolean;
  };
}

type Period = "day" | "week" | "month" | "year";

interface ChartPoint {
  label: string;
  fullLabel: string;
  total: number;
  erp: number;
  modular: number;
  other: number;
}

const MONTHS_SHORT = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
];

const MONTHS_FULL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const DUMMY_PRODUCTIVITY: { hour: string; count: number }[] = [
  { hour: "0h", count: 0 },
  { hour: "1h", count: 0 },
  { hour: "2h", count: 0 },
  { hour: "3h", count: 0 },
  { hour: "4h", count: 0 },
  { hour: "5h", count: 0 },
  { hour: "6h", count: 8 },
  { hour: "7h", count: 24 },
  { hour: "8h", count: 85 },
  { hour: "9h", count: 132 },
  { hour: "10h", count: 148 },
  { hour: "11h", count: 118 },
  { hour: "12h", count: 42 },
  { hour: "13h", count: 65 },
  { hour: "14h", count: 126 },
  { hour: "15h", count: 140 },
  { hour: "16h", count: 108 },
  { hour: "17h", count: 72 },
  { hour: "18h", count: 35 },
  { hour: "19h", count: 12 },
  { hour: "20h", count: 0 },
  { hour: "21h", count: 0 },
  { hour: "22h", count: 0 },
  { hour: "23h", count: 0 },
];

const DUMMY_COMPANIES: { name: string; count: number }[] = [
  { name: "Matriz Centro", count: 120 },
  { name: "Filial Sul", count: 85 },
  { name: "Unidade Norte", count: 60 },
];

const COMPANY_BAR_COLORS = ["#2563eb", "#3b82f6", "#64748b", "#94a3b8"];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
) {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const largeArcFlag = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function MobileDashboard({
  history,
  movementDates,
  hourlyProductivity,
  companies,
  globalCatalogCount,
  categoryCount,
  subcategoryCount,
  perms,
}: MobileDashboardProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDark = isMounted && resolvedTheme === "dark";

  // Cores fiéis à paleta Countifly
  const palette = useMemo(
    () => ({
      erp: "#2563eb",
      modular: isDark ? "#60a5fa" : "#1e293b",
      other: isDark ? "#475569" : "#94a3b8",
    }),
    [isDark],
  );

  // Totais gerais para o card superior (Meia-Pizza)
  const overallCounts = useMemo(() => {
    let erp = 0;
    let modular = 0;
    let other = 0;
    for (const item of history) {
      if (item.bucket === "erp") erp += 1;
      else if (item.bucket === "modular") modular += 1;
      else other += 1;
    }
    return {
      erp,
      modular,
      other,
      total: erp + modular + other,
    };
  }, [history]);

  // Define período inicial inteligente: "Mês" se houver registros no mês atual, senão "Ano"
  const hasCurrentMonthData = useMemo(() => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth();
    return history.some((item) => {
      const d = new Date(item.created_at);
      return d.getFullYear() === yr && d.getMonth() === mo;
    });
  }, [history]);

  const [period, setPeriod] = useState<Period>(
    hasCurrentMonthData ? "month" : "year",
  );

  // Dados filtrados e série para o gráfico inferior (Open Canvas)
  const { periodCounts, series } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );

    if (period === "day") {
      const buckets: ChartPoint[] = Array.from({ length: 24 }).map((_, h) => ({
        label: `${String(h).padStart(2, "0")}h`,
        fullLabel: `Hoje às ${String(h).padStart(2, "0")}:00`,
        total: 0,
        erp: 0,
        modular: 0,
        other: 0,
      }));

      let erp = 0;
      let modular = 0;
      let other = 0;

      for (const item of history) {
        const d = new Date(item.created_at);
        if (d >= startOfToday) {
          const h = d.getHours();
          buckets[h].total += 1;
          buckets[h][item.bucket] += 1;
          if (item.bucket === "erp") erp += 1;
          else if (item.bucket === "modular") modular += 1;
          else other += 1;
        }
      }

      // Se não houve fechamento salvo hoje, reflete as bipagens de sala do dia no gráfico horário
      if (erp + modular + other === 0 && movementDates.length > 0) {
        for (const iso of movementDates) {
          const d = new Date(iso);
          if (d >= startOfToday) {
            const h = d.getHours();
            buckets[h].total += 1;
            buckets[h].other += 1;
            other += 1;
          }
        }
      }

      return {
        periodCounts: { erp, modular, other, total: erp + modular + other },
        series: buckets,
      };
    }

    if (period === "week") {
      const days: { date: Date; key: string }[] = [];
      for (let i = 6; i >= 0; i -= 1) {
        const d = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - i,
        );
        days.push({
          date: d,
          key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        });
      }

      const map = new Map<string, ChartPoint>();
      days.forEach(({ date, key }) => {
        map.set(key, {
          label: WEEKDAYS_SHORT[date.getDay()],
          fullLabel: date.toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          total: 0,
          erp: 0,
          modular: 0,
          other: 0,
        });
      });

      let erp = 0;
      let modular = 0;
      let other = 0;

      for (const item of history) {
        const d = new Date(item.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const point = map.get(key);
        if (point) {
          point.total += 1;
          point[item.bucket] += 1;
          if (item.bucket === "erp") erp += 1;
          else if (item.bucket === "modular") modular += 1;
          else other += 1;
        }
      }

      return {
        periodCounts: { erp, modular, other, total: erp + modular + other },
        series: Array.from(map.values()),
      };
    }

    if (period === "month") {
      const yr = now.getFullYear();
      const mo = now.getMonth();
      const daysInMonth = new Date(yr, mo + 1, 0).getDate();
      const buckets: ChartPoint[] = Array.from({ length: daysInMonth }).map(
        (_, i) => {
          const dayNum = i + 1;
          return {
            label: String(dayNum).padStart(2, "0"),
            fullLabel: `${dayNum} de ${MONTHS_FULL[mo]} de ${yr}`,
            total: 0,
            erp: 0,
            modular: 0,
            other: 0,
          };
        },
      );

      let erp = 0;
      let modular = 0;
      let other = 0;

      for (const item of history) {
        const d = new Date(item.created_at);
        if (d.getFullYear() === yr && d.getMonth() === mo) {
          const idx = d.getDate() - 1;
          if (buckets[idx]) {
            buckets[idx].total += 1;
            buckets[idx][item.bucket] += 1;
          }
          if (item.bucket === "erp") erp += 1;
          else if (item.bucket === "modular") modular += 1;
          else other += 1;
        }
      }

      return {
        periodCounts: { erp, modular, other, total: erp + modular + other },
        series: buckets,
      };
    }

    // "year"
    const yr = now.getFullYear();
    const buckets: ChartPoint[] = MONTHS_SHORT.map((shortLabel, idx) => ({
      label: shortLabel,
      fullLabel: `${MONTHS_FULL[idx]} de ${yr}`,
      total: 0,
      erp: 0,
      modular: 0,
      other: 0,
    }));

    let erp = 0;
    let modular = 0;
    let other = 0;

    for (const item of history) {
      const d = new Date(item.created_at);
      if (d.getFullYear() === yr) {
        const m = d.getMonth();
        if (buckets[m]) {
          buckets[m].total += 1;
          buckets[m][item.bucket] += 1;
        }
        if (item.bucket === "erp") erp += 1;
        else if (item.bucket === "modular") modular += 1;
        else other += 1;
      }
    }

    return {
      periodCounts: { erp, modular, other, total: erp + modular + other },
      series: buckets,
    };
  }, [history, movementDates, period]);

  // Geometria dos arcos do semicírculo autoral Countifly (180°: -180° a 0°)
  const gaugeSegments = useMemo(() => {
    const startAngle = -180;
    const totalSweep = 180;
    const cx = 110;
    const cy = 108;
    const r = 82;

    const entries = [
      {
        key: "erp" as const,
        label: "Planilha ERP",
        count: overallCounts.erp,
        color: palette.erp,
      },
      {
        key: "modular" as const,
        label: "Modular",
        count: overallCounts.modular,
        color: palette.modular,
      },
      {
        key: "other" as const,
        label: "Livre / Sala",
        count: overallCounts.other,
        color: palette.other,
      },
    ];

    const emptyTrackD = describeArc(cx, cy, r, startAngle, startAngle + totalSweep);
    const dottedTrackD = describeArc(cx, cy, 66, startAngle, startAngle + totalSweep);

    const active = entries.filter((e) => e.count > 0);
    if (active.length === 0 || overallCounts.total === 0) {
      return {
        entries,
        arcs: [] as Array<{
          key: string;
          d: string;
          color: string;
        }>,
        emptyTrackD,
        dottedTrackD,
      };
    }

    const gapDeg = active.length > 1 ? 5 : 0;
    const usableSweep = totalSweep - gapDeg * (active.length - 1);

    const rawSpans = active.map((e) =>
      Math.max(6, (e.count / overallCounts.total) * usableSweep),
    );
    const spanSum = rawSpans.reduce((a, b) => a + b, 0);
    const scale = usableSweep / spanSum;

    let cursor = startAngle;
    const arcs = active.map((seg, idx) => {
      const span = rawSpans[idx] * scale;
      const d = describeArc(cx, cy, r, cursor, cursor + span);
      cursor += span + gapDeg;
      return {
        key: seg.key,
        d,
        color: seg.color,
      };
    });

    return {
      entries,
      arcs,
      emptyTrackD,
      dottedTrackD,
    };
  }, [overallCounts, palette]);

  // Atalhos rápidos (3 colunas) respeitando permissões
  const quickActions = useMemo(() => {
    const firstAction = perms.importacao
      ? {
          label: "Planilha\nERP",
          href: "/count-import",
          icon: UploadCloud,
        }
      : perms.modular
        ? {
            label: "Contagem\nModular",
            href: "/mixed-inventory",
            icon: LayoutGrid,
          }
        : {
            label: "Contagem\nLivre",
            href: "/audit",
            icon: Database,
          };

    const thirdAction = perms.empresa
      ? {
          label: "Gestão de\nEmpresas",
          href: "/settings-companies",
          icon: Building2,
        }
      : {
          label: "Gerador de\nEtiquetas",
          href: "/internal-tools/labels",
          icon: Tag,
        };

    return [
      firstAction,
      {
        label: "Relatórios e\nHistórico",
        href: "/history",
        icon: FileText,
      },
      thirdAction,
    ];
  }, [perms]);

  const miniTiles = useMemo(() => {
    const total = Math.max(periodCounts.total, 1);
    return [
      {
        key: "erp",
        label: "Planilha ERP",
        count: periodCounts.erp,
        pct: periodCounts.total > 0 ? Math.round((periodCounts.erp / total) * 100) : 0,
        color: palette.erp,
      },
      {
        key: "modular",
        label: "Modular",
        count: periodCounts.modular,
        pct:
          periodCounts.total > 0
            ? Math.round((periodCounts.modular / total) * 100)
            : 0,
        color: palette.modular,
      },
      {
        key: "other",
        label: "Livre / Sala",
        count: periodCounts.other,
        pct:
          periodCounts.total > 0 ? Math.round((periodCounts.other / total) * 100) : 0,
        color: palette.other,
      },
    ];
  }, [periodCounts, palette]);

  // Métricas derivadas para Ritmo de Produtividade e Comparativo por Loja
  const { totalReadings, peakHour } = useMemo(() => {
    let total = 0;
    let peak = { hour: "0h", count: 0 };
    for (const item of hourlyProductivity) {
      total += item.count;
      if (item.count > peak.count) {
        peak = item;
      }
    }
    return { totalReadings: total, peakHour: peak };
  }, [hourlyProductivity]);

  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => b.count - a.count),
    [companies],
  );

  const displayCompanies = perms.empresa ? sortedCompanies : DUMMY_COMPANIES;
  const maxCompanyCount = Math.max(
    ...displayCompanies.map((c) => c.count),
    1,
  );
  const totalCompanyCount = displayCompanies.reduce(
    (acc, c) => acc + c.count,
    0,
  );

  const periodTabs: { id: Period; label: string }[] = [
    { id: "day", label: "Dia" },
    { id: "week", label: "Semana" },
    { id: "month", label: "Mês" },
    { id: "year", label: "Ano" },
  ];

  return (
    <div className="space-y-4 pb-4">
      {/* ─── BLOCO 1: CARD MEIA-PIZZA + RESUMO LATERAL ─── */}
      <section className="rounded-3xl bg-white dark:bg-zinc-900/80 border border-zinc-200/70 dark:border-zinc-800/70 shadow-xs overflow-hidden">
        <div className="grid grid-cols-[1.35fr_1fr] divide-x divide-zinc-100 dark:divide-zinc-800/80">
          {/* Esquerda: Meia Pizza com centro */}
          <div className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-zinc-900 text-white dark:bg-primary dark:text-primary-foreground flex items-center justify-center shrink-0">
                <PieChartIcon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                Resumo Geral
              </span>
            </div>

            <div className="relative mt-2 flex items-center justify-center">
              <svg
                viewBox="0 0 220 124"
                className="w-full max-w-[205px] h-auto overflow-visible"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="cf-arc-primary" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>

                {/* Trilha de fundo contínua sutil */}
                <path
                  d={gaugeSegments.emptyTrackD}
                  fill="none"
                  stroke={isDark ? "#27272a" : "#eef2f6"}
                  strokeWidth="11"
                  strokeLinecap="butt"
                />

                {/* Arco interno pontilhado de precisão */}
                <path
                  d={gaugeSegments.dottedTrackD}
                  fill="none"
                  stroke={isDark ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.38)"}
                  strokeWidth="1.25"
                  strokeDasharray="1.5 5.5"
                />

                {gaugeSegments.arcs.map((arc) => (
                  <path
                    key={arc.key}
                    d={arc.d}
                    fill="none"
                    stroke={arc.key === "erp" ? "url(#cf-arc-primary)" : arc.color}
                    strokeWidth="11"
                    strokeLinecap="butt"
                  />
                ))}
              </svg>

              <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums leading-none">
                  {overallCounts.total.toLocaleString("pt-BR")}
                </span>
                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mt-1">
                  Total Contagens
                </span>
              </div>
            </div>
          </div>

          {/* Direita: 3 linhas divididas */}
          <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {gaugeSegments.entries.map((entry) => (
              <div
                key={entry.key}
                className="flex-1 flex items-center gap-2.5 px-3 py-2.5 min-w-0"
              >
                <span
                  className="w-1 h-7 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate leading-tight">
                    {entry.label}
                  </p>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums mt-0.5 leading-tight">
                    {entry.count.toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BLOCO 2: BARRA DE AÇÕES RÁPIDAS (3 COLUNAS) ─── */}
      <section className="rounded-3xl bg-white dark:bg-zinc-900/80 border border-zinc-200/70 dark:border-zinc-800/70 shadow-xs grid grid-cols-3 divide-x divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.href}
              type="button"
              onClick={() => router.push(action.href)}
              className="flex flex-col items-center justify-center py-4 px-2 text-center active:bg-zinc-50 dark:active:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              <div className="h-9 w-9 rounded-full bg-zinc-900 text-white dark:bg-primary dark:text-primary-foreground flex items-center justify-center mb-2 shadow-2xs">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 leading-tight whitespace-pre-line">
                {action.label}
              </span>
            </button>
          );
        })}
      </section>

      {/* ─── BLOCO 3: EVOLUÇÃO ABERTA NA TELA (SEM CARD ENVOLVENDO) ─── */}
      <section className="space-y-4 pt-3">
        {/* Número Hero Centralizado */}
        <div className="flex flex-col items-center text-center">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Evolução de Contagens
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums leading-none">
              {periodCounts.total.toLocaleString("pt-BR")}
            </span>
            <button
              type="button"
              onClick={() => router.push("/history")}
              aria-label="Abrir histórico completo"
              title="Ver histórico completo"
              className="relative overflow-visible inline-flex h-6 w-6 items-center justify-center rounded-full border border-blue-500/40 dark:border-blue-400/40 bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/15 dark:hover:bg-blue-500/25 active:scale-95 transition-all cursor-pointer cf-arrow-ember"
            >
              {/* Fumaça azul sutil subindo */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-1 left-1 w-3 h-3 rounded-full bg-blue-400/35 dark:bg-blue-400/25 blur-[3.5px] cf-smoke-wisp-1"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-blue-300/35 dark:bg-blue-300/25 blur-[3px] cf-smoke-wisp-2"
              />

              {/* Brasas e faíscas azuis sutis */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-0.5 left-1.5 w-[2.5px] h-[2.5px] rounded-full bg-blue-400 shadow-[0_0_4px_rgba(59,130,246,0.75)] cf-ember-spark-1"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0.5 right-0.5 w-[2px] h-[2px] rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.75)] cf-ember-spark-2"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-1 right-2 w-[2.5px] h-[2.5px] rounded-full bg-sky-400 shadow-[0_0_4px_rgba(56,189,248,0.75)] cf-ember-spark-3"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1 left-0.5 w-[2px] h-[2px] rounded-full bg-blue-300 shadow-[0_0_4px_rgba(96,165,250,0.75)] cf-ember-spark-4"
              />

              <ArrowUpRight className="relative z-10 h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 3 Mini Tiles Suaves */}
        <div className="grid grid-cols-3 gap-2">
          {miniTiles.map((tile) => (
            <div
              key={tile.key}
              className="rounded-2xl bg-white/95 dark:bg-zinc-900/75 border border-zinc-200/60 dark:border-zinc-800/70 px-2.5 py-3 flex flex-col items-center text-center shadow-2xs"
            >
              <span
                className="w-5 h-0.5 rounded-full mb-2"
                style={{ backgroundColor: tile.color }}
              />
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 truncate w-full">
                {tile.label}
              </span>
              <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums mt-1 leading-tight">
                {tile.count.toLocaleString("pt-BR")}
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {tile.count === 1 ? "registro" : "registros"}
              </span>

              <div
                className="w-full h-2 rounded-full overflow-hidden mt-2.5"
                style={{
                  backgroundColor: isDark
                    ? "rgba(148,163,184,0.12)"
                    : "rgba(148,163,184,0.1)",
                  backgroundImage:
                    "repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(148,163,184,0.22) 3px, rgba(148,163,184,0.22) 5px)",
                }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${tile.count > 0 ? Math.max(8, tile.pct) : 0}%`,
                    backgroundColor: tile.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Tabs de Período em Formato Pill */}
        <div className="rounded-full bg-white/95 dark:bg-zinc-900/80 border border-zinc-200/70 dark:border-zinc-800/70 p-1 grid grid-cols-4 gap-1 shadow-2xs">
          {periodTabs.map((tab) => {
            const isActive = period === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriod(tab.id)}
                className={cn(
                  "py-1.5 rounded-full text-xs transition-all cursor-pointer",
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-primary dark:text-primary-foreground shadow-xs font-semibold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Gráfico de Linha/Área Full-Bleed (da esquerda à direita sem card) */}
        <div className="-mx-5 w-[calc(100%+2.5rem)] h-[220px] pt-1">
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart
                data={series}
                margin={{ top: 18, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="mobileEvoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={
                    isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.16)"
                  }
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }}
                  dy={8}
                  padding={{ left: 16, right: 16 }}
                  minTickGap={22}
                />
                <Tooltip
                  cursor={{
                    stroke: "#2563eb",
                    strokeWidth: 1.5,
                    strokeDasharray: "4 4",
                  }}
                  content={({
                    active,
                    payload,
                  }: {
                    active?: boolean;
                    payload?: ReadonlyArray<{ payload?: ChartPoint }>;
                  }) => {
                    if (!active || !payload || !payload.length || !payload[0]?.payload) {
                      return null;
                    }
                    const pt = payload[0].payload;
                    const sharePct =
                      periodCounts.total > 0
                        ? ((pt.total / periodCounts.total) * 100).toFixed(1)
                        : "0.0";
                    const ptSum = Math.max(pt.total, 1);
                    const erpPct =
                      pt.total > 0 ? Math.round((pt.erp / ptSum) * 100) : 0;
                    const modPct =
                      pt.total > 0 ? Math.round((pt.modular / ptSum) * 100) : 0;
                    const othPct =
                      pt.total > 0 ? Math.max(0, 100 - erpPct - modPct) : 0;

                    return (
                      <div className="bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl px-3.5 py-2.5 shadow-xl border border-zinc-800 dark:border-zinc-700 min-w-[180px]">
                        <p className="text-[11px] text-zinc-400 font-medium">
                          {pt.fullLabel}
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-extrabold tabular-nums leading-none">
                              {pt.total.toLocaleString("pt-BR")}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {pt.total === 1 ? "registro" : "registros"}
                            </span>
                          </div>
                          {periodCounts.total > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 tabular-nums">
                              {sharePct}%
                            </span>
                          )}
                        </div>

                        {pt.total > 0 && (
                          <>
                            <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-zinc-800 dark:bg-zinc-700 mt-2.5">
                              {erpPct > 0 && (
                                <div
                                  style={{
                                    width: `${erpPct}%`,
                                    backgroundColor: palette.erp,
                                  }}
                                />
                              )}
                              {modPct > 0 && (
                                <div
                                  style={{
                                    width: `${modPct}%`,
                                    backgroundColor: "#60a5fa",
                                  }}
                                />
                              )}
                              {othPct > 0 && (
                                <div
                                  style={{
                                    width: `${othPct}%`,
                                    backgroundColor: "#94a3b8",
                                  }}
                                />
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-300 mt-1.5 tabular-nums">
                              <span className="flex items-center gap-1">
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: palette.erp }}
                                />
                                {erpPct}%
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                                {modPct}%
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                {othPct}%
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#mobileEvoGrad)"
                  activeDot={{
                    r: 5,
                    fill: "#ffffff",
                    stroke: "#2563eb",
                    strokeWidth: 2.5,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ─── BLOCO 4: RITMO DE PRODUTIVIDADE (FULL-BLEED ABERTO) ─── */}
      <section className="pt-5 mt-1 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Ritmo de Produtividade
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              {perms.sala && totalReadings > 0
                ? `Pico às ${peakHour.hour} · ${totalReadings.toLocaleString("pt-BR")} leituras`
                : "Picos de bipagem por hora da equipe"}
            </p>
          </div>

          {!perms.sala ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 shrink-0">
              <Lock className="h-3 w-3" />
              Plano Team
            </span>
          ) : totalReadings > 0 ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
              Pico {peakHour.hour}
            </span>
          ) : null}
        </div>

        <div
          className={cn(
            "relative -mx-5 w-[calc(100%+2.5rem)]",
            perms.sala ? "h-[165px]" : "h-[135px]",
          )}
        >
          {!perms.sala && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#f4f6f9]/65 dark:bg-[#0d0f14]/70 backdrop-blur-[3px] px-6 text-center">
              <div className="h-8 w-8 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center shadow-xs mb-2">
                <Lock className="h-3.5 w-3.5 text-zinc-400" />
              </div>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Módulo Gestão de Sala
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-[230px] leading-snug">
                Ative o plano Team para visualizar picos de bipagem da equipe.
              </span>
            </div>
          )}

          {isMounted && (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart
                data={perms.sala ? hourlyProductivity : DUMMY_PRODUCTIVITY}
                margin={{ top: 14, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="mobileProdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="#10b981"
                      stopOpacity={perms.sala ? 0.22 : 0.14}
                    />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={
                    isDark ? "rgba(148,163,184,0.12)" : "rgba(148,163,184,0.16)"
                  }
                />
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }}
                  dy={8}
                  padding={{ left: 16, right: 16 }}
                  minTickGap={32}
                />
                {perms.sala && (
                  <Tooltip
                    cursor={{
                      stroke: "#10b981",
                      strokeWidth: 1.5,
                      strokeDasharray: "4 4",
                    }}
                    content={({
                      active,
                      payload,
                    }: {
                      active?: boolean;
                      payload?: ReadonlyArray<{
                        payload?: { hour: string; count: number };
                      }>;
                    }) => {
                      if (!active || !payload || !payload.length || !payload[0]?.payload) {
                        return null;
                      }
                      const pt = payload[0].payload;
                      return (
                        <div className="bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl px-3 py-2 shadow-xl border border-zinc-800 dark:border-zinc-700">
                          <p className="text-[11px] text-zinc-400 font-medium">
                            Horário {pt.hour}
                          </p>
                          <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-base font-extrabold tabular-nums leading-none text-emerald-400">
                              {pt.count.toLocaleString("pt-BR")}
                            </span>
                            <span className="text-[10px] text-zinc-300">
                              {pt.count === 1 ? "leitura" : "leituras"}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={perms.sala ? 2 : 1.5}
                  fill="url(#mobileProdGrad)"
                  activeDot={
                    perms.sala
                      ? {
                          r: 5,
                          fill: "#ffffff",
                          stroke: "#10b981",
                          strokeWidth: 2.5,
                        }
                      : false
                  }
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ─── BLOCO 5: COMPARATIVO POR LOJA (CHAPADO NA TELA) ─── */}
      <section className="pt-5 mt-1 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Comparativo por Loja
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              Contagens salvas por unidade
            </p>
          </div>

          {!perms.empresa ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 shrink-0">
              <Lock className="h-3 w-3" />
              Plano Enterprise
            </span>
          ) : (
            <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 shrink-0">
              {companies.length} {companies.length === 1 ? "loja" : "lojas"}
            </span>
          )}
        </div>

        {perms.empresa && companies.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 py-2">
            Nenhuma empresa ativa cadastrada.
          </p>
        ) : (
          <div className="relative space-y-3">
            {!perms.empresa && (
              <div className="absolute inset-0 -mx-1 z-10 flex flex-col items-center justify-center rounded-2xl bg-[#f4f6f9]/70 dark:bg-[#0d0f14]/75 backdrop-blur-[3px] px-4 text-center">
                <div className="h-8 w-8 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center shadow-xs mb-2">
                  <Lock className="h-3.5 w-3.5 text-zinc-400" />
                </div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Módulo Empresas
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-[230px] leading-snug">
                  Disponível no plano Enterprise para comparar filiais.
                </span>
              </div>
            )}

            {displayCompanies.map((company, index) => {
              const barPct =
                company.count > 0
                  ? Math.max(6, Math.round((company.count / maxCompanyCount) * 100))
                  : 0;
              const sharePct =
                totalCompanyCount > 0
                  ? Math.round((company.count / totalCompanyCount) * 100)
                  : 0;

              return (
                <div key={`${company.name}-${index}`} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {company.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {company.count.toLocaleString("pt-BR")}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                        ({sharePct}%)
                      </span>
                    </div>
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(148,163,184,0.12)"
                        : "rgba(148,163,184,0.1)",
                      backgroundImage:
                        "repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(148,163,184,0.22) 3px, rgba(148,163,184,0.22) 5px)",
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${barPct}%`,
                        backgroundColor:
                          COMPANY_BAR_COLORS[index % COMPANY_BAR_COLORS.length],
                        opacity: perms.empresa ? 1 : 0.45,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── BLOCO 6: BASE GLOBAL COUNTIFLY (CHAPADO NA TELA) ─── */}
      <section className="pt-4 mt-1 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Base Global Countifly
          </h3>
          <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
            Referência offline
          </span>
        </div>

        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Catálogo de referência utilizado para enriquecimento automático de bipagens offline e classificação de produtos.
        </p>

        <div className="grid grid-cols-3 divide-x divide-zinc-200/80 dark:divide-zinc-800/80 py-1">
          <div className="pr-3">
            <p className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums leading-none">
              {globalCatalogCount.toLocaleString("pt-BR")}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Itens
            </p>
          </div>
          <div className="px-3">
            <p className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums leading-none">
              {categoryCount.toLocaleString("pt-BR")}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Categorias
            </p>
          </div>
          <div className="pl-3">
            <p className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums leading-none">
              {subcategoryCount.toLocaleString("pt-BR")}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Subcategorias
            </p>
          </div>
        </div>

        <p className="text-[10px] text-zinc-400 dark:text-zinc-600">
          Base atualizada periodicamente pela equipe Countifly.
        </p>
      </section>
    </div>
  );
}
