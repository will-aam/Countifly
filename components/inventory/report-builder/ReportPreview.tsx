// components/inventory/report-builder/ReportPreview.tsx

import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatNumberBR } from "@/lib/utils";
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
  };
}

export const ReportPreview = React.forwardRef<
  HTMLDivElement,
  ReportPreviewProps
>(({ config, items, stats }, ref) => {
  const currentDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-gray-100 dark:bg-gray-900 p-4 overflow-auto flex justify-center min-h-screen">
      <div
        ref={ref}
        className="bg-white text-black w-[210mm] min-h-[297mm] p-[10mm] shadow-2xl print:shadow-none print:w-full print:m-0 print:p-[10mm] origin-top scale-100 sm:scale-90 md:scale-100"
      >
        {/* 1. Cabeçalho */}
        <header className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-2xl font-bold uppercase tracking-tight">
              {config.reportTitle || "Relatório de Inventário"}
            </h1>
            {config.customScope && (
              <p className="text-lg font-medium text-gray-700 mt-1 uppercase">
                {config.customScope}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-gray-500 space-y-1">
            <p>Gerado em: {currentDate}</p>
            <p className="font-mono">ID Contagem: #{items[0]?.id || "NOVO"}</p>
            <Badge
              variant="outline"
              className="text-black border-black rounded-sm"
            >
              FINALIZADO
            </Badge>
          </div>
        </header>

        {/* 2. Resumo Executivo (Condicional) */}
        {(config.showCardSku ||
          config.showCardSystem ||
          config.showCardCounted ||
          config.showCardDivergence ||
          config.showCardAccuracy) && (
          <div className="flex flex-wrap gap-4 mb-8 border border-gray-200 rounded p-4 bg-gray-50 justify-between break-inside-avoid">
            {config.showCardSku && (
              <div className="text-center min-w-[80px]">
                <span className="block text-gray-500 text-[10px] uppercase">
                  SKUs
                </span>
                <span className="font-bold text-xl">{stats.skuCount}</span>
              </div>
            )}

            {config.showCardSystem && (
              <div className="text-center min-w-[80px] border-l border-gray-300 pl-4">
                <span className="block text-gray-500 text-[10px] uppercase">
                  Previsto
                </span>
                <span className="font-bold text-xl">
                  {formatNumberBR(stats.totalSystem)}
                </span>
              </div>
            )}

            {config.showCardCounted && (
              <div className="text-center min-w-[80px] border-l border-gray-300 pl-4">
                <span className="block text-gray-500 text-[10px] uppercase">
                  Contado
                </span>
                <span className="font-bold text-xl text-blue-700">
                  {formatNumberBR(stats.totalCounted)}
                </span>
              </div>
            )}

            {config.showCardDivergence && (
              <div className="text-center min-w-[80px] border-l border-gray-300 pl-4">
                <span className="block text-gray-500 text-[10px] uppercase">
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
                  {formatNumberBR(stats.totalDivergence)}
                </span>
              </div>
            )}

            {config.showCardAccuracy && (
              <div className="text-center min-w-[80px] border-l border-gray-300 pl-4">
                <span className="block text-gray-500 text-[10px] uppercase">
                  Acuracidade
                </span>
                <span className="font-bold text-xl text-purple-700">
                  {stats.accuracy}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* 3. Tabela de Itens */}
        <div className="mb-8">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="border-b-2 border-black bg-gray-100 uppercase text-[10px]">
              <tr>
                <th className="py-2 px-1 w-24">Cód. Barras</th>
                <th className="py-2 px-1">Descrição</th>
                <th className="py-2 px-1 text-center w-16">Sist.</th>
                <th className="py-2 px-1 text-center w-14 bg-gray-50">Loja</th>
                <th className="py-2 px-1 text-center w-14 bg-gray-50">Estq</th>
                <th className="py-2 px-1 text-center w-16 font-bold border-l border-gray-300">
                  Total
                </th>
                <th className="py-2 px-1 text-center w-16 font-bold">Dif.</th>

                {config.showAuditColumn && (
                  <th className="py-2 px-1 text-center w-12 border-l border-black">
                    Visto
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="text-xs">
              {items.map((item, idx) => {
                const totalCounted =
                  Number(item.quant_loja) + Number(item.quant_estoque);

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-100 ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50 print:bg-gray-50"
                    } break-inside-avoid`}
                  >
                    <td className="py-1 px-1 font-mono text-gray-600">
                      {item.codigo_de_barras}
                    </td>
                    <td className="py-1 px-1 font-medium">
                      {item.descricao.length > config.truncateLimit
                        ? item.descricao.substring(0, config.truncateLimit) +
                          "..."
                        : item.descricao}
                    </td>
                    <td className="py-1 px-1 text-center text-gray-500">
                      {formatNumberBR(item.saldo_estoque)}
                    </td>
                    <td className="py-1 px-1 text-center bg-gray-50/50">
                      {formatNumberBR(item.quant_loja)}
                    </td>
                    <td className="py-1 px-1 text-center bg-gray-50/50">
                      {formatNumberBR(item.quant_estoque)}
                    </td>
                    <td className="py-1 px-1 text-center font-bold border-l border-gray-300">
                      {formatNumberBR(totalCounted)}
                    </td>
                    <td
                      className={`py-1 px-1 text-center font-bold ${
                        item.total < 0
                          ? "text-red-600"
                          : item.total > 0
                          ? "text-green-600"
                          : "text-gray-300"
                      }`}
                    >
                      {item.total === 0
                        ? "-"
                        : item.total > 0
                        ? `+${formatNumberBR(item.total)}`
                        : formatNumberBR(item.total)}
                    </td>

                    {config.showAuditColumn && (
                      <td className="py-1 px-1 text-center border-l border-black">
                        <div className="w-4 h-4 border border-gray-400 mx-auto rounded-sm"></div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 4. Rodapé de Assinaturas */}
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

ReportPreview.displayName = "ReportPreview";
