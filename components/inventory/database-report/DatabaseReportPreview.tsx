// components/inventory/database-report/DatabaseReportPreview.tsx

import React from "react";
import type { ProductCount } from "@/lib/types";
import type { DatabaseReportConfig } from "./types";
import { formatCurrency } from "@/lib/utils";

interface DatabaseReportPreviewProps {
  config: DatabaseReportConfig;
  items: ProductCount[];
  // Adicionamos a prop para receber os itens agrupados
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
  // Remove casas decimais se for inteiro (ex: 10.0 -> 10)
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

  // Função auxiliar para renderizar uma linha de ITEM da tabela
  const renderRow = (item: ProductCount, idx: number) => {
    const unitPrice = safeParseFloat(item.price);
    const qtdLoja = safeParseFloat(item.quant_loja);
    const qtdEstoque = safeParseFloat(item.quant_estoque);

    // Prioriza o total calculado se existir, senão soma as partes
    const totalQty =
      safeParseFloat(item.total) > 0
        ? safeParseFloat(item.total)
        : qtdLoja + qtdEstoque;

    const totalValue = totalQty * unitPrice;

    return (
      <tr
        key={item.id || `${item.codigo_de_barras}-${idx}`}
        className={`border-b border-gray-100 ${
          idx % 2 === 0 ? "bg-white" : "bg-gray-50 print:bg-gray-50"
        } break-inside-avoid`}
      >
        <td className="py-1 px-1 font-mono text-gray-600 w-28">
          {item.codigo_de_barras}
        </td>
        <td className="py-1 px-1 font-medium">
          <div className="line-clamp-2">{item.descricao}</div>
          {/* Exibe categoria pequena APENAS se não estiver agrupado (para não ficar repetitivo) */}
          {!config.groupByCategory && item.categoria && (
            <span className="text-[9px] text-gray-400 uppercase tracking-wide">
              {item.categoria}
            </span>
          )}
        </td>
        <td className="py-1 px-1 text-right font-mono text-gray-600 w-20">
          {formatCurrency(unitPrice)}
        </td>
        <td className="py-1 px-1 text-center text-gray-500 w-14 bg-gray-50/50">
          {formatQty(qtdLoja)}
        </td>
        <td className="py-1 px-1 text-center text-gray-500 w-14 bg-gray-50/50">
          {formatQty(qtdEstoque)}
        </td>
        <td className="py-1 px-1 text-center font-bold w-16 border-l border-gray-200">
          {formatQty(totalQty)}
        </td>
        <td className="py-1 px-1 text-right font-bold text-blue-800 bg-blue-50/30 w-24">
          {formatCurrency(totalValue)}
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

        {/* Tabela Principal */}
        <div className="mb-8">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="border-b-2 border-black bg-blue-50 uppercase text-[10px]">
              <tr>
                <th className="py-2 px-1 w-28">Cód. Barras</th>
                <th className="py-2 px-1">Descrição</th>
                <th className="py-2 px-1 text-right w-20">Preço Unit.</th>
                <th className="py-2 px-1 text-center w-14 text-gray-500">
                  Loja
                </th>
                <th className="py-2 px-1 text-center w-14 text-gray-500">
                  Estq.
                </th>
                <th className="py-2 px-1 text-center w-16 font-bold border-l border-gray-300">
                  Total
                </th>
                <th className="py-2 px-1 text-right w-24 font-bold bg-blue-100/50">
                  Valor R$
                </th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {/* Lógica de Renderização Condicional */}
              {config.groupByCategory && groupedItems
                ? // --- MODO AGRUPADO ---
                  Object.keys(groupedItems)
                    .sort()
                    .map((category) => (
                      <React.Fragment key={category}>
                        {/* Linha de Cabeçalho da Categoria */}
                        <tr className="bg-gray-200 print:bg-gray-200 border-b border-gray-300 break-inside-avoid">
                          <td
                            colSpan={7}
                            className="py-1 px-2 font-bold text-xs uppercase text-gray-700 tracking-wider"
                          >
                            {category}
                          </td>
                        </tr>
                        {/* Itens desta categoria */}
                        {groupedItems[category].map((item, idx) =>
                          renderRow(item, idx)
                        )}
                      </React.Fragment>
                    ))
                : // --- MODO LISTA SIMPLES ---
                  items.map((item, idx) => renderRow(item, idx))}
            </tbody>
          </table>
        </div>

        {/* Assinaturas */}
        {config.showSignatureBlock && (
          <footer className="mt-12 pt-12 border-t border-gray-300 break-inside-avoid">
            <div className="flex justify-between gap-16 px-8">
              <div className="flex-1 text-center">
                <div className="border-b border-black h-1 mb-2"></div>
                <p className="font-bold uppercase text-[10px] tracking-wider">
                  Conferente / Responsável
                </p>
                {config.showCpfLine && (
                  <p className="text-[10px] text-gray-400 mt-4">
                    CPF: __________________________________
                  </p>
                )}
              </div>

              <div className="flex-1 text-center">
                <div className="border-b border-black h-1 mb-2"></div>
                <p className="font-bold uppercase text-[10px] tracking-wider">
                  Gerente de Loja / Auditoria
                </p>
                {config.showCpfLine && (
                  <p className="text-[10px] text-gray-400 mt-4">
                    CPF: __________________________________
                  </p>
                )}
              </div>
            </div>
            <p className="text-center text-[8px] text-gray-400 mt-8">
              Relatório gerado via Countifly - Gestão Inteligente de Estoque
            </p>
          </footer>
        )}
      </div>
    </div>
  );
});

DatabaseReportPreview.displayName = "DatabaseReportPreview";
