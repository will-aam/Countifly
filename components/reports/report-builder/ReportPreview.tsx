"use client";

import React, { useMemo } from "react";
import type { ProductCount } from "@/lib/types";
import type { ReportConfig } from "./types";
import {
  PaginatedReportPreview,
  ReportPageFrame,
  ReportSignature,
  paginateItems,
} from "../shared/PaginatedReportPreview";

interface ReportPreviewProps {
  config: ReportConfig;
  items: ProductCount[];
  stats: {
    skuCount: number;
    totalSystem: number;
    totalCounted: number;
    totalDivergence: number;
    accuracy: string;
    itemsCorrect: number;
    itemsSurplus: number;
    itemsMissing: number;
  };
}

const safeParseFloat = (value: number | string | undefined) => {
  if (typeof value === "number") return value;
  const parsed = Number(String(value || "0").trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const ReportPreview = React.forwardRef<HTMLDivElement, ReportPreviewProps>(
  ({ config, items, stats }, ref) => {
    const formatQuantity = (value: number | string | undefined) => {
      const number = safeParseFloat(value);
      return config.hideDecimals
        ? Math.round(number).toLocaleString("pt-BR")
        : number.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
    };
    const chunks = useMemo(() => paginateItems(items, 26, 30), [items]);
    const logoSrc = config.useDefaultLogo || !config.logoDataUrl
      ? "/report-logo.png"
      : config.logoDataUrl;

    const pages = chunks.map((pageItems, pageIndex) => (
      <ReportPageFrame
        key={pageIndex}
        title={config.reportTitle || "Relatório de Inventário"}
        scope={config.customScope}
        logoSrc={logoSrc}
        showLogo={config.showLogo}
        showHeader={pageIndex === 0}
        pageNumber={pageIndex + 1}
        pageCount={chunks.length}
        signature={pageIndex === chunks.length - 1 && config.showSignatureBlock
          ? <ReportSignature showCpfLine={config.showCpfLine} />
          : undefined}
      >
        {pageIndex === 0 && (
          <section className="mb-5 flex flex-wrap justify-between gap-3 rounded border border-gray-600 bg-gray-50 p-3">
            {config.showCardSku && <Kpi label="SKUs" value={stats.skuCount} />}
            {config.showCardSystem && <Kpi label="Previsto" value={formatQuantity(stats.totalSystem)} />}
            {config.showCardCounted && <Kpi label="Contado" value={formatQuantity(stats.totalCounted)} />}
            {config.showCardDivergence && <Kpi label="Divergência" value={`${stats.totalDivergence > 0 ? "+" : ""}${formatQuantity(stats.totalDivergence)}`} />}
            {config.showCardAccuracy && <Kpi label="Acuracidade" value={`${stats.accuracy}%`} />}
            {config.showCardItemsCorrect && <Kpi label="Itens certos" value={stats.itemsCorrect} />}
            {config.showCardItemsMissing && <Kpi label="Itens com falta" value={stats.itemsMissing} />}
            {config.showCardItemsSurplus && <Kpi label="Itens com sobra" value={stats.itemsSurplus} />}
          </section>
        )}

        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-gray-200 text-[10px] uppercase">
            <tr className="border-b-2 border-black">
              <th className="w-24 px-1 py-2">Cód. Barras</th>
              {config.showInternalCode && <th className="w-20 px-1 py-2">Cód. Interno</th>}
              <th className="px-1 py-2">Descrição</th>
              <th className="w-14 px-1 py-2 text-center">Sist.</th>
              <th className="w-14 px-1 py-2 text-center">Loja</th>
              <th className="w-14 px-1 py-2 text-center">Estq.</th>
              <th className="w-16 px-1 py-2 text-center font-bold">Total</th>
              <th className="w-16 px-1 py-2 text-center font-bold">Dif.</th>
              {config.showAuditColumn && <th className="w-12 border-l-2 border-black px-1 py-2 text-center">Visto</th>}
            </tr>
          </thead>
          <tbody className="text-xs">
            {pageItems.map((item, index) => {
              const store = safeParseFloat(item.quant_loja);
              const stock = safeParseFloat(item.quant_estoque);
              const system = safeParseFloat(item.saldo_estoque);
              const counted = store + stock;
              const difference = counted - system;
              return (
                <tr key={item.id ?? `${item.codigo_de_barras}-${index}`} className={`${index % 2 ? "bg-gray-100" : "bg-white"} break-inside-avoid`}>
                  <td className="break-all px-1 py-1 font-mono text-gray-800">{item.codigo_de_barras}</td>
                  {config.showInternalCode && <td className="break-all px-1 py-1 font-mono">{"codigo_produto" in item ? (item as any).codigo_produto || "-" : "-"}</td>}
                  <td className="px-1 py-1 font-medium">{item.descricao.length > config.truncateLimit ? `${item.descricao.slice(0, config.truncateLimit)}…` : item.descricao}</td>
                  <td className="px-1 py-1 text-center font-medium">{formatQuantity(system)}</td>
                  <td className="px-1 py-1 text-center font-medium">{formatQuantity(store)}</td>
                  <td className="px-1 py-1 text-center font-medium">{formatQuantity(stock)}</td>
                  <td className="px-1 py-1 text-center font-bold">{formatQuantity(counted)}</td>
                  <td className={`px-1 py-1 text-center font-bold ${difference < 0 ? "text-red-600" : difference > 0 ? "text-green-600" : "text-gray-500"}`}>
                    {difference === 0 ? "-" : `${difference > 0 ? "+" : ""}${formatQuantity(difference)}`}
                  </td>
                  {config.showAuditColumn && <td className="border-l-2 border-black px-1 py-1 text-center"><span className="mx-auto block h-4 w-4 rounded-sm border border-gray-600" /></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </ReportPageFrame>
    ));

    return (
      <PaginatedReportPreview
        ref={ref}
        pages={pages}
      />
    );
  },
);

ReportPreview.displayName = "ReportPreview";

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-[72px] flex-1 text-center">
      <span className="block text-[10px] font-medium uppercase text-gray-700">{label}</span>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
}
