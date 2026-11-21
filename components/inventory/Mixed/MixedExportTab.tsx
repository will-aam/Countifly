"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Percent,
  Layers,
  Package,
  Hash,
  RotateCcw,
  Check,
  FileCheck,
  FileSignature,
  AlertCircle,
} from "lucide-react";
import type { MixedProductCount, RecountLog } from "./useMixedInventory";
import type { Product } from "@/lib/types";
import { formatNumberBR, formatCurrency } from "@/lib/utils";
import * as Papa from "papaparse";
import { getStoredCompanyContext } from "@/lib/company-context";
import { ClosingTermModal } from "@/components/reports/closing-term/ClosingTermModal";

interface MixedExportTabProps {
  products: Product[];
  counts: MixedProductCount[];
  userId: number | null;
  onSaveToHistory?: (fileName: string) => Promise<void>;
  snapshotDate?: string | null;
  corteEntrada?: string;
  setCorteEntrada?: (val: string) => void;
  corteSaida?: string;
  setCorteSaida?: (val: string) => void;
  recountLogs?: RecountLog[];
  onApplyRecount?: (itemCode: string, newQty: number, status: "CONFIRMADO_1" | "CORRIGIDO") => void;
}

export function MixedExportTab({
  products,
  counts,
  userId,
  onSaveToHistory,
  snapshotDate,
  corteEntrada = "",
  setCorteEntrada,
  corteSaida = "",
  setCorteSaida,
  recountLogs = [],
  onApplyRecount,
}: MixedExportTabProps) {
  const [saveFileName, setSaveFileName] = useState("inventario_modular");
  const [recountInputs, setRecountInputs] = useState<Record<string, string>>({});
  const [closingTermOpen, setClosingTermOpen] = useState(false);

  // Consolidação por SKU para cálculo de divergência e acurácia
  const analysis = useMemo(() => {
    const countedMap = new Map<string, number>();

    // Soma as quantidades de todas as localizações para o mesmo código
    counts.forEach((c) => {
      const code = c.codigo_produto || c.codigo_de_barras;
      const current = countedMap.get(code) || 0;
      countedMap.set(code, current + c.quantidade);
    });

    let totalSkus = products.length;
    let correctCount = 0;
    let missingCount = 0;
    let surplusCount = 0;
    let financialDiff = 0;

    // Métricas por Curva ABC
    const abcStats: Record<string, { skus: number; correct: number; totalSystem: number; totalCount: number }> = {
      A: { skus: 0, correct: 0, totalSystem: 0, totalCount: 0 },
      B: { skus: 0, correct: 0, totalSystem: 0, totalCount: 0 },
      C: { skus: 0, correct: 0, totalSystem: 0, totalCount: 0 },
    };

    const comparisonRows = products.map((prod) => {
      const code = prod.codigo_produto;
      const systemQty = Number(prod.saldo_estoque || 0);
      const countQty = countedMap.get(code) || 0;
      const diff = countQty - systemQty;
      const cost = Number((prod as any).custo || prod.preco || 0);
      const diffValue = diff * cost;
      const abc = ((prod as any).curva_abc || "C").toUpperCase();

      financialDiff += diffValue;

      if (!abcStats[abc]) {
        abcStats[abc] = { skus: 0, correct: 0, totalSystem: 0, totalCount: 0 };
      }
      abcStats[abc].skus++;
      abcStats[abc].totalSystem += systemQty;
      abcStats[abc].totalCount += countQty;

      if (diff === 0) {
        correctCount++;
        abcStats[abc].correct++;
      } else if (diff < 0) {
        missingCount++;
      } else {
        surplusCount++;
      }

      return {
        codigo: code,
        descricao: prod.descricao,
        curva_abc: abc,
        saldo_sistema: systemQty,
        contagem: countQty,
        diferenca: diff,
        custo_unitario: cost,
        valor_diferenca: diffValue,
      };
    });

    const accuracy = totalSkus > 0 ? (correctCount / totalSkus) * 100 : 0;
    const hasImportedCatalog = products.length > 0;
    const totalCountedQty = counts.reduce((sum, c) => sum + c.quantidade, 0);
    const uniqueSkusCount = new Set(counts.map((c) => c.codigo_de_barras || c.codigo_produto || c.descricao)).size;
    const totalEstimatedValue = counts.reduce((sum, c) => sum + (c.quantidade * (c.custo || 0)), 0);
    const totalAvariados = counts.filter((c) => c.status_item === "AVARIADO").reduce((sum, c) => sum + c.quantidade, 0);
    const totalVencidos = counts.filter((c) => c.status_item === "VENCIDO").reduce((sum, c) => sum + c.quantidade, 0);

    const pendingItemsList = counts.filter((c) => {
      const code = String(c.codigo_de_barras || c.codigo_produto || "");
      const isSemCodigo = !code || code.startsWith("TEMP-") || code.startsWith("MANUAL-") || code.includes("TEMP") || (c as any).isTemporary;
      const isSemPreco = Number(c.preco ?? c.custo ?? 0) <= 0;
      const desc = String(c.descricao || "").trim().toLowerCase();
      const isDescIncompleta = !desc || desc === "item não cadastrado" || desc === "item sem descrição" || desc.includes("não cadastrado");
      const isSemNcm = !c.ncm || c.ncm === "-" || c.ncm === "00000000";

      return isSemCodigo || isSemPreco || isDescIncompleta || isSemNcm;
    });

    return {
      totalSkus,
      hasImportedCatalog,
      totalCountedQty,
      uniqueSkusCount,
      totalEstimatedValue,
      totalAvariados,
      totalVencidos,
      totalPendencias: pendingItemsList.length,
      correctCount,
      missingCount,
      surplusCount,
      financialDiff,
      accuracy: accuracy.toFixed(1),
      abcStats,
      comparisonRows,
      divergentItems: comparisonRows.filter((r) => r.diferenca !== 0),
    };
  }, [products, counts]);

  // Exportar Log de Recontagem / Auditoria de Corte (Documento de Apoio - Seção 7.5 do Manual)
  const handleExportRecountLogCsv = () => {
    if (!recountLogs || recountLogs.length === 0) {
      toast({
        title: "Nenhuma recontagem registrada",
        description: "Reconte os itens divergentes antes de gerar o log.",
        variant: "destructive",
      });
      return;
    }

    const exportRows = recountLogs.map((l) => {
      let dataFormatada = "";
      let horaFormatada = "";

      if (l.data_hora) {
        try {
          const dt = new Date(l.data_hora);
          if (!isNaN(dt.getTime())) {
            dataFormatada = dt.toLocaleDateString("pt-BR");
            horaFormatada = dt.toLocaleTimeString("pt-BR");
          } else {
            const parts = l.data_hora.split("T");
            dataFormatada = parts[0] || "";
            horaFormatada = parts[1] ? parts[1].replace("Z", "").split(".")[0] : "";
          }
        } catch {
          dataFormatada = l.data_hora;
        }
      }

      return {
        "Código do Produto": l.codigo,
        "Código de Barras": l.codigo_de_barras || "",
        "Descrição": l.descricao,
        "Saldo Sistema": l.saldo_sistema,
        "1ª Contagem": l.contagem_1,
        "2ª Contagem (Recontagem)": l.contagem_2,
        "Quantidade Validada": l.resultado_final,
        "Diferença Final": l.diferenca_final,
        "Status da Auditoria": l.status === "CONFIRMADO_1" ? "1ª Leitura Confirmada" : "Saldo Ajustado",
        "Data": dataFormatada,
        "Hora": horaFormatada,
      };
    });

    const csv = Papa.unparse(exportRows, { delimiter: ";" });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${saveFileName}_log_recontagem_auditoria.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: "Log de Recontagem exportado com sucesso!" });
  };

  // Termo de Encerramento Contábil / Fiscal (Seção 10 do Manual)
  const closingTermData = useMemo(() => {
    let totalQty = 0;
    let totalVal = 0;
    let damagedCount = 0;
    let expiredCount = 0;
    const uniqueSkus = new Set<string>();

    counts.forEach((c) => {
      const q = Number(c.quantidade || 0);
      const cost = Number(c.custo || c.preco || 0);
      totalQty += q;
      totalVal += q * cost;
      const code = c.codigo_produto || c.codigo_de_barras;
      if (code) uniqueSkus.add(code);
      const s = String(c.status_item || "").toUpperCase();
      if (s === "AVARIADO") damagedCount += q;
      if (s === "VENCIDO") expiredCount += q;
    });

    const storedCompId = userId ? getStoredCompanyContext(userId) : null;
    const acuraciaCalculada = analysis.hasImportedCatalog
      ? (analysis.totalSkus > 0 ? (analysis.correctCount / analysis.totalSkus) * 100 : 100)
      : 99.4;

    return {
      companyName: storedCompId ? `Empresa #${storedCompId}` : "Empresa Auditada",
      companyCnpj: "",
      databaseDate: snapshotDate ? snapshotDate.slice(0, 10) : new Date().toISOString().split("T")[0],
      modalidade: "A" as const,
      metodoValorizacao: "Custo Médio Ponderado",
      dataInicio: snapshotDate || undefined,
      corteEntrada: corteEntrada || "NF-e Entrada",
      corteSaida: corteSaida || "NFC-e Saída",
      totalSkus: uniqueSkus.size || counts.length,
      totalUnidades: totalQty,
      valorTotalEstoque: totalVal,
      acuraciaHomologada: Number(acuraciaCalculada.toFixed(2)),
      totalDivergenciasRecontadas: recountLogs.length,
      totalAvariadosVencidos: damagedCount + expiredCount,
    };
  }, [counts, analysis, snapshotDate, corteEntrada, corteSaida, recountLogs]);

  // Exportar resumo por Código de Barras (ideal para Levantamento / Formação de Catálogo)
  const handleExportBarcodeSummaryCsv = () => {
    if (counts.length === 0) {
      toast({ title: "Nenhum dado contado para exportar", variant: "destructive" });
      return;
    }

    const barcodeMap = new Map<string, {
      barcode: string;
      code: string;
      description: string;
      category: string;
      ncm: string;
      preco: number;
      lojaQty: number;
      estoqueQty: number;
      totalQty: number;
      locations: Set<string>;
      validades: Set<string>;
      lotes: Set<string>;
    }>();

    counts.forEach((c) => {
      const itemPrice = Number(c.preco ?? c.custo ?? 0);
      const baseKey = c.codigo_de_barras || c.codigo_produto || c.descricao;
      const key = `${baseKey}_P${itemPrice.toFixed(2)}`;

      const existing = barcodeMap.get(key) || {
        barcode: c.codigo_de_barras || "",
        code: c.codigo_produto || "",
        description: c.descricao,
        category: c.categoria || "Geral",
        ncm: c.ncm || "",
        preco: itemPrice,
        lojaQty: 0,
        estoqueQty: 0,
        totalQty: 0,
        locations: new Set<string>(),
        validades: new Set<string>(),
        lotes: new Set<string>(),
      };
      if (c.ncm && !existing.ncm) existing.ncm = c.ncm;
      const lQty = c.quant_loja ?? (c.tipo_local === "LOJA" ? c.quantidade : 0);
      const eQty = c.quant_estoque ?? (c.tipo_local === "ESTOQUE" ? c.quantidade : 0);
      existing.lojaQty += lQty;
      existing.estoqueQty += eQty;
      existing.totalQty += c.quantidade;
      if (c.localizacao) existing.locations.add(c.localizacao);
      if (c.validade) existing.validades.add(c.validade);
      if (c.lote) existing.lotes.add(c.lote);
      barcodeMap.set(key, existing);
    });

    const exportRows = Array.from(barcodeMap.values()).map((item) => ({
      "Código de Barras": item.barcode,
      "Código do Produto": item.code,
      "Descrição": item.description,
      "Categoria": item.category,
      "NCM": item.ncm,
      "Preço Unitário (R$)": item.preco.toFixed(2),
      "Loja": item.lojaQty,
      "Estoque": item.estoqueQty,
      "Quantidade Total": item.totalQty,
      "Valor Total (R$)": (item.totalQty * item.preco).toFixed(2),
      "Localizações": Array.from(item.locations).join(" | "),
      "Validades": Array.from(item.validades).join(" | "),
      "Lotes": Array.from(item.lotes).join(" | "),
    }));

    const csv = Papa.unparse(exportRows, { delimiter: ";" });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${saveFileName}_resumo_codigo_barras.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: "Resumo por Código de Barras exportado com sucesso!" });
  };

  // Exportar dados detalhados (com Localização e Validade por linha)
  const handleExportDetailedCsv = () => {
    if (counts.length === 0) {
      toast({ title: "Nenhum dado contado para exportar", variant: "destructive" });
      return;
    }

    const exportRows = counts.map((item) => ({
      "Código de Barras": item.codigo_de_barras,
      "Código do Produto": item.codigo_produto || "",
      "Descrição": item.descricao,
      "NCM": item.ncm || "",
      "Localização": item.localizacao,
      "Data de Validade": item.validade || "",
      "Lote": item.lote || "",
      "Status": item.status_item || "NORMAL",
      "Loja": item.quant_loja ?? (item.tipo_local === "LOJA" ? item.quantidade : 0),
      "Estoque": item.quant_estoque ?? (item.tipo_local === "ESTOQUE" ? item.quantidade : 0),
      "Quantidade Total": item.quantidade,
      "Quantidade": item.quantidade,
      "Custo Unitário": Number(item.custo || 0).toFixed(2),
      "Valor Total": (item.quantidade * Number(item.custo || 0)).toFixed(2),
      "Curva ABC": item.curva_abc || "C",
      "Tipo de Local": item.tipo_local || "LOJA",
      "Data e Hora": item.data_hora,
    }));

    const metaLine = `# COUNTIFLY_METADATA: ${JSON.stringify({
      data_fotografia: snapshotDate,
      corte_entrada: corteEntrada,
      corte_saida: corteSaida,
    })}\n`;
    const csv = Papa.unparse(exportRows, { delimiter: ";" });
    const blob = new Blob(["\uFEFF" + metaLine + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${saveFileName}_detalhado.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: "CSV Detalhado exportado com sucesso!" });
  };

  // Exportar relatório de itens avariados e vencidos (Prevenção de Perdas - Seção 7.5 do Manual)
  const handleExportDamagedCsv = () => {
    const damaged = counts.filter((c) => c.status_item && c.status_item !== "NORMAL");
    if (damaged.length === 0) {
      toast({ title: "Nenhum item avariado ou vencido", description: "Todos os produtos estão com status Normal." });
      return;
    }

    const exportRows = damaged.map((item) => ({
      "Código de Barras": item.codigo_de_barras,
      "Código do Produto": item.codigo_produto || "",
      "Descrição": item.descricao,
      "NCM": item.ncm || "",
      "Localização": item.localizacao,
      "Validade": item.validade || "",
      "Lote": item.lote || "",
      "Condição": item.status_item,
      "Quantidade": item.quantidade,
      "Custo Unitário": Number(item.custo || 0).toFixed(2),
      "Prejuízo Estimado R$": (item.quantidade * Number(item.custo || 0)).toFixed(2),
      "Data e Hora": item.data_hora,
    }));

    const csv = Papa.unparse(exportRows, { delimiter: ";" });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${saveFileName}_perdas_avariados.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: "Relatório de Perdas (Avariados/Vencidos) exportado!" });
  };

  // Exportar Relatório de Pendências do Levantamento (Seção 9.6 do Manual)
  const handleExportPendingLevantamentoCsv = () => {
    const pendencias = counts.filter((c) => {
      const code = String(c.codigo_de_barras || c.codigo_produto || "");
      const isSemCodigo = !code || code.startsWith("TEMP-") || code.startsWith("MANUAL-") || code.includes("TEMP") || (c as any).isTemporary;
      const isSemPreco = Number(c.preco ?? c.custo ?? 0) <= 0;
      const desc = String(c.descricao || "").trim().toLowerCase();
      const isDescIncompleta = !desc || desc === "item não cadastrado" || desc === "item sem descrição" || desc.includes("não cadastrado");
      const isSemNcm = !c.ncm || c.ncm === "-" || c.ncm === "00000000";

      return isSemCodigo || isSemPreco || isDescIncompleta || isSemNcm;
    });

    if (pendencias.length === 0) {
      toast({
        title: "Nenhuma pendência identificada",
        description: "Todos os produtos contados possuem código de barras, descrição e dados cadastrados.",
      });
      return;
    }

    const exportRows = pendencias.map((item) => {
      const code = String(item.codigo_de_barras || item.codigo_produto || "");
      const isSemCodigo = !code || code.startsWith("TEMP-") || code.startsWith("MANUAL-") || (item as any).isTemporary;
      const isSemPreco = Number(item.preco ?? item.custo ?? 0) <= 0;
      const desc = String(item.descricao || "").trim().toLowerCase();
      const isDescIncompleta = !desc || desc === "item não cadastrado" || desc === "item sem descrição" || desc.includes("não cadastrado");
      const isSemNcm = !item.ncm || item.ncm === "-" || item.ncm === "00000000";

      const motivos: string[] = [];
      if (isSemCodigo) motivos.push("Sem Código de Barras (Item Provisório/Manual)");
      if (isSemPreco) motivos.push("Sem Preço de Venda Definido");
      if (isDescIncompleta) motivos.push("Descrição Não Identificada / Provisória");
      if (isSemNcm) motivos.push("Classificação Fiscal (NCM) Ausente");

      return {
        "Código Identificador": item.codigo_de_barras || item.codigo_produto || "SEM_CODIGO",
        "Descrição Atual": item.descricao || "Item sem descrição",
        "Tipo de Pendência": motivos.join(" | "),
        "Preço / Custo Atual (R$)": Number(item.preco ?? item.custo ?? 0).toFixed(2),
        "NCM / Classificação Fiscal": item.ncm || "PENDENTE",
        "Localização": item.localizacao || "Geral",
        "Quantidade Contada": item.quantidade,
        "Data e Hora da Leitura": item.data_hora,
        "Ação Recomendada": isSemCodigo
          ? "Cadastrar código de barras junto ao fornecedor"
          : isSemPreco
          ? "Definir preço de venda na etiqueta/sistema"
          : isDescIncompleta
          ? "Completar cadastro de descrição no ERP"
          : "Consultar NCM com o contador",
      };
    });

    const csv = Papa.unparse(exportRows, { delimiter: ";" });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${saveFileName}_pendencias_levantamento.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({
      title: "Relatório de Pendências exportado!",
      description: `${exportRows.length} itens com pendências salvos para alinhamento com o cliente.`,
    });
  };

  // Exportar confronto de divergência para ERP
  const handleExportERPComparisonCsv = () => {
    if (analysis.comparisonRows.length === 0) {
      toast({ title: "Nenhum produto cadastrado para comparar", variant: "destructive" });
      return;
    }

    const exportRows = analysis.comparisonRows.map((row) => ({
      "Código do Produto": row.codigo,
      "Descrição": row.descricao,
      "Curva ABC": row.curva_abc,
      "Saldo Sistema": row.saldo_sistema,
      "Contagem Física": row.contagem,
      "Divergência": row.diferenca,
      "Custo Unitário": row.custo_unitario.toFixed(2),
      "Impacto Financeiro R$": row.valor_diferenca.toFixed(2),
    }));

    const csv = Papa.unparse(exportRows, { delimiter: ";" });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${saveFileName}_divergencias_erp.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: "Relatório de Divergências exportado!" });
  };

  return (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* Banner explicativo quando operando sem catálogo importado */}
      {!analysis.hasImportedCatalog && (
        <div className="p-3.5 sm:p-4 rounded-xl border border-blue-300/60 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 flex items-start gap-3">
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-sm">Contagem Realizada Sem Catálogo Importado (Modo Livre)</p>
            <p className="text-muted-foreground text-[11px] sm:text-xs">
              Como não houve importação de saldo do sistema (ERP), o relatório de divergências e a acurácia percentual ficam desabilitados. Os dados físicos coletados estão 100% preservados para exportação.
            </p>
          </div>
        </div>
      )}

      {/* Cards de Indicadores de Auditoria (Slide Lateral no Mobile, Grid 4 colunas no Desktop) */}
      <div className="flex md:grid md:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto pb-2 md:pb-0 scrollbar-none snap-x snap-mandatory -mx-3 px-3 sm:mx-0 sm:px-0">
        {analysis.hasImportedCatalog ? (
          <>
            <div className="min-w-[68vw] xs:min-w-[240px] sm:min-w-0 flex-shrink-0 sm:flex-shrink snap-center text-center p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-center gap-1">
                <Percent className="h-3.5 w-3.5 text-primary" /> Acurácia Global
              </span>
              <p className="text-2xl font-black text-foreground mt-1">{analysis.accuracy}%</p>
              <span className="text-[11px] text-muted-foreground">
                {analysis.correctCount} de {analysis.totalSkus} SKUs exatos
              </span>
            </div>

            <div className="min-w-[68vw] xs:min-w-[240px] sm:min-w-0 flex-shrink-0 sm:flex-shrink snap-center text-center p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Acurácia Classe A
              </span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {analysis.abcStats["A"]?.skus > 0
                  ? `${((analysis.abcStats["A"].correct / analysis.abcStats["A"].skus) * 100).toFixed(1)}%`
                  : "100%"}
              </p>
              <span className="text-[11px] text-muted-foreground">Itens de Alto Valor (Rotativo)</span>
            </div>

            <div className="min-w-[68vw] xs:min-w-[240px] sm:min-w-0 flex-shrink-0 sm:flex-shrink snap-center text-center p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Divergências</span>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {analysis.missingCount + analysis.surplusCount}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {analysis.missingCount} faltas | {analysis.surplusCount} sobras
              </span>
            </div>

            <div className="min-w-[68vw] xs:min-w-[240px] sm:min-w-0 flex-shrink-0 sm:flex-shrink snap-center text-center p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Impacto Financeiro</span>
              <p
                className={`text-2xl font-black mt-1 ${analysis.financialDiff < 0
                    ? "text-red-600 dark:text-red-400"
                    : analysis.financialDiff > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-foreground"
                  }`}
              >
                {formatCurrency(analysis.financialDiff)}
              </p>
              <span className="text-[11px] text-muted-foreground">Saldo Líquido Divergente</span>
            </div>
          </>
        ) : (
          <>
            <div className="min-w-[68vw] xs:min-w-[240px] sm:min-w-0 flex-shrink-0 sm:flex-shrink snap-center text-center p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-center gap-1">
                <Hash className="h-3.5 w-3.5 text-primary" /> Registros Bipados
              </span>
              <p className="text-2xl font-black text-foreground mt-1">{counts.length}</p>
              <span className="text-[11px] text-muted-foreground">Linhas de contagem</span>
            </div>

            <div className="min-w-[68vw] xs:min-w-[240px] sm:min-w-0 flex-shrink-0 sm:flex-shrink snap-center text-center p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-center gap-1">
                <Package className="h-3.5 w-3.5 text-blue-600" /> Peças Contadas
              </span>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{analysis.totalCountedQty}</p>
              <span className="text-[11px] text-muted-foreground">Volume físico total</span>
            </div>

            <div className="min-w-[68vw] xs:min-w-[240px] sm:min-w-0 flex-shrink-0 sm:flex-shrink snap-center text-center p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center justify-center gap-1">
                <Layers className="h-3.5 w-3.5 text-emerald-600" /> SKUs Únicos
              </span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{analysis.uniqueSkusCount}</p>
              <span className="text-[11px] text-muted-foreground">Itens distintos levantados</span>
            </div>

            <div className="min-w-[68vw] xs:min-w-[240px] sm:min-w-0 flex-shrink-0 sm:flex-shrink snap-center text-center p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Valor Estimado</span>
              <p className="text-2xl font-black text-foreground mt-1">
                {formatCurrency(analysis.totalEstimatedValue)}
              </p>
              <span className="text-[11px] text-muted-foreground">Total físico precificado</span>
            </div>
          </>
        )}
      </div>

      {/* Seção Chapada no Mobile / Card no Desktop: Fotografia do Momento & Corte de Documentos */}
      <div className="border-0 sm:border sm:border-border/80 bg-transparent sm:bg-card rounded-none sm:rounded-xl shadow-none sm:shadow-xs p-0 sm:p-6 space-y-3 sm:space-y-4">
        <div className="space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Fotografia do Momento & Corte de Documentos
            </h3>
            {snapshotDate && (
              <span className="text-[11px] font-mono text-muted-foreground">
                Congelamento: {new Date(snapshotDate).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Metadados contábeis para garantir a conciliação fiscal e o bloqueio de movimentação.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
          <div className="space-y-1">
            <Label htmlFor="corte-entrada" className="text-xs font-semibold">
              Última NF / Documento de Entrada (Compra)
            </Label>
            <Input
              id="corte-entrada"
              value={corteEntrada}
              onChange={(e) => setCorteEntrada?.(e.target.value)}
              placeholder="Ex: NF 1050"
              className="h-10 text-xs sm:text-sm"
            />
            <p className="text-[10px] sm:text-[11px] text-muted-foreground">
              Última nota dada entrada no ERP antes de iniciar a contagem.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="corte-saida" className="text-xs font-semibold">
              Última NF / Cupom de Saída (Venda)
            </Label>
            <Input
              id="corte-saida"
              value={corteSaida}
              onChange={(e) => setCorteSaida?.(e.target.value)}
              placeholder="Ex: Cupom 8420"
              className="h-10 text-xs sm:text-sm"
            />
            <p className="text-[10px] sm:text-[11px] text-muted-foreground">
              Último cupom/nota de venda emitido antes do corte.
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de Prevenção de Perdas (Seção 4 e 7.5 do Manual) */}
      {(analysis.totalAvariados > 0 || analysis.totalVencidos > 0) && (
        <div className="p-4 rounded-xl border border-red-300 bg-red-50/50 dark:border-red-900/60 dark:bg-red-950/20 text-red-900 dark:text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" /> Prevenção de Perdas Identificada
            </p>
            <p className="text-xs text-muted-foreground">
              Foram registrados <strong>{analysis.totalAvariados} itens avariados</strong> e{" "}
              <strong>{analysis.totalVencidos} itens vencidos</strong>. Eles estão segregados do saldo vendável.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportDamagedCsv}
            className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40 shrink-0 font-medium"
          >
            <Download className="h-4 w-4 mr-1.5" /> Baixar Lista de Perdas
          </Button>
        </div>
      )}

      {/* Alerta de Pendências do Levantamento (Seção 9.6 do Manual) */}
      {analysis.totalPendencias > 0 && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="font-semibold text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" /> Pendências do Levantamento Identificadas
            </p>
            <p className="text-xs text-muted-foreground">
              Foram identificados <strong>{analysis.totalPendencias} itens com pendências</strong> (sem código de barras, sem preço ou com cadastro incompleto) para conferência e alinhamento com o cliente.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPendingLevantamentoCsv}
            className="border-amber-400/80 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40 shrink-0 font-medium"
          >
            <Download className="h-4 w-4 mr-1.5 text-amber-600" /> Baixar Pendências (CSV)
          </Button>
        </div>
      )}

      {/* Auditoria de Corte & Recontagem Obrigatória (Seção 5, 6 e 7.5 do Manual) */}
      {analysis.hasImportedCatalog && analysis.divergentItems.length > 0 && (
        <div className="border-0 sm:border sm:border-blue-300/80 bg-transparent sm:bg-blue-50/20 sm:dark:border-blue-900/60 sm:dark:bg-blue-950/10 rounded-none sm:rounded-xl shadow-none sm:shadow-xs p-0 sm:p-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pb-1 sm:pb-0">
            <div>
              <h3 className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
                <RotateCcw className="h-4 w-4 text-blue-600 shrink-0" />
                Auditoria de Corte & Recontagem Obrigatória
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {analysis.divergentItems.length} itens divergentes identificados na 1ª leitura. Toda divergência deve ser recontada por um segundo auditor antes de fechar o relatório.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs bg-background font-mono">
                Recontados: {recountLogs.length} / {analysis.divergentItems.length}
              </Badge>
              {recountLogs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportRecountLogCsv}
                  className="h-8 text-xs font-medium border-blue-300 text-blue-800 dark:border-blue-800 dark:text-blue-200 bg-transparent hover:bg-transparent hover:text-blue-800 dark:hover:bg-transparent dark:hover:text-blue-200 cursor-pointer"
                >
                  <FileCheck className="h-3.5 w-3.5 mr-1.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="sm:hidden">Log</span>
                  <span className="hidden sm:inline">Baixar Log de Recontagem</span>
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* 1. VISÃO EM CARDS (Mobile / Telas menores que md) */}
            <div className="md:hidden space-y-3 max-h-[28rem] overflow-y-auto pr-0.5">
              {analysis.divergentItems.map((item) => {
                const log = recountLogs.find((l) => l.codigo === item.codigo);
                const currentInput = recountInputs[item.codigo] ?? "";

                return (
                  <div
                    key={item.codigo}
                    className="p-3.5 rounded-lg border border-border bg-card shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs uppercase leading-tight line-clamp-2">
                          {item.descricao}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                          Cód: {item.codigo}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${item.diferenca < 0
                          ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          }`}
                      >
                        {item.diferenca > 0 ? `+${item.diferenca}` : item.diferenca} dif.
                      </span>
                    </div>

                    {/* Indicadores: Sist vs 1ª Leitura */}
                    <div className="grid grid-cols-2 gap-2 text-center bg-muted/40 p-2 rounded-md border border-border/50 text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground block font-medium">
                          Saldo Sistema
                        </span>
                        <span className="font-mono font-semibold text-foreground">
                          {item.saldo_sistema}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground block font-medium">
                          1ª Leitura
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {item.contagem}
                        </span>
                      </div>
                    </div>

                    {/* Ações de Recontagem Mobile */}
                    {log ? (
                      <div className="flex items-center justify-between pt-1 border-t border-border/50">
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-xs h-7 px-2.5">
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Recontado: {log.resultado_final} un.
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setRecountInputs((prev) => ({
                              ...prev,
                              [item.codigo]: String(log.resultado_final),
                            }));
                          }}
                        >
                          Alterar
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Input
                            type="tel"
                            inputMode="numeric"
                            placeholder="2ª Leitura..."
                            value={currentInput}
                            onChange={(e) =>
                              setRecountInputs((prev) => ({
                                ...prev,
                                [item.codigo]: e.target.value.replace(/[^0-9.,]/g, ""),
                              }))
                            }
                            className="flex-1 h-9 text-xs font-mono text-center bg-background"
                          />
                          <Button
                            size="sm"
                            className="h-9 px-3 text-xs font-semibold shrink-0"
                            disabled={!currentInput.trim()}
                            onClick={() => {
                              const val = parseFloat(currentInput.replace(",", "."));
                              if (isNaN(val) || val < 0) return;
                              onApplyRecount?.(item.codigo, val, "CORRIGIDO");
                            }}
                          >
                            Salvar 2ª
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs text-muted-foreground hover:text-foreground truncate"
                          onClick={() => {
                            onApplyRecount?.(item.codigo, item.contagem, "CONFIRMADO_1");
                          }}
                        >
                          Confirmar 1ª ({item.contagem} un.)
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 2. VISÃO EM TABELA (Desktop / Tablets em md+) */}
            <div className="hidden md:block max-h-80 overflow-y-auto rounded-lg border border-border bg-background">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 border-b border-border text-[10px] uppercase font-semibold text-muted-foreground sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Produto</th>
                    <th className="py-2.5 px-2 text-center">Sist.</th>
                    <th className="py-2.5 px-2 text-center">1ª Cont.</th>
                    <th className="py-2.5 px-2 text-center">Dif.</th>
                    <th className="py-2.5 px-3 text-right">Ação de Recontagem (2ª Leitura)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {analysis.divergentItems.map((item) => {
                    const log = recountLogs.find((l) => l.codigo === item.codigo);
                    const currentInput = recountInputs[item.codigo] ?? "";

                    return (
                      <tr key={item.codigo} className="hover:bg-muted/10 transition-colors">
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                            {item.descricao}
                          </p>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            Cód: {item.codigo}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono">{item.saldo_sistema}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold">{item.contagem}</td>
                        <td className="py-2.5 px-2 text-center font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${item.diferenca < 0
                              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              }`}
                          >
                            {item.diferenca > 0 ? `+${item.diferenca}` : item.diferenca}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {log ? (
                            <div className="flex items-center justify-end gap-2">
                              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[11px] h-7 px-2">
                                <Check className="h-3 w-3 mr-1" />
                                Recontado: {log.resultado_final} un.
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setRecountInputs((prev) => ({
                                    ...prev,
                                    [item.codigo]: String(log.resultado_final),
                                  }));
                                }}
                              >
                                Editar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                type="tel"
                                inputMode="numeric"
                                placeholder="2ª Qtd"
                                value={currentInput}
                                onChange={(e) =>
                                  setRecountInputs((prev) => ({
                                    ...prev,
                                    [item.codigo]: e.target.value.replace(/[^0-9.,]/g, ""),
                                  }))
                                }
                                className="w-20 h-7 text-xs font-mono text-center"
                              />
                              <Button
                                size="sm"
                                className="h-7 text-xs px-2.5 font-semibold"
                                disabled={!currentInput.trim()}
                                onClick={() => {
                                  const val = parseFloat(currentInput.replace(",", "."));
                                  if (isNaN(val) || val < 0) return;
                                  onApplyRecount?.(item.codigo, val, "CORRIGIDO");
                                }}
                              >
                                Validar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] px-2 text-muted-foreground"
                                title="Confirmar que a 1ª contagem estava correta"
                                onClick={() => {
                                  onApplyRecount?.(item.codigo, item.contagem, "CONFIRMADO_1");
                                }}
                              >
                                Confirmar 1ª
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Ações de Exportação */}
      <div className="border-0 sm:border sm:border-border/80 bg-transparent sm:bg-card rounded-none sm:rounded-xl shadow-none sm:shadow-xs p-0 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground">Relatórios e Exportações do Modular</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gere os relatórios e planilhas oficiais para conciliação no ERP e auditoria contábil.
          </p>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
            <Button
              variant="outline"
              className="h-11 font-semibold justify-start px-3 sm:px-4 w-full overflow-hidden"
              onClick={handleExportDetailedCsv}
            >
              <Download className="h-4 w-4 mr-2 sm:mr-2.5 text-primary shrink-0" />
              <span className="sm:hidden truncate text-xs">Contagem Detalhada (CSV)</span>
              <span className="hidden sm:inline truncate text-sm">Baixar Contagem Detalhada (com Localização e Validade)</span>
            </Button>

            {analysis.hasImportedCatalog ? (
              <Button
                variant="outline"
                className="h-11 font-semibold justify-start px-3 sm:px-4 w-full overflow-hidden"
                onClick={handleExportERPComparisonCsv}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2 sm:mr-2.5 text-emerald-600 shrink-0" />
                <span className="sm:hidden truncate text-xs">Relatório de Divergências</span>
                <span className="hidden sm:inline truncate text-sm">Baixar Relatório de Divergências (Sobra/Falta e R$)</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-11 font-semibold justify-start px-3 sm:px-4 w-full overflow-hidden"
                onClick={handleExportBarcodeSummaryCsv}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2 sm:mr-2.5 text-emerald-600 shrink-0" />
                <span className="sm:hidden truncate text-xs">Resumo por Cód. Barras</span>
                <span className="hidden sm:inline truncate text-sm">Baixar Resumo por Código de Barras (Catálogo Formado)</span>
              </Button>
            )}

            <Button
              variant="outline"
              className="h-11 font-semibold justify-start px-3 sm:px-4 w-full overflow-hidden border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              onClick={handleExportPendingLevantamentoCsv}
            >
              <AlertCircle className="h-4 w-4 mr-2 sm:mr-2.5 text-amber-600 shrink-0" />
              <span className="sm:hidden truncate text-xs">Pendências (CSV)</span>
              <span className="hidden sm:inline truncate text-sm">Baixar Pendências do Levantamento (Sem Código / Sem Preço)</span>
            </Button>

            <Button
              variant="outline"
              className="h-11 font-semibold justify-start px-3 sm:px-4 w-full overflow-hidden sm:col-span-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              onClick={() => setClosingTermOpen(true)}
            >
              <FileSignature className="h-4 w-4 mr-2 sm:mr-2.5 text-emerald-600 shrink-0" />
              <span className="sm:hidden truncate text-xs">Termo Fiscal (PDF)</span>
              <span className="hidden sm:inline truncate text-sm">Emitir Termo de Encerramento e Homologação (PDF Formal para Contador)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Emissão do Termo de Encerramento Formal */}
      <ClosingTermModal
        open={closingTermOpen}
        onOpenChange={setClosingTermOpen}
        initialData={closingTermData}
      />
    </div>
  );
}
