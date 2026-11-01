"use client";

import React, { useMemo } from "react";
import type { ProductCount } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import type { DatabaseReportConfig } from "./types";
import { getReportCountedQuantity, parseReportNumber } from "./report-number";
import {
  PaginatedReportPreview,
  ReportPageFrame,
  ReportSignature,
  paginateItems,
} from "../shared/PaginatedReportPreview";

interface GroupSummary {
  name: string;
  skuCount: number;
  totalQuantity: number;
  totalValue: number;
  percentage: number;
}

interface DatabaseReportPreviewProps {
  config: DatabaseReportConfig;
  items: ProductCount[];
  groupedItems?: Record<string, ProductCount[]> | null;
  groupSummaries?: GroupSummary[];
  stats: { skuCount: number; totalCounted: number; totalValue: number };
}

type ReportUnit =
  | { kind: "group"; label: string }
  | { kind: "item"; item: ProductCount; group?: string }
  | { kind: "group-total"; label: string; items: ProductCount[] }
  | { kind: "summary"; summary: GroupSummary };

const safeParseFloat = parseReportNumber;

const formatQty = (value: number | string | undefined) => {
  const number = safeParseFloat(value);
  return number === 0 ? "0" : number % 1 === 0 ? number.toString() : number.toLocaleString("pt-BR");
};

