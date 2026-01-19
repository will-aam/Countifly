// components/inventory/report-builder/ReportPreview.tsx

import React from "react";
import type { ProductCount } from "@/lib/types";
import type { ReportConfig } from "./types";

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

// Helper: Converte string/number para number float seguro
const safeParseFloat = (val: any) => {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const strVal = String(val).trim().replace(",", ".");
  const num = parseFloat(strVal);
  return isNaN(num) ? 0 : num;
};

// Helper: Formatação Padrão BR
const formatSmart = (value: number | string | undefined) => {
  const num = safeParseFloat(value);
  if (num === 0) return "0";
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};

export const ReportPreview = React.forwardRef<
  HTMLDivElement,
  ReportPreviewProps
>(({ config, items, stats }, ref) => {
  // Formatação condicional (com ou sem decimais)
  const formatWithConfig = (value: number | string | undefined) => {
    const num = safeParseFloat(value);
    if (config.hideDecimals) {
      return Math.round(num).toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    }
    return formatSmart(num);
  };

  const resolvedLogoSrc =
    config.useDefaultLogo || !config.logoDataUrl
      ? "/report-logo.png"
      : config.logoDataUrl;

  return (
    <div className="bg-gray-100 dark:bg-gray-900 p-4 overflow-auto flex justify-center min-h-screen">
      <div
        ref={ref}
        className="bg-white text-black w-[210mm] min-h-[297mm] p-[10mm] shadow-2xl print:shadow-none print:w-full print:m-0 print:p-[10mm] origin-top scale-100 sm:scale-90 md:scale-100"
      >
        {/* --- CABEÇALHO --- */}
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
              <h1 className="text-2xl font-bold uppercase tracking-tight text-gray-800">
                {config.reportTitle || "Relatório de Inventário"}
              </h1>
              {config.customScope && (
                <p className="text-lg font-medium text-gray-700 mt-1 uppercase">
                  {config.customScope}
                </p>
              )}
            </div>
          </div>
        </header>

        {/* --- CARDS DE RESUMO (KPIs) --- */}
        {/* Mantidos conforme solicitado */}
        {(config.showCardSku ||
          config.showCardSystem ||
          config.showCardCounted ||
          config.showCardDivergence ||
          config.showCardAccuracy ||
          config.showCardItemsCorrect ||
          config.showCardItemsMissing ||
          config.showCardItemsSurplus) && (
          <div className="flex flex-wrap gap-4 mb-8 border border-gray-600 rounded p-4 bg-gray-50 justify-between break-inside-avoid">
            {config.showCardSku && (
              <div className="text-center min-w-[80px]">
                <span className="block text-gray-700 text-[10px] uppercase font-medium">
                  SKUs
                </span>
                <span className="font-bold text-xl">{stats.skuCount}</span>
              </div>
            )}

            {config.showCardSystem && (
              <div className="text-center min-w-[80px] border-l border-gray-600 pl-4">
                <span className="block text-gray-700 text-[10px] uppercase font-medium">
                  Previsto
                </span>
                <span className="font-bold text-xl">
                  {formatWithConfig(stats.totalSystem)}
                </span>
              </div>
            )}

            {config.showCardCounted && (
              <div className="text-center min-w-[80px] border-l border-gray-600 pl-4">
                <span className="block text-gray-700 text-[10px] uppercase font-medium">
                  Contado
                </span>
                <span className="font-bold text-xl">
                  {formatWithConfig(stats.totalCounted)}
                </span>
              </div>
            )}

            {config.showCardDivergence && (
              <div className="text-center min-w-[80px] border-l border-gray-600 pl-4">
                <span className="block text-gray-700 text-[10px] uppercase font-medium">
                  Divergência
                </span>
                <span
                  className={`font-bold text-xl ${
                    stats.totalDivergence < 0
                      ? "text-red-600"
                      : stats.totalDivergence > 0
                        ? "text-green-600"
                        : "text-gray-400"
                  }`}
                >
                  {stats.totalDivergence > 0 ? "+" : ""}
                  {formatWithConfig(stats.totalDivergence)}
                </span>
              </div>
            )}

            {config.showCardAccuracy && (
              <div className="text-center min-w-[80px] border-l border-gray-600 pl-4">
                <span className="block text-gray-700 text-[10px] uppercase font-medium">
                  Acuracidade
                </span>
                <span className="font-bold text-xl text-purple-700">
                  {stats.accuracy}%
                </span>
              </div>
            )}

            {config.showCardItemsCorrect && (
              <div className="text-center min-w-[80px] border-l border-gray-600 pl-4">
                <span className="block text-gray-700 text-[10px] uppercase font-medium">
                  Itens Certos
                </span>
                <span className="font-bold text-xl text-blue-700">
                  {stats.itemsCorrect}
                </span>
              </div>
            )}

            {config.showCardItemsMissing && (
              <div className="text-center min-w-[80px] border-l border-gray-600 pl-4">
                <span className="block text-gray-700 text-[10px] uppercase font-medium">
                  Itens com Falta
                </span>
                <span className="font-bold text-xl text-red-600">
                  {stats.itemsMissing}
                </span>
              </div>
            )}

            {config.showCardItemsSurplus && (
              <div className="text-center min-w-[80px] border-l border-gray-600 pl-4">
                <span className="block text-gray-700 text-[10px] uppercase font-medium">
                  Itens com Sobra
                </span>
                <span className="font-bold text-xl text-green-600">
                  {stats.itemsSurplus}
                </span>
              </div>
            )}
          </div>
        )}

        {/* --- TABELA PRINCIPAL --- */}
        <div className="mb-8">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="border-b-2 border-black bg-gray-200 uppercase text-[10px]">
              <tr>
                <th className="py-2 px-1 w-24">Cód. Barras</th>
                {config.showInternalCode && (
                  <th className="py-2 px-1 w-21">Cód. Interno</th>
                )}
                <th className="py-2 px-1">Descrição</th>
                <th className="py-2 px-1 text-center w-16">Sist.</th>
                <th className="py-2 px-1 text-center w-14">Loja</th>
                <th className="py-2 px-1 text-center w-14">Estq</th>
                <th className="py-2 px-1 text-center w-16 font-bold ">Total</th>
                <th className="py-2 px-1 text-center w-16 font-bold">Dif.</th>

                {config.showAuditColumn && (
                  <th className="py-2 px-1 text-center w-12 border-l-2 border-black">
                    Visto
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="text-xs">
              {items.map((item, idx) => {
                // --- CORREÇÃO DO CÁLCULO DE DIVERGÊNCIA EM TEMPO REAL ---
                const loja = safeParseFloat(item.quant_loja);
                const estoque = safeParseFloat(item.quant_estoque);
                const sistema = safeParseFloat(item.saldo_estoque);

                const totalCounted = loja + estoque;

                // DIFERENÇA = O QUE CONTEI - O QUE TINHA NO SISTEMA
                const diff = totalCounted - sistema;

                return (
                  <tr
                    key={item.id}
                    className={`${
                      idx % 2 === 0
                        ? "bg-white"
                        : "bg-gray-200 print:bg-gray-200"
                    } break-inside-avoid`}
                  >
                    <td className="py-1 px-1 font-mono text-gray-800">
                      {item.codigo_de_barras}
                    </td>

                    {config.showInternalCode && (
                      <td className="py-1 px-1 font-mono text-gray-800">
                        {("codigo_produto" in item &&
                          (item as any).codigo_produto) ||
                          "-"}
                      </td>
                    )}

                    <td className="py-1 px-1 font-medium">
                      {item.descricao.length > config.truncateLimit
                        ? item.descricao.substring(0, config.truncateLimit) +
                          "..."
                        : item.descricao}
                    </td>

                    {/* Coluna Sistema */}
                    <td className="py-1 px-1 text-center text-gray-700 font-medium">
                      {formatWithConfig(sistema)}
                    </td>

                    {/* Coluna Loja */}
                    <td className="py-1 px-1 text-center font-medium">
                      {formatWithConfig(loja)}
                    </td>

                    {/* Coluna Estoque */}
                    <td className="py-1 px-1 text-center font-medium">
                      {formatWithConfig(estoque)}
                    </td>

                    {/* Coluna Total Contado */}
                    <td className="py-1 px-1 text-center font-bold ">
                      {formatWithConfig(totalCounted)}
                    </td>

                    {/* Coluna Diferença (Calculada Agora) */}
                    <td
                      className={`py-1 px-1 text-center font-bold ${
                        diff < 0
                          ? "text-red-600"
                          : diff > 0
                            ? "text-green-600"
                            : "text-gray-500"
                      }`}
                    >
                      {diff === 0
                        ? "-"
                        : diff > 0
                          ? `+${formatWithConfig(diff)}`
                          : formatWithConfig(diff)}
                    </td>

                    {config.showAuditColumn && (
                      <td className="py-1 px-1 text-center border-l-2 border-black">
                        <div className="w-4 h-4 border border-gray-600 mx-auto rounded-sm"></div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* --- RODAPÉ DE ASSINATURAS --- */}
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

ReportPreview.displayName = "ReportPreview";
