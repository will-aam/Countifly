// components/inventory/database-report/DatabaseReportPreview.tsx

import React from "react";
import type { ProductCount } from "@/lib/types";
// Importamos o tipo local que acabamos de definir
import type { DatabaseReportConfig } from "./types";
import { formatCurrency } from "@/lib/utils";

interface DatabaseReportPreviewProps {
  config: DatabaseReportConfig; // Usa a config local
  items: ProductCount[];
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
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};

export const DatabaseReportPreview = React.forwardRef<
  HTMLDivElement,
  DatabaseReportPreviewProps
>(({ config, items, stats }, ref) => {
  const resolvedLogoSrc =
    config.useDefaultLogo || !config.logoDataUrl
      ? "/report-data-logo.png"
      : config.logoDataUrl;

  return (
    <div className="bg-gray-100 dark:bg-gray-900 p-4 overflow-auto flex justify-center min-h-screen [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {" "}
      <div
        ref={ref}
        className="bg-white text-black w-[210mm] min-h-[297mm] p-[10mm] shadow-2xl print:shadow-none print:w-full print:m-0 print:p-[10mm] origin-top scale-100 sm:scale-90 md:scale-100"
      >
        {/* Cabeçalho Auditoria */}
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

          <div className="text-right border-2 border-blue-900 p-3 rounded bg-blue-50">
            <span className="block text-[10px] uppercase text-blue-800 font-bold tracking-wider">
              Patrimônio Total
            </span>
            <span className="text-2xl font-bold text-blue-900">
              {formatCurrency(stats.totalValue)}
            </span>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-8 border border-gray-200 rounded p-4 bg-gray-50">
          <div className="text-center">
            <span className="block text-gray-500 text-[10px] uppercase">
              Total de Itens (SKUs)
            </span>
            <span className="font-bold text-xl">{stats.skuCount}</span>
          </div>
          <div className="text-center border-l border-gray-300">
            <span className="block text-gray-500 text-[10px] uppercase">
              Volume de Peças
            </span>
            <span className="font-bold text-xl">
              {formatQty(stats.totalCounted)}
            </span>
          </div>
          <div className="text-center border-l border-gray-300">
            <span className="block text-gray-500 text-[10px] uppercase">
              Ticket Médio
            </span>
            <span className="font-bold text-xl text-green-700">
              {stats.totalCounted > 0
                ? formatCurrency(stats.totalValue / stats.totalCounted)
                : formatCurrency(0)}
            </span>
          </div>
        </div>

        {/* Tabela */}
        <div className="mb-8">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="border-b-2 border-black bg-blue-50 uppercase text-[10px]">
              <tr>
                <th className="py-2 px-1 w-24">Código</th>
                <th className="py-2 px-1">Descrição / Categoria</th>
                <th className="py-2 px-1 text-right w-20">Preço Unit.</th>
                <th className="py-2 px-1 text-center w-16">Qtd.</th>
                <th className="py-2 px-1 text-right w-24 font-bold bg-blue-100/50">
                  Total R$
                </th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {items.map((item, idx) => {
                // Cálculo seguro usando o helper
                const totalQty = safeParseFloat(
                  item.total || item.quantity || 0
                );
                const unitPrice = safeParseFloat(item.price);
                const totalValue = totalQty * unitPrice;

                return (
                  <tr
                    key={item.id || idx}
                    className={`border-b border-gray-100 ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50 print:bg-gray-50"
                    } break-inside-avoid`}
                  >
                    <td className="py-1 px-1 font-mono text-gray-600">
                      {item.codigo_de_barras}
                    </td>
                    <td className="py-1 px-1 font-medium">
                      <div className="line-clamp-2">{item.descricao}</div>
                      {item.categoria && item.categoria !== "Geral" && (
                        <div className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5">
                          {item.categoria}
                        </div>
                      )}
                    </td>
                    <td className="py-1 px-1 text-right font-mono text-gray-600">
                      {formatCurrency(unitPrice)}
                    </td>
                    <td className="py-1 px-1 text-center font-bold">
                      {formatQty(totalQty)}
                    </td>
                    <td className="py-1 px-1 text-right font-bold text-blue-800 bg-blue-50/30">
                      {formatCurrency(totalValue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {config.showSignatureBlock && (
          <footer className="mt-12 pt-4 border-t border-gray-300 text-center text-[10px] text-gray-400">
            <div className="flex justify-between gap-16 px-8 mb-8">
              <div className="flex-1 text-center">
                <div className="border-b border-black h-1 mb-2"></div>
                <p className="font-bold uppercase text-[10px] tracking-wider">
                  Responsável
                </p>
              </div>
              <div className="flex-1 text-center">
                <div className="border-b border-black h-1 mb-2"></div>
                <p className="font-bold uppercase text-[10px] tracking-wider">
                  Gestor
                </p>
              </div>
            </div>
            Relatório de Valoração de Estoque - Gerado via Countifly
          </footer>
        )}
      </div>
    </div>
  );
});

DatabaseReportPreview.displayName = "DatabaseReportPreview";
