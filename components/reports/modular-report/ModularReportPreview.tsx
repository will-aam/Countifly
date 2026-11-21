// components/reports/modular-report/ModularReportPreview.tsx
"use client";

import React, { useMemo } from "react";
import { formatCurrency, formatNumberBR } from "@/lib/utils";
import {
  PaginatedReportPreview,
  paginateItems,
} from "../shared/PaginatedReportPreview";
import type {
  ModularReportConfig,
  ModularReportItem,
  ModularRecountLog,
} from "./types";
import {
  FileCheck2,
  Package,
  Layers,
  DollarSign,
  ShieldAlert,
} from "lucide-react";

interface ModularReportPreviewProps {
  config: ModularReportConfig;
  items: ModularReportItem[];
  recountLogs: ModularRecountLog[];
  snapshotDate?: string | null;
  corteEntrada?: string | null;
  corteSaida?: string | null;
}

function formatSimpleDateTime(val: string | undefined | null): string {
  if (!val) return "-";
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
  } catch {
    // fallback
  }
  return String(val).replace("T", " ").replace(/\.\d+Z?$/, "").slice(0, 16);
}

export const ModularReportPreview = React.forwardRef<
  HTMLDivElement,
  ModularReportPreviewProps
>(({ config, items, recountLogs, snapshotDate, corteEntrada, corteSaida }, ref) => {
  // Cálculos consolidados para KPIs
  const stats = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;
    let damagedCount = 0;
    let expiredCount = 0;
    const uniqueSkus = new Set<string>();

    items.forEach((item) => {
      const q = Number(item.quantidade || 0);
      const c = Number(item.custo || 0);
      totalQty += q;
      totalValue += q * c;

      const code = item.codigo_produto || item.codigo_de_barras;
      if (code) uniqueSkus.add(code);

      const status = String(item.status || item.status_item || "").toUpperCase();
      if (status === "AVARIADO") damagedCount += q;
      if (status === "VENCIDO") expiredCount += q;
    });

    return {
      totalQty,
      totalSkus: uniqueSkus.size,
      totalValue,
      damagedCount,
      expiredCount,
    };
  }, [items]);

  // Paginação dos itens: Paisagem comporta ~16 itens na pág 1 (com cabeçalho) e ~22 nas demais
  const firstPageSize = config.orientation === "landscape" ? 14 : 20;
  const subsequentPageSize = config.orientation === "landscape" ? 20 : 28;
  const chunks = useMemo(
    () => paginateItems(items, firstPageSize, subsequentPageSize),
    [items, firstPageSize, subsequentPageSize]
  );

  const logoSrc =
    config.useDefaultLogo || !config.logoDataUrl
      ? "/report-logo.png"
      : config.logoDataUrl;

  // Renderizador do Bloco de Auditoria & Corte de Documentos
  const renderAuditBlock = () => {
    const hasAuditData =
      snapshotDate || corteEntrada || corteSaida || recountLogs.length > 0;
    if (!hasAuditData) return null;

    return (
      <div className="mb-4 rounded-lg border-2 border-blue-900/40 bg-blue-50/40 p-3 text-black">
        <div className="flex items-center justify-between border-b border-blue-900/20 pb-1.5 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-blue-950 flex items-center gap-1.5">
            Fotografia do Momento & Auditoria de Cortes Contábeis
          </span>
          {snapshotDate && (
            <span className="text-[10px] font-mono font-medium text-blue-900">
              Congelamento: {new Date(snapshotDate).toLocaleString("pt-BR")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="rounded bg-white/80 p-2 border border-blue-200">
            <span className="text-[9px] uppercase font-semibold text-gray-500 block">
              Última NF Entrada (Compra)
            </span>
            <span className="font-mono font-bold text-blue-950 text-xs">
              {corteEntrada || "Não informada"}
            </span>
          </div>

          <div className="rounded bg-white/80 p-2 border border-blue-200">
            <span className="text-[9px] uppercase font-semibold text-gray-500 block">
              Último Cupom / NF Saída (Venda)
            </span>
            <span className="font-mono font-bold text-blue-950 text-xs">
              {corteSaida || "Não informado"}
            </span>
          </div>

          <div className="rounded bg-white/80 p-2 border border-blue-200">
            <span className="text-[9px] uppercase font-semibold text-gray-500 block">
              Auditoria de Corte (2ª Leitura)
            </span>
            <span className="font-mono font-bold text-blue-950 text-xs">
              {recountLogs.length > 0
                ? `${recountLogs.length} itens recontados e validados`
                : "Sem divergências recontadas"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Renderizador dos Cards de Resumo Executivo
  const renderKpiCards = () => {
    return (
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {config.kpis.totalQty && (
          <div className="rounded border border-gray-300 bg-gray-50 p-2.5 text-center">
            <span className="text-[10px] uppercase font-semibold text-gray-600 block flex items-center justify-center gap-1">
              <Package className="h-3 w-3 text-primary" /> Peças Contadas
            </span>
            <span className="text-xl font-black text-gray-950 mt-0.5 block">
              {formatNumberBR(stats.totalQty)}
            </span>
          </div>
        )}

        {config.kpis.totalSkus && (
          <div className="rounded border border-gray-300 bg-gray-50 p-2.5 text-center">
            <span className="text-[10px] uppercase font-semibold text-gray-600 block flex items-center justify-center gap-1">
              <Layers className="h-3 w-3 text-blue-600" /> SKUs Únicos
            </span>
            <span className="text-xl font-black text-blue-950 mt-0.5 block">
              {stats.totalSkus}
            </span>
          </div>
        )}

        {config.kpis.totalValue && (
          <div className="rounded border border-gray-300 bg-gray-50 p-2.5 text-center">
            <span className="text-[10px] uppercase font-semibold text-gray-600 block flex items-center justify-center gap-1">
              <DollarSign className="h-3 w-3 text-emerald-600" /> Valor Físico
            </span>
            <span className="text-xl font-black text-emerald-950 mt-0.5 block">
              {formatCurrency(stats.totalValue)}
            </span>
          </div>
        )}

        {(config.kpis.damagedCount || config.kpis.expiredCount) && (
          <div className="rounded border border-red-200 bg-red-50/50 p-2.5 text-center">
            <span className="text-[10px] uppercase font-semibold text-red-700 block flex items-center justify-center gap-1">
              <ShieldAlert className="h-3 w-3 text-red-600" /> Prevenção de Perdas
            </span>
            <span className="text-xs font-bold text-red-950 mt-1 block">
              {stats.damagedCount} avarias | {stats.expiredCount} vencidos
            </span>
          </div>
        )}
      </div>
    );
  };

  // Renderizador da Tabela de Recontagem / Auditoria de Corte
  const renderRecountTable = () => {
    if (!config.showRecountTable || recountLogs.length === 0) return null;

    return (
      <div className="mt-5 mb-4 rounded border border-blue-300 bg-blue-50/20 p-3 break-inside-avoid">
        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-2 flex items-center gap-1.5">
          <FileCheck2 className="h-3.5 w-3.5 text-blue-700" />
          Registro Oficial de Recontagem & Auditoria de Corte ({recountLogs.length} itens)
        </h4>
        <table className="w-full text-left text-[10px] border-collapse bg-white">
          <thead className="bg-blue-100/70 border-b border-blue-300 text-blue-950">
            <tr>
              <th className="p-1.5">Código / SKU</th>
              <th className="p-1.5">1ª Contagem</th>
              <th className="p-1.5">Saldo Sistema</th>
              <th className="p-1.5">Divergência 1ª</th>
              <th className="p-1.5 font-bold">2ª Contagem</th>
              <th className="p-1.5">Auditor Responsável</th>
              <th className="p-1.5 font-bold">Divergência Final</th>
              <th className="p-1.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-200/60 font-mono text-[9.5px]">
            {recountLogs.map((log, idx) => (
              <tr key={idx} className="hover:bg-blue-50/50">
                <td className="p-1.5 font-semibold text-black">{log.codigo}</td>
                <td className="p-1.5">{log.contagem_1a ?? "-"}</td>
                <td className="p-1.5">{log.saldo_sistema ?? "-"}</td>
                <td className="p-1.5">{log.diferenca_1a ?? "-"}</td>
                <td className="p-1.5 font-bold text-blue-900 bg-blue-50/80">{log.contagem_2a}</td>
                <td className="p-1.5 text-gray-700 font-sans">{log.auditor_2a || "Auditor 2"}</td>
                <td className="p-1.5 font-bold">{log.diferenca_final ?? "-"}</td>
                <td className="p-1.5">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-800">
                    {log.status_validacao || "VALIDADO"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Renderizador do Bloco de Assinaturas
  const renderSignatures = () => {
    if (!config.showSignatures) return null;

    return (
      <section className="mt-6 pt-4 border-t-2 border-black break-inside-avoid">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="mb-2 h-0.5 border-b border-black" />
            <p className="text-[10px] font-bold uppercase text-black">
              {config.signer1Title || "Auditor Líder / Conferente"}
            </p>
            {config.showCpfLine && (
              <p className="mt-2 text-[9px] text-gray-600">CPF: _______________________</p>
            )}
          </div>

          <div>
            <div className="mb-2 h-0.5 border-b border-black" />
            <p className="text-[10px] font-bold uppercase text-black">
              {config.signer2Title || "Gerente da Unidade / Loja"}
            </p>
            {config.showCpfLine && (
              <p className="mt-2 text-[9px] text-gray-600">CPF: _______________________</p>
            )}
          </div>

          <div>
            <div className="mb-2 h-0.5 border-b border-black" />
            <p className="text-[10px] font-bold uppercase text-black">
              {config.signer3Title || "Controladoria / Fiscal"}
            </p>
            {config.showCpfLine && (
              <p className="mt-2 text-[9px] text-gray-600">CPF: _______________________</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[9px] text-gray-500 font-sans">
          <span>Relatório gerado via Countifly - Gestão Inteligente de Estoque</span>
          <span>
            Emitido em: {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}
          </span>
        </div>
      </section>
    );
  };

  // Construção das Páginas
  const pages = chunks.map((pageItems, pageIndex) => {
    const isFirstPage = pageIndex === 0;
    const isLastPage = pageIndex === chunks.length - 1;

    return (
      <article
        key={pageIndex}
        data-orientation={config.orientation}
        className="report-page-content flex flex-col bg-white p-[10mm] text-black"
      >
        {/* Cabeçalho Oficial (Apenas na página 1) */}
        {isFirstPage && (
          <header className="mb-4 flex items-start justify-between border-b-2 border-black pb-3">
            <div className="flex items-start gap-4">
              {config.showLogo && (
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="h-14 max-w-[120px] object-contain shrink-0"
                />
              )}
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-blue-950">
                  {config.reportTitle}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-700">
                  {config.companyName && (
                    <span className="font-semibold text-black uppercase">
                      {config.companyName}
                    </span>
                  )}
                  {config.companyCnpj && (
                    <span className="font-mono text-[11px] text-gray-600">
                      CNPJ: {config.companyCnpj}
                    </span>
                  )}
                  <span className="text-gray-500 text-[11px]">
                    Data da Emissão: {new Date().toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Cards de Resumo Executivo & KPIs */}
        {isFirstPage && renderKpiCards()}

        {/* Bloco de Auditoria no Topo */}
        {isFirstPage &&
          config.auditBlockPosition === "top" &&
          renderAuditBlock()}

        {/* Tabela de Produtos */}
        <div className="min-h-0 flex-1 overflow-x-auto">
          <table className="w-full table-auto border-collapse text-left text-xs">
            <thead className="bg-gray-100 text-[9px] uppercase font-bold text-gray-800 border-b-2 border-black">
              <tr>
                {config.columns.barcode && <th className="p-1.5 whitespace-nowrap">Cód. Barras</th>}
                {config.columns.sku && <th className="p-1.5 whitespace-nowrap">SKU</th>}
                {config.columns.description && <th className="p-1.5">Descrição</th>}
                {config.columns.ncm && <th className="p-1.5 whitespace-nowrap">NCM</th>}
                {config.columns.location && <th className="p-1.5 whitespace-nowrap">Local</th>}
                {config.columns.validade && <th className="p-1.5 whitespace-nowrap">Validade</th>}
                {config.columns.lote && <th className="p-1.5 whitespace-nowrap">Lote</th>}
                {config.columns.status && <th className="p-1.5 whitespace-nowrap text-center">Condição</th>}
                {config.columns.loja && <th className="p-1.5 text-right whitespace-nowrap">Loja</th>}
                {config.columns.estoque && <th className="p-1.5 text-right whitespace-nowrap">Estoque</th>}
                {config.columns.totalQty && <th className="p-1.5 text-right whitespace-nowrap font-black">Total</th>}
                {config.columns.unitCost && <th className="p-1.5 text-right whitespace-nowrap">Custo R$</th>}
                {config.columns.totalValue && <th className="p-1.5 text-right whitespace-nowrap font-bold">Total R$</th>}
                {config.columns.curvaAbc && <th className="p-1.5 text-center whitespace-nowrap">ABC</th>}
                {config.columns.dateTime && <th className="p-1.5 text-right whitespace-nowrap">Leitura</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-[10px]">
              {pageItems.map((item, idx) => {
                const status = String(item.status || item.status_item || "NORMAL").toUpperCase();
                const isLoss = status === "AVARIADO" || status === "VENCIDO";
                const isWarningRow = config.highlightLosses && isLoss;

                return (
                  <tr
                    key={item.id || idx}
                    className={
                      isWarningRow
                        ? "bg-red-50/70 text-red-950 font-medium"
                        : "hover:bg-gray-50"
                    }
                  >
                    {config.columns.barcode && (
                      <td className="p-1.5 font-mono text-[9px] text-gray-700 whitespace-nowrap">
                        {item.codigo_de_barras || "-"}
                      </td>
                    )}
                    {config.columns.sku && (
                      <td className="p-1.5 font-mono text-[9px] text-gray-900 font-semibold whitespace-nowrap">
                        {item.codigo_produto || "-"}
                      </td>
                    )}
                    {config.columns.description && (
                      <td className="p-1.5 font-medium max-w-[240px] truncate" title={item.descricao}>
                        {item.descricao || "Item sem nome"}
                      </td>
                    )}
                    {config.columns.ncm && (
                      <td className="p-1.5 font-mono text-[9px] text-gray-700 whitespace-nowrap">
                        {item.ncm || "-"}
                      </td>
                    )}
                    {config.columns.location && (
                      <td className="p-1.5 text-gray-600 whitespace-nowrap">
                        {item.localizacao || "Padrão"}
                      </td>
                    )}
                    {config.columns.validade && (
                      <td className="p-1.5 font-mono text-[9px] text-gray-700 whitespace-nowrap">
                        {item.validade || "-"}
                      </td>
                    )}
                    {config.columns.lote && (
                      <td className="p-1.5 font-mono text-[9px] text-gray-700 whitespace-nowrap">
                        {item.lote || "-"}
                      </td>
                    )}
                    {config.columns.status && (
                      <td className="p-1.5 text-center whitespace-nowrap">
                        {status === "AVARIADO" ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-800">
                            AVARIA
                          </span>
                        ) : status === "VENCIDO" ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-100 text-red-800">
                            VENCIDO
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-medium bg-gray-100 text-gray-600">
                            NORMAL
                          </span>
                        )}
                      </td>
                    )}
                    {config.columns.loja && (
                      <td className="p-1.5 text-right font-mono text-[9.5px]">
                        {formatNumberBR(item.quant_loja || 0)}
                      </td>
                    )}
                    {config.columns.estoque && (
                      <td className="p-1.5 text-right font-mono text-[9.5px]">
                        {formatNumberBR(item.quant_estoque || 0)}
                      </td>
                    )}
                    {config.columns.totalQty && (
                      <td className="p-1.5 text-right font-mono font-black text-black">
                        {formatNumberBR(item.quantidade)}
                      </td>
                    )}
                    {config.columns.unitCost && (
                      <td className="p-1.5 text-right font-mono text-gray-700">
                        {formatCurrency(item.custo || 0)}
                      </td>
                    )}
                    {config.columns.totalValue && (
                      <td className="p-1.5 text-right font-mono font-bold text-gray-950">
                        {formatCurrency(item.valor_total || (item.quantidade * (item.custo || 0)))}
                      </td>
                    )}
                    {config.columns.curvaAbc && (
                      <td className="p-1.5 text-center font-bold text-[9px]">
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded ${item.curva_abc === "A"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.curva_abc === "B"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-700"
                            }`}
                        >
                          {item.curva_abc || "C"}
                        </span>
                      </td>
                    )}
                    {config.columns.dateTime && (
                      <td className="p-1.5 text-right font-mono text-[9px] text-gray-600 whitespace-nowrap">
                        {formatSimpleDateTime(item.data_hora)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tabela de Recontagem na Última Página */}
        {isLastPage && renderRecountTable()}

        {/* Bloco de Auditoria no Rodapé */}
        {isLastPage &&
          config.auditBlockPosition === "bottom" &&
          renderAuditBlock()}

        {/* Assinaturas na Última Página */}
        {isLastPage && renderSignatures()}

        {/* Numeração de Páginas */}
        <footer className="mt-auto pt-3 flex items-center justify-between text-[9px] text-gray-500 font-sans border-t border-gray-200">
          <span>Relatório de Inventário Físico - Modular</span>
          <span>Página {pageIndex + 1} de {chunks.length}</span>
        </footer>
      </article>
    );
  });

  return (
    <PaginatedReportPreview
      ref={ref}
      pages={pages}
      orientation={config.orientation}
    />
  );
});

ModularReportPreview.displayName = "ModularReportPreview";