export const DatabaseReportPreview = React.forwardRef<HTMLDivElement, DatabaseReportPreviewProps>(
  ({ config, items, groupedItems, groupSummaries = [], stats }, ref) => {
    const isSummaryMode =
      (config.groupByCategory && config.showOnlyCategorySummary) ||
      (config.groupBySubcategory && config.showOnlySubcategorySummary);

    const units = useMemo<ReportUnit[]>(() => {
      if (isSummaryMode) return groupSummaries.map((summary) => ({ kind: "summary", summary }));
      if (!(config.groupByCategory || config.groupBySubcategory) || !groupedItems) {
        return items.map((item) => ({ kind: "item", item }));
      }
      return Object.keys(groupedItems).sort().flatMap((label) => {
        const groupItems = groupedItems[label];
        return [
          { kind: "group" as const, label },
          ...groupItems.map((item) => ({ kind: "item" as const, item, group: label })),
          ...((config.groupByCategory && config.showCategoryTotals) ||
            (config.groupBySubcategory && config.showSubCategoryTotals)
            ? [{ kind: "group-total" as const, label, items: groupItems }]
            : []),
        ];
      });
    }, [isSummaryMode, groupSummaries, config.groupByCategory, config.groupBySubcategory, config.showCategoryTotals, config.showSubCategoryTotals, groupedItems, items]);

    const pagesOfUnits = useMemo(
      () => config.showCategoryInItem
        ? paginateItems(units, 18, 22)
        : paginateItems(units, 24, 28),
      [units, config.showCategoryInItem],
    );
    const logoSrc = config.useDefaultLogo || !config.logoDataUrl
      ? "/report-data-logo.png"
      : config.logoDataUrl;

    const renderDetailedItem = (item: ProductCount, index: number) => {
      const unitPrice = safeParseFloat(item.price);
      const storeQty = safeParseFloat(item.quant_loja);
      const stockQty = safeParseFloat(item.quant_estoque);
      const totalQty = getReportCountedQuantity(item);
      let categoryDetail = "";
      if (config.showCategoryInItem) {
        const category = item.categoria || "";
        const subcategory = item.subcategoria || "";
        categoryDetail = config.groupByCategory
          ? subcategory
          : config.groupBySubcategory
            ? category
            : category && subcategory ? `${category} > ${subcategory}` : category || subcategory;
      }
      const description = item.descricao || "Item sem descrição";
      const totalValue = totalQty * unitPrice;
      return (
        <tr key={item.id ?? `${item.codigo_de_barras}-${index}`} className={`${index % 2 ? "bg-gray-100" : "bg-white"} break-inside-avoid`}>
          <td className="w-28 break-all px-1 py-1 font-mono text-gray-800">{item.codigo_de_barras}</td>
          <td className="px-1 py-1 font-medium">
            <span title={description}>{description.length > config.truncateLimit ? `${description.slice(0, config.truncateLimit)}…` : description}</span>
            {categoryDetail && <span className="block truncate text-[9px] uppercase text-gray-500" title={categoryDetail}>{categoryDetail}</span>}
          </td>
          <td className="w-20 px-1 py-1 text-right font-mono text-gray-700">{formatCurrency(unitPrice)}</td>
          <td className="w-14 px-1 py-1 text-center text-gray-700">{formatQty(storeQty)}</td>
          <td className="w-14 px-1 py-1 text-center text-gray-700">{formatQty(stockQty)}</td>
          <td className="w-16 px-1 py-1 text-center font-bold">{formatQty(totalQty)}</td>
          <td className="w-24 px-1 py-1 text-right font-bold">{formatCurrency(totalValue)}</td>
        </tr>
      );
    };

    const pages = pagesOfUnits.map((pageUnits, pageIndex) => {
      const lastPage = pageIndex === pagesOfUnits.length - 1;
      const visibleUnits = pageUnits[0]?.kind === "item" && pageUnits[0].group
        ? [{ kind: "group" as const, label: `${pageUnits[0].group} (continuação)` }, ...pageUnits]
        : pageUnits;
      const content = isSummaryMode ? (
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b-2 border-black bg-gray-200 text-[10px] uppercase">
            <tr>
              <th className="w-1/3 px-2 py-2">Grupo ({config.groupByCategory ? "Categoria" : "Subcategoria"})</th>
              <th className="px-2 py-2 text-center">Qtd. SKUs</th>
              <th className="px-2 py-2 text-center">Peças</th>
              <th className="px-2 py-2 text-right">Valor Total (R$)</th>
              <th className="px-2 py-2 text-right">% Repr.</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {visibleUnits.map((unit, index) => {
              if (unit.kind !== "summary") return null;
              const summary = unit.summary;
              return (
                <tr key={summary.name} className={`${index % 2 ? "bg-gray-100" : "bg-white"} border-b border-gray-300`}>
                  <td className="px-2 py-2 font-bold text-gray-800">{summary.name}</td>
                  <td className="px-2 py-2 text-center text-gray-600">{summary.skuCount}</td>
                  <td className="px-2 py-2 text-center font-medium">{formatQty(summary.totalQuantity)}</td>
                  <td className="px-2 py-2 text-right font-medium">{formatCurrency(summary.totalValue)}</td>
                  <td className="px-2 py-2 text-right text-[10px] text-gray-500">{summary.percentage.toFixed(1)}%</td>
                </tr>
              );
            })}
            {lastPage && <tr className="border-t-2 border-black bg-gray-800 font-bold text-white">
              <td className="px-2 py-2 text-[10px] uppercase tracking-wider">Total Geral</td>
              <td className="px-2 py-2 text-center">{stats.skuCount}</td>
              <td className="px-2 py-2 text-center">{formatQty(stats.totalCounted)}</td>
              <td className="px-2 py-2 text-right">{formatCurrency(stats.totalValue)}</td>
              <td className="px-2 py-2 text-right">100%</td>
            </tr>}
          </tbody>
        </table>
      ) : (
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="border-b-2 border-black bg-gray-200 text-[10px] uppercase">
            <tr>
              <th className="w-28 px-1 py-2">Cód. Barras</th>
              <th className="px-1 py-2">Descrição</th>
              <th className="w-20 px-1 py-2 text-right">Preço Unit.</th>
              <th className="w-14 px-1 py-2 text-center">Loja</th>
              <th className="w-14 px-1 py-2 text-center">Estq.</th>
              <th className="w-16 px-1 py-2 text-center font-bold">Total</th>
              <th className="w-24 px-1 py-2 text-right font-bold">Valor R$</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {pageUnits.map((unit, index) => {
              if (unit.kind === "group") return <tr key={`group-${unit.label}`} className="break-inside-avoid border-b border-gray-400 bg-gray-300"><td colSpan={7} className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-gray-800">{unit.label}</td></tr>;
              if (unit.kind === "group-total") {
                const quantity = unit.items.reduce((sum, item) => sum + getReportCountedQuantity(item), 0);
                const value = unit.items.reduce((sum, item) => sum + getReportCountedQuantity(item) * safeParseFloat(item.price), 0);
                return <tr key={`total-${unit.label}`} className="break-inside-avoid border-t-2 border-black bg-gray-800 font-bold text-white"><td colSpan={3} className="px-2 py-1 text-right text-[10px] uppercase tracking-wider">Total do Grupo: {unit.label}</td><td colSpan={2} /><td className="px-1 py-1 text-center text-xs">{formatQty(quantity)}</td><td className="bg-gray-900 px-1 py-1 text-right text-xs">{formatCurrency(value)}</td></tr>;
              }
              if (unit.kind === "item") return renderDetailedItem(unit.item, index);
              return null;
            })}
          </tbody>
        </table>
      );

      return (
        <ReportPageFrame
          key={pageIndex}
          title={config.reportTitle || "Relatório de Valuation"}
          scope={config.customScope}
          logoSrc={logoSrc}
          showLogo={config.showLogo}
          showHeader={pageIndex === 0}
          pageNumber={pageIndex + 1}
          pageCount={pagesOfUnits.length}
          orientation={config.orientation}
          signature={lastPage && config.showSignatureBlock
            ? <ReportSignature showCpfLine={config.showCpfLine} />
            : undefined}
        >
          {pageIndex === 0 && (config.showCardSku || config.showCardVolume || config.showCardTicket || config.showCardTotalValue) && (
            <section className="mb-5 flex flex-wrap justify-between gap-3 rounded border border-gray-600 bg-gray-50 p-3">
              {config.showCardSku && <Kpi label="Total de itens" value={stats.skuCount} />}
              {config.showCardVolume && <Kpi label="Volume" value={formatQty(stats.totalCounted)} />}
              {config.showCardTicket && <Kpi label="Ticket médio" value={formatCurrency(stats.totalCounted ? stats.totalValue / stats.totalCounted : 0)} />}
              {config.showCardTotalValue && <Kpi label="Patrimônio" value={formatCurrency(stats.totalValue)} emphasized />}
            </section>
          )}
          {content}
        </ReportPageFrame>
      );
    });

    return (
      <PaginatedReportPreview
        ref={ref}
        pages={pages}
        orientation={config.orientation}
      />
    );
  },
);

DatabaseReportPreview.displayName = "DatabaseReportPreview";

function Kpi({ label, value, emphasized = false }: { label: string; value: React.ReactNode; emphasized?: boolean }) {
  return <div className="min-w-[80px] flex-1 text-center"><span className={`block text-[10px] font-medium uppercase ${emphasized ? "text-blue-800" : "text-gray-700"}`}>{label}</span><span className={`text-xl font-bold ${emphasized ? "text-blue-900" : ""}`}>{value}</span></div>;
}
