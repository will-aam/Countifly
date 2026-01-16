// components/inventory/database-report/DatabaseReportPreview.tsx

import React from "react";
import type { ProductCount } from "@/lib/types";
import type { DatabaseReportConfig } from "./types";
import { formatCurrency } from "@/lib/utils";

interface DatabaseReportPreviewProps {
  config: DatabaseReportConfig;
  items: ProductCount[];
  groupedItems?: Record<string, ProductCount[]> | null;
  stats: {
    skuCount: number;
    totalCounted: number;
    totalValue: number;
  };
}

const safeParseFloat = (val: any) => {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const strVal = String(val).trim().replace(/\./g, "").replace(",", ".");
  const num = parseFloat(strVal);
  return isNaN(num) ? 0 : num;
};

const formatQty = (value: number | string | undefined) => {
  const num = safeParseFloat(value);
  if (num === 0) return "0";
  return num % 1 === 0 ? num.toString() : num.toLocaleString("pt-BR");
};

export const DatabaseReportPreview = React.forwardRef<
  HTMLDivElement,
  DatabaseReportPreviewProps
>(({ config, items, groupedItems, stats }, ref) => {
  const resolvedLogoSrc =
    config.useDefaultLogo || !config.logoDataUrl
      ? "/report-data-logo.png"
      : config.logoDataUrl;

  const showAnyCard =
    config.showCardSku ||
    config.showCardVolume ||
    config.showCardTicket ||
    config.showCardTotalValue;

  const renderRow = (item: ProductCount, idx: number) => {
    const unitPrice = safeParseFloat(item.price);
    const qtdLoja = safeParseFloat(item.quant_loja);
    const qtdEstoque = safeParseFloat(item.quant_estoque);

    const totalQty =
      safeParseFloat(item.total) > 0
        ? safeParseFloat(item.total)
        : qtdLoja + qtdEstoque;

    const totalValue = totalQty * unitPrice;

    let detailText = "";
    if (config.showCategoryInItem) {
      if (config.groupByCategory && item.subcategoria) {
        detailText = item.subcategoria;
      } else if (config.groupBySubCategory && item.categoria) {
        detailText = item.categoria;
      } else {
        const cat = item.categoria || "";
        const sub = item.subcategoria || "";
        detailText = cat && sub ? `${cat} > ${sub}` : cat || sub;
      }
    }

    // APLICANDO O TRUNCATE AQUI
    const truncatedDesc =
      item.descricao.length > config.truncateLimit
        ? item.descricao.substring(0, config.truncateLimit) + "..."
        : item.descricao;

    return (
      <tr
        key={item.id || `${item.codigo_de_barras}-${idx}`}
        className={`${
          idx % 2 === 0 ? "bg-white" : "bg-gray-200 print:bg-gray-200"
        } break-inside-avoid`}
      >
        <td className="py-1 px-1 font-mono text-gray-800 w-28">
          {item.codigo_de_barras}
        </td>
        <td className="py-1 px-1 font-medium">
          <div className="line-clamp-2" title={item.descricao}>
            {truncatedDesc}
          </div>

          {config.showCategoryInItem && detailText && (
            <span className="text-[9px] text-gray-500 uppercase tracking-wide block">
              {detailText}
            </span>
          )}
        </td>
        <td className="py-1 px-1 text-right font-mono text-gray-700 w-20">
          {formatCurrency(unitPrice)}
        </td>
        <td className="py-1 px-1 text-center text-gray-700 w-14">
          {formatQty(qtdLoja)}
        </td>
        <td className="py-1 px-1 text-center text-gray-700 w-14">
          {formatQty(qtdEstoque)}
        </td>
        <td className="py-1 px-1 text-center font-bold w-16 ">
          {formatQty(totalQty)}
        </td>
        <td className="py-1 px-1 text-right font-bold text-black w-24">
          {formatCurrency(totalValue)}
        </td>
      </tr>
    );
  };

  const renderGroupTotalRow = (groupItems: ProductCount[]) => {
    let groupQty = 0;
    let groupValue = 0;

    groupItems.forEach((item) => {
      const qty =
        safeParseFloat(item.total) > 0
          ? safeParseFloat(item.total)
          : safeParseFloat(item.quant_loja) +
            safeParseFloat(item.quant_estoque);
      const price = safeParseFloat(item.price);

      groupQty += qty;
      groupValue += qty * price;
    });

    return (
      <tr className="bg-gray-800 text-white font-bold border-t-2 border-black break-inside-avoid">
        <td
          colSpan={3}
          className="py-1 px-2 text-right uppercase text-[10px] tracking-wider"
        >
          Total do Grupo:
        </td>
        <td colSpan={2} className="py-1 px-1 text-center text-[10px]">
          {/* Espaço vazio */}
        </td>
        <td className="py-1 px-1 text-center text-xs ">
          {formatQty(groupQty)}
        </td>
        <td className="py-1 px-1 text-right text-xs bg-gray-900">
          {formatCurrency(groupValue)}
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-900 p-4 overflow-auto flex justify-center min-h-screen [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div
        ref={ref}
        className="bg-white text-black w-[210mm] min-h-[297mm] p-[10mm] shadow-2xl print:shadow-none print:w-full print:m-0 print:p-[10mm] origin-top scale-100 sm:scale-90 md:scale-100"
      >
        {/* Cabeçalho */}
        <header className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start gap-4">
          <div className="flex-1 flex items-start gap-4">
            {config.showLogo && (
              <div className="shrink-0 flex items-center">
                <img
                  src={resolvedLogoSrc}
                  alt="Logo"
                  className="h-16 max-w-[120px] object-contain"
                />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold uppercase tracking-tight text-blue-900">
                {config.reportTitle || "Relatório de Valuation"}
              </h1>
              {config.customScope && (
                <p className="text-lg font-medium text-gray-700 mt-1 uppercase">
                  {config.customScope}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* --- KPIs (CARDS) --- */}
        {showAnyCard && (
          <div className="flex flex-wrap gap-4 mb-8 border border-gray-600 bg-gray-50 rounded p-4 justify-between">
            {config.showCardSku && (
              <div className="text-center min-w-[100px]">
                <span className="block text-gray-700 text-[10px] uppercase font-medium">
                  Total de Itens
                </span>
                <span className="font-bold text-xl">{stats.skuCount}</span>
              </div>
            )}

            {config.showCardVolume && (
              <div className="text-center min-w-[100px] border-l border-gray-400 pl-4">
                <span className="block text-gray-700 text-[10px] uppercase font-medium">
                  Volume
                </span>
                <span className="font-bold text-xl">
                  {formatQty(stats.totalCounted)}
                </span>
              </div>
            )}

            {config.showCardTicket && (
              <div className="text-center min-w-[100px] border-l border-gray-400 pl-4">
                <span className="block text-gray-700 text-[10px] uppercase font-medium">
                  Ticket Médio
                </span>
                <span className="font-bold text-xl text-green-700">
                  {stats.totalCounted > 0
                    ? formatCurrency(stats.totalValue / stats.totalCounted)
                    : formatCurrency(0)}
                </span>
              </div>
            )}

            {config.showCardTotalValue && (
              <div className="text-center min-w-[100px] border-l border-gray-400 pl-4">
                <span className="block text-blue-800 text-[10px] uppercase font-bold">
                  Patrimônio
                </span>
                <span className="font-bold text-xl text-blue-900">
                  {formatCurrency(stats.totalValue)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tabela Principal */}
        <div className="mb-8">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="border-b-2 border-black bg-gray-200 uppercase text-[10px]">
              <tr>
                <th className="py-2 px-1 w-28">Cód. Barras</th>
                <th className="py-2 px-1">Descrição</th>
                <th className="py-2 px-1 text-right w-20">Preço Unit.</th>
                <th className="py-2 px-1 text-center w-14">Loja</th>
                <th className="py-2 px-1 text-center w-14">Estq.</th>
                <th className="py-2 px-1 text-center w-16 font-bold">Total</th>
                <th className="py-2 px-1 text-right w-24 font-bold">
                  Valor R${" "}
                </th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {(config.groupByCategory || config.groupBySubCategory) &&
              groupedItems
                ? Object.keys(groupedItems)
                    .sort()
                    .map((groupName) => (
                      <React.Fragment key={groupName}>
                        <tr className="bg-gray-300 print:bg-gray-300 border-b border-gray-400 break-inside-avoid">
                          <td
                            colSpan={7}
                            className="py-1 px-2 font-bold text-xs uppercase text-gray-800 tracking-wider"
                          >
                            {groupName}
                          </td>
                        </tr>
                        {groupedItems[groupName].map((item, idx) =>
                          renderRow(item, idx)
                        )}
                        {((config.groupByCategory &&
                          config.showCategoryTotals) ||
                          (config.groupBySubCategory &&
                            config.showSubCategoryTotals)) &&
                          renderGroupTotalRow(groupedItems[groupName])}
                      </React.Fragment>
                    ))
                : items.map((item, idx) => renderRow(item, idx))}
            </tbody>
          </table>
        </div>

        {/* Assinaturas */}
        {config.showSignatureBlock && (
          <footer className="mt-12 pt-12 break-inside-avoid">
            <div className="flex justify-between gap-16 px-8">
              <div className="flex-1 text-center">
                <div className="border-b-2 border-black h-1 mb-2"></div>
                <p className="font-bold uppercase text-[10px] tracking-wider">
                  Conferente / Responsável
                </p>
                {config.showCpfLine && (
                  <p className="text-[10px] text-gray-600 mt-4">
                    CPF: __________________________________
                  </p>
                )}
              </div>

              <div className="flex-1 text-center">
                <div className="border-b-2 border-black h-1 mb-2"></div>
                <p className="font-bold uppercase text-[10px] tracking-wider">
                  Gerente de Loja / Auditoria
                </p>
                {config.showCpfLine && (
                  <p className="text-[10px] text-gray-600 mt-4">
                    CPF: __________________________________
                  </p>
                )}
              </div>
            </div>
            <div className="mt-16 text-center">
              <p className="text-[9px] text-gray-700 font-medium">
                Relatório gerado via Countifly - Gestão Inteligente de Estoque
              </p>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
});

DatabaseReportPreview.displayName = "DatabaseReportPreview";
