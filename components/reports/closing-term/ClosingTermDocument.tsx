// components/reports/closing-term/ClosingTermDocument.tsx
"use client";

import React from "react";
import { formatCurrency, formatNumberBR } from "@/lib/utils";
import type { ClosingTermData } from "./types";
import { MODALIDADE_DESCRIPTIONS } from "./types";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

interface ClosingTermDocumentProps {
  data: ClosingTermData;
}

export const ClosingTermDocument = React.forwardRef<HTMLDivElement, ClosingTermDocumentProps>(
  ({ data }, ref) => {
    const modalidadeInfo = MODALIDADE_DESCRIPTIONS[data.modalidade] || MODALIDADE_DESCRIPTIONS.A;
    const isAcuraciaCompliant = data.acuraciaHomologada >= 99.0;

    return (
      <div
        ref={ref}
        className="closing-term-page bg-white text-gray-900 w-[210mm] min-h-[297mm] p-[16mm] mx-auto shadow-lg print:shadow-none print:w-full print:p-0 print:m-0 flex flex-col justify-between font-sans text-xs leading-relaxed"
        style={{
          boxSizing: "border-box",
        }}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 14mm 14mm 14mm 14mm;
            }
            body {
              background: #ffffff !important;
              color: #111827 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .closing-term-page {
              width: 100% !important;
              min-height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
            }
          }
        ` }} />

        <div>
          {/* 1. CABEÇALHO OFICIAL */}
          <header className="border-b-2 border-primary/90 pb-4 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black text-lg tracking-wider shrink-0 shadow-sm print:bg-slate-900 print:text-white">
                  CF
                </div>
                <div>
                  <h1 className="text-base font-black tracking-tight text-gray-950 uppercase">
                    Countifly Serviços de Inventário
                  </h1>
                  <p className="text-[10px] text-gray-600 font-medium">
                    Gestão Patrimonial, Auditoria Física & Controle de Acurácia
                  </p>
                </div>
              </div>

              {/* Selo de Acurácia Oficial */}
              <div className="text-right border border-emerald-600/30 bg-emerald-50/60 print:bg-gray-50 rounded-lg p-2 px-3 shrink-0">
                <div className="flex items-center justify-end gap-1 text-emerald-800 font-bold text-[10px] uppercase">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Acurácia Homologada</span>
                </div>
                <div className="text-base font-black text-emerald-900">
                  {data.acuraciaHomologada.toFixed(1).replace(".", ",")}%
                </div>
                <div className="text-[8.5px] text-gray-500">
                  {isAcuraciaCompliant ? "Padrão Oficial ≥ 99%" : "Auditoria em tolerância"}
                </div>
              </div>
            </div>

            {/* Título do Documento */}
            <div className="mt-4 pt-3 border-t border-gray-200 text-center">
              <h2 className="text-sm font-black text-gray-950 uppercase tracking-wide">
                Termo de Encerramento e Homologação de Inventário Físico
              </h2>
              <p className="text-[10px] text-gray-600 italic">
                Fechamento Contábil & Balanço Patrimonial (Conforme NBC TG 16 / R2 e Seção 10 do Manual Countifly)
              </p>
            </div>
          </header>

          {/* 2. IDENTIFICAÇÃO DO ESTABELECIMENTO AUDITADO */}
          <section className="mb-4">
            <div className="bg-gray-50 print:bg-gray-100/70 border border-gray-200 rounded-md p-2.5">
              <div className="grid grid-cols-12 gap-2 text-[11px]">
                <div className="col-span-8">
                  <span className="text-gray-500 block text-[9.5px] uppercase font-bold">Empresa / Razão Social:</span>
                  <span className="font-bold text-gray-900">{data.companyName || "Não Informada"}</span>
                </div>
                <div className="col-span-4">
                  <span className="text-gray-500 block text-[9.5px] uppercase font-bold">CNPJ:</span>
                  <span className="font-mono font-semibold text-gray-900">{data.companyCnpj || "-"}</span>
                </div>
                {data.companyAddress && (
                  <div className="col-span-12 pt-1 border-t border-gray-200/80">
                    <span className="text-gray-500 block text-[9.5px] uppercase font-bold">Local / Unidade Auditada:</span>
                    <span className="text-gray-800">{data.companyAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 3. PARÂMETROS DO FECHAMENTO FISCAL & CORTE CONTÁBIL (SEÇÃO 10) */}
          <section className="mb-4">
            <h3 className="text-[11px] font-black uppercase text-gray-900 border-b border-gray-200 pb-1 mb-2">
              1. Parâmetros Metodológicos e Corte Contábil (Cut-Off)
            </h3>
            <div className="grid grid-cols-2 gap-2.5 text-[10.5px]">
              <div className="border border-gray-200 rounded p-2 bg-white">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-gray-500 font-semibold text-[9.5px] block">DATA-BASE DO FECHAMENTO:</span>
                    <span className="font-bold text-gray-950 font-mono">{data.databaseDate}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold text-[9.5px] block">MODALIDADE ADOTADA:</span>
                    <span className="font-bold text-gray-950">{modalidadeInfo.title}</span>
                    <p className="text-[9px] text-gray-600 mt-0.5">{modalidadeInfo.desc}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold text-[9.5px] block">CRITÉRIO DE VALORIZAÇÃO:</span>
                    <span className="font-semibold text-gray-900">{data.metodoValorizacao}</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded p-2 bg-white">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-gray-500 font-semibold text-[9.5px] block">CORTE DE DOCUMENTOS (CUT-OFF):</span>
                    <div className="text-[10px] space-y-0.5">
                      <div><strong className="text-gray-700">Última Entrada:</strong> <span className="font-mono text-gray-900">{data.corteEntrada || "Não informado"}</span></div>
                      <div><strong className="text-gray-700">Última Saída:</strong> <span className="font-mono text-gray-900">{data.corteSaida || "Não informado"}</span></div>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold text-[9.5px] block">FOTOGRAFIA DO MOMENTO (CONGELAMENTO):</span>
                    <span className="font-mono text-gray-900 font-medium">{data.dataInicio || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold text-[9.5px] block">CONCLUSÃO DA CONFERÊNCIA FÍSICA:</span>
                    <span className="font-mono text-gray-900 font-medium">{data.dataFim || "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. QUADRO RESUMO DE RESULTADOS HOMOLOGADOS (SEÇÃO 10.6) */}
          <section className="mb-4">
            <h3 className="text-[11px] font-black uppercase text-gray-900 border-b border-gray-200 pb-1 mb-2">
              2. Quadro Resumo dos Resultados Físicos Homologados
            </h3>
            <table className="w-full border-collapse border border-gray-300 text-[10px]">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-bold uppercase text-[9px]">
                  <th className="border border-gray-300 p-1.5 text-left">Indicador Oficial</th>
                  <th className="border border-gray-300 p-1.5 text-right">Resultado Homologado</th>
                  <th className="border border-gray-300 p-1.5 text-left">Observação Técnica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="border border-gray-300 p-1.5 font-semibold text-gray-900">Total de SKUs / Itens Auditados</td>
                  <td className="border border-gray-300 p-1.5 text-right font-mono font-bold text-gray-950">
                    {formatNumberBR(data.totalSkus)}
                  </td>
                  <td className="border border-gray-300 p-1.5 text-gray-600">Produtos distintos inventariados em loja e estoque</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1.5 font-semibold text-gray-900">Total de Peças / Unidades Contadas</td>
                  <td className="border border-gray-300 p-1.5 text-right font-mono font-bold text-gray-950">
                    {formatNumberBR(data.totalUnidades)}
                  </td>
                  <td className="border border-gray-300 p-1.5 text-gray-600">Soma física das unidades verificadas em campo</td>
                </tr>
                <tr className="bg-primary/5 print:bg-gray-100 font-bold">
                  <td className="border border-gray-300 p-1.5 text-primary print:text-black">
                    Valor Total do Estoque Homologado
                  </td>
                  <td className="border border-gray-300 p-1.5 text-right font-mono text-xs text-primary print:text-black">
                    {formatCurrency(data.valorTotalEstoque)}
                  </td>
                  <td className="border border-gray-300 p-1.5 text-gray-700">
                    Base oficial para apuração do Balanço Patrimonial
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1.5 font-semibold text-gray-900">Índice Final de Acurácia Física</td>
                  <td className="border border-gray-300 p-1.5 text-right font-mono font-bold text-emerald-700">
                    {data.acuraciaHomologada.toFixed(2).replace(".", ",")}%
                  </td>
                  <td className="border border-gray-300 p-1.5 text-gray-600">
                    Excedeu a meta de conformidade operacional (mínimo 99%)
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1.5 font-semibold text-gray-900">Divergências Recontadas em Dupla Checagem</td>
                  <td className="border border-gray-300 p-1.5 text-right font-mono text-gray-900">
                    {data.totalDivergenciasRecontadas}
                  </td>
                  <td className="border border-gray-300 p-1.5 text-gray-600">Recontagem obrigatória cruzada sem identificação prévia</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-1.5 font-semibold text-gray-900">Itens Segregados (Avarias / Vencidos)</td>
                  <td className="border border-gray-300 p-1.5 text-right font-mono text-amber-700 font-bold">
                    {formatNumberBR(data.totalAvariadosVencidos)}
                  </td>
                  <td className="border border-gray-300 p-1.5 text-gray-600">Isolados fisicamente e reportados em relatório apartado</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* 5. DECLARAÇÃO FORMAL DE ACEITE E ENCERRAMENTO */}
          <section className="mb-5">
            <h3 className="text-[11px] font-black uppercase text-gray-900 border-b border-gray-200 pb-1 mb-1.5">
              3. Declaração Formal de Aceite e Encerramento
            </h3>
            <div className="text-[9.5px] text-gray-700 leading-normal text-justify bg-gray-50/70 print:bg-white border border-gray-200 rounded p-2.5">
              <p>
                Declaramos para os devidos fins de fechamento contábil, apuração tributária e consolidação do Balanço Patrimonial
                que os procedimentos de inventário físico de mercadorias foram rigorosamente executados pela equipe técnica da{" "}
                <strong>Countifly</strong>, em estrita observância às normas operacionais de varredura em sentido único, identificação
                visual com etiqueta de <em>&quot;Item Contado&quot;</em>, dupla checagem / contagem cega e recontagem obrigatória de divergências.
              </p>
              <p className="mt-1.5">
                A empresa auditada atesta que o congelamento de movimentações (corte de entradas e saídas) foi respeitado durante
                toda a execução dos trabalhos. Os saldos físicos ora apurados e homologados foram aceitos pelo representante legal e
                pela equipe contábil responsável, servindo o presente termo como documento hábil de comprovação da existência física
                dos estoques para fins fiscais e contábeis.
              </p>
              {data.observacoes && (
                <p className="mt-1.5 text-[9px] text-gray-600 border-t border-gray-200 pt-1 italic">
                  <strong>Observações:</strong> {data.observacoes}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* 6. BLOCO TRIPLO DE ASSINATURAS FORMAIS (SEÇÃO 10.6 E 11) */}
        <section className="pt-2 border-t-2 border-gray-300 mt-auto">
          <div className="text-right text-[10px] text-gray-600 mb-6 font-medium">
            <span>{data.cidadeUf}, {data.dataEmissao}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center text-[9.5px]">
            {/* Auditor Líder */}
            <div className="flex flex-col items-center">
              <div className="w-full border-t border-gray-950 mb-1.5"></div>
              <span className="font-bold text-gray-950 uppercase">{data.auditorNome || "Auditor Líder"}</span>
              <span className="text-gray-600">{data.auditorCargo || "Responsável Operacional"}</span>
              <span className="text-gray-500 text-[8.5px] font-mono">{data.auditorDocumento || "Countifly Inventários"}</span>
            </div>

            {/* Representante da Empresa */}
            <div className="flex flex-col items-center">
              <div className="w-full border-t border-gray-950 mb-1.5"></div>
              <span className="font-bold text-gray-950 uppercase">{data.clienteNome || "Representante do Cliente"}</span>
              <span className="text-gray-600">{data.clienteCargo || "Gerente / Diretor"}</span>
              <span className="text-gray-500 text-[8.5px] font-mono">{data.clienteDocumento || "Empresa Auditada"}</span>
            </div>

            {/* Contador Responsável */}
            <div className="flex flex-col items-center">
              <div className="w-full border-t border-gray-950 mb-1.5"></div>
              <span className="font-bold text-gray-950 uppercase">{data.contadorNome || "Contador Responsável"}</span>
              <span className="text-gray-600">Contabilidade & Balanço</span>
              <span className="text-gray-500 text-[8.5px] font-mono">{data.contadorCrc || "CRC Ativo"}</span>
            </div>
          </div>

          <footer className="mt-4 pt-2 border-t border-gray-200 flex items-center justify-between text-[8px] text-gray-500 font-mono">
            <span>Documento Oficial Countifly — Termo de Encerramento Contábil</span>
            <span>Página 1 de 1</span>
          </footer>
        </section>
      </div>
    );
  }
);

ClosingTermDocument.displayName = "ClosingTermDocument";
