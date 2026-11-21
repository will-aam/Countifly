// app/(private)/inventory/history/[id]/modular-report/page.tsx
"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer, Download, Settings2, Eye, FileSpreadsheet, FileSignature, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useReactToPrint } from "react-to-print";
import Papa from "papaparse";
import {
  type ModularReportConfig,
  defaultModularReportConfig,
  type ModularReportItem,
  type ModularRecountLog,
} from "@/components/reports/modular-report/types";
import { ModularReportConfigPanel } from "@/components/reports/modular-report/ModularReportConfigPanel";
import { ModularReportPreview } from "@/components/reports/modular-report/ModularReportPreview";
import { ClosingTermModal } from "@/components/reports/closing-term/ClosingTermModal";

export default function ModularReportPage() {
  const router = useRouter();
  const params = useParams();
  const historyId = params?.id as string;

  const [userId, setUserId] = useState<number | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<ModularReportItem[]>([]);
  const [recountLogs, setRecountLogs] = useState<ModularRecountLog[]>([]);
  const [snapshotDate, setSnapshotDate] = useState<string | null>(null);
  const [corteEntrada, setCorteEntrada] = useState<string | null>(null);
  const [corteSaida, setCorteSaida] = useState<string | null>(null);
  const [fileName, setFileName] = useState("inventario_modular");

  const [config, setConfig] = useState<ModularReportConfig>(defaultModularReportConfig);
  const [closingTermOpen, setClosingTermOpen] = useState(false);

  const componentRef = useRef<HTMLDivElement>(null);

  // Termo de Encerramento (Seção 10 do Manual)
  const initialClosingTermData = useMemo(() => {
    let totalQty = 0;
    let totalVal = 0;
    let damagedCount = 0;
    let expiredCount = 0;
    const uniqueSkus = new Set<string>();

    items.forEach((it) => {
      const q = Number(it.quantidade || 0);
      const c = Number(it.custo || 0);
      totalQty += q;
      totalVal += q * c;
      const code = it.codigo_produto || it.codigo_de_barras;
      if (code) uniqueSkus.add(code);
      const s = String(it.status || it.status_item || "").toUpperCase();
      if (s === "AVARIADO") damagedCount += q;
      if (s === "VENCIDO") expiredCount += q;
    });

    return {
      companyName: config.companyName || fileName,
      companyCnpj: config.companyCnpj || "",
      databaseDate: snapshotDate ? snapshotDate.slice(0, 10) : new Date().toISOString().split("T")[0],
      modalidade: "A" as const,
      metodoValorizacao: "Custo Médio Ponderado",
      dataInicio: snapshotDate || undefined,
      corteEntrada: corteEntrada || "NF-e Entrada",
      corteSaida: corteSaida || "NFC-e Saída",
      totalSkus: uniqueSkus.size || items.length,
      totalUnidades: totalQty,
      valorTotalEstoque: totalVal,
      acuraciaHomologada: 99.4,
      totalDivergenciasRecontadas: recountLogs.length,
      totalAvariadosVencidos: damagedCount + expiredCount,
    };
  }, [items, config.companyName, config.companyCnpj, fileName, snapshotDate, corteEntrada, corteSaida, recountLogs]);

  // Impressão / Exportação PDF
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: config.reportTitle.replace(/\s+/g, "_"),
    onAfterPrint: () => {
      toast({ description: "Impressão enviada com sucesso!" });
    },
  });

  // Exportar Resumo Consolidado por Código de Barras (Planilha CSV)
  const handleExportBarcodeSummaryCsv = () => {
    if (items.length === 0) {
      toast({ title: "Nenhum dado para exportar", variant: "destructive" });
      return;
    }

    const barcodeMap = new Map<string, {
      barcode: string;
      code: string;
      description: string;
      category: string;
      subcategory: string;
      brand: string;
      ncm: string;
      lojaQty: number;
      estoqueQty: number;
      totalQty: number;
      custo: number;
      totalValue: number;
      locations: Set<string>;
      validades: Set<string>;
      lotes: Set<string>;
      damagedQty: number;
      expiredQty: number;
    }>();

    items.forEach((item) => {
      const itemCost = Number(item.custo || 0);
      const baseKey = item.codigo_de_barras || item.codigo_produto || item.descricao;
      const key = `${baseKey}_P${itemCost.toFixed(2)}`;

      const existing = barcodeMap.get(key) || {
        barcode: item.codigo_de_barras || "",
        code: item.codigo_produto || "",
        description: item.descricao || "",
        category: item.categoria?.trim() || "Não Informado",
        subcategory: item.subcategoria?.trim() || "Não Informado",
        brand: item.marca?.trim() || "Não Informado",
        ncm: item.ncm || "",
        lojaQty: 0,
        estoqueQty: 0,
        totalQty: 0,
        custo: itemCost,
        totalValue: 0,
        locations: new Set<string>(),
        validades: new Set<string>(),
        lotes: new Set<string>(),
        damagedQty: 0,
        expiredQty: 0,
      };

      if (item.ncm && !existing.ncm) existing.ncm = item.ncm;
      if (item.categoria && (!existing.category || existing.category === "Geral" || existing.category === "Não Informado")) existing.category = item.categoria.trim();
      if (item.subcategoria && (!existing.subcategory || existing.subcategory === "Não Informado")) existing.subcategory = item.subcategoria.trim();
      if (item.marca && (!existing.brand || existing.brand === "Não Informado")) existing.brand = item.marca.trim();
      const q = Number(item.quantidade || 0);
      existing.lojaQty += Number(item.quant_loja || 0);
      existing.estoqueQty += Number(item.quant_estoque || 0);
      existing.totalQty += q;
      existing.totalValue += Number(item.valor_total || (q * Number(item.custo || 0)));
      if (item.localizacao) existing.locations.add(item.localizacao);
      if (item.validade) existing.validades.add(item.validade);
      if (item.lote) existing.lotes.add(item.lote);

      const status = String(item.status || item.status_item || "").toUpperCase();
      if (status === "AVARIADO") existing.damagedQty += q;
      if (status === "VENCIDO") existing.expiredQty += q;

      barcodeMap.set(key, existing);
    });

    const exportRows = Array.from(barcodeMap.values()).map((row) => ({
      "Código de Barras": row.barcode,
      "Código do Produto": row.code,
      "Descrição": row.description,
      "Categoria": row.category,
      "Subcategoria": row.subcategory,
      "Marca": row.brand,
      "NCM": row.ncm,
      "Qtd Loja": row.lojaQty,
      "Qtd Estoque": row.estoqueQty,
      "Quantidade Total": row.totalQty,
      "Custo Unitário (R$)": row.custo.toFixed(2),
      "Valor Total (R$)": row.totalValue.toFixed(2),
      "Localizações": Array.from(row.locations).join(" | "),
      "Validades": Array.from(row.validades).join(" | "),
      "Lotes": Array.from(row.lotes).join(" | "),
      "Qtd Avariada": row.damagedQty,
      "Qtd Vencida": row.expiredQty,
    }));

    const csv = Papa.unparse(exportRows, { delimiter: ";" });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}_resumo_codigo_barras.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: "Resumo por Código de Barras exportado com sucesso!" });
  };

  // Exportar Contagem Detalhada (com Localização e Validade por linha)
  const handleExportDetailedCsv = () => {
    if (items.length === 0) {
      toast({ title: "Nenhum dado para exportar", variant: "destructive" });
      return;
    }

    const exportRows = items.map((item) => ({
      "Código de Barras": item.codigo_de_barras || "",
      "Código do Produto": item.codigo_produto || "",
      "Descrição": item.descricao || "",
      "Categoria": item.categoria?.trim() || "Não Informado",
      "Subcategoria": item.subcategoria?.trim() || "Não Informado",
      "Marca": item.marca?.trim() || "Não Informado",
      "NCM": item.ncm || "",
      "Localização": item.localizacao || "",
      "Validade": item.validade || "",
      "Lote": item.lote || "",
      "Condição / Status": item.status || item.status_item || "NORMAL",
      "Qtd Loja": Number(item.quant_loja || 0),
      "Qtd Estoque": Number(item.quant_estoque || 0),
      "Quantidade Total": Number(item.quantidade || 0),
      "Custo Unitário (R$)": Number(item.custo || 0).toFixed(2),
      "Valor Total (R$)": Number(item.valor_total || (Number(item.quantidade || 0) * Number(item.custo || 0))).toFixed(2),
      "Curva ABC": item.curva_abc || "",
      "Data e Hora da Leitura": item.data_hora || "",
    }));

    const csv = Papa.unparse(exportRows, { delimiter: ";" });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}_contagem_detalhada.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: "Contagem Detalhada exportada com sucesso!" });
  };

  // Exportar Relatório de Pendências do Levantamento (Seção 9.6 do Manual)
  const handleExportPendingItemsCsv = () => {
    const pendencias = items.filter((it) => {
      const code = String(it.codigo_de_barras || it.codigo_produto || "");
      const isSemCodigo = !code || code.startsWith("TEMP-") || code.startsWith("MANUAL-") || code.includes("TEMP");
      const isSemPreco = Number(it.custo || 0) <= 0;
      const desc = String(it.descricao || "").trim().toLowerCase();
      const isDescIncompleta = !desc || desc === "item não cadastrado" || desc === "item sem descrição" || desc.includes("não cadastrado");
      const isSemNcm = !it.ncm || it.ncm === "-" || it.ncm === "00000000";

      return isSemCodigo || isSemPreco || isDescIncompleta || isSemNcm;
    });

    if (pendencias.length === 0) {
      toast({
        title: "Nenhuma pendência encontrada",
        description: "Todos os itens deste inventário possuem código de barras e dados completos.",
      });
      return;
    }

    const exportRows = pendencias.map((item) => {
      const code = String(item.codigo_de_barras || item.codigo_produto || "");
      const isSemCodigo = !code || code.startsWith("TEMP-") || code.startsWith("MANUAL-");
      const isSemPreco = Number(item.custo || 0) <= 0;
      const desc = String(item.descricao || "").trim().toLowerCase();
      const isDescIncompleta = !desc || desc === "item não cadastrado" || desc === "item sem descrição" || desc.includes("não cadastrado");
      const isSemNcm = !item.ncm || item.ncm === "-" || item.ncm === "00000000";

      const motivos: string[] = [];
      if (isSemCodigo) motivos.push("Sem Código de Barras (Item Provisório/Manual)");
      if (isSemPreco) motivos.push("Sem Preço/Custo Definido");
      if (isDescIncompleta) motivos.push("Descrição Provisória");
      if (isSemNcm) motivos.push("Classificação Fiscal (NCM) Ausente");

      return {
        "Código Identificador": item.codigo_de_barras || item.codigo_produto || "SEM_CODIGO",
        "Descrição Atual": item.descricao || "Item sem descrição",
        "Tipo de Pendência": motivos.join(" | "),
        "Preço / Custo Atual (R$)": Number(item.custo || 0).toFixed(2),
        "NCM": item.ncm || "PENDENTE",
        "Localização": item.localizacao || "Geral",
        "Quantidade Contada": item.quantidade,
        "Data e Hora": item.data_hora || "",
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
    link.download = `${fileName}_pendencias_levantamento.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast({
      title: "Relatório de Pendências exportado!",
      description: `${exportRows.length} itens com pendências exportados com sucesso.`,
    });
  };

  // 1. Identificar Usuário
  useEffect(() => {
    const bootstrapUser = async () => {
      try {
        const storedUserId = sessionStorage.getItem("currentUserId");
        if (storedUserId) {
          setUserId(parseInt(storedUserId, 10));
          setBootLoading(false);
          return;
        }

        const res = await fetch("/api/user/me", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          router.replace(`/login?from=/inventory/history/${historyId}/modular-report`);
          return;
        }

        const data = await res.json();
        if (data?.success && data.id) {
          setUserId(data.id);
          sessionStorage.setItem("currentUserId", String(data.id));
        } else {
          router.replace(`/login?from=/inventory/history/${historyId}/modular-report`);
          return;
        }
      } catch (error) {
        console.error("Erro ao autenticar usuário:", error);
        router.replace(`/login?from=/inventory/history/${historyId}/modular-report`);
      } finally {
        setBootLoading(false);
      }
    };

    bootstrapUser();
  }, [router, historyId]);

  // 2. Carregar Dados da Contagem
  useEffect(() => {
    const fetchHistoryData = async () => {
      if (!historyId || !userId) return;

      try {
        setLoading(true);
        const res = await fetch(`/api/inventory/history/${historyId}`);
        if (!res.ok) {
          throw new Error("Não foi possível carregar esta contagem.");
        }

        const data = await res.json();

        const fetchedItems: ModularReportItem[] = Array.isArray(data.items) ? data.items : [];
        setItems(fetchedItems);
        setRecountLogs(Array.isArray(data.recount_logs) ? data.recount_logs : []);
        setSnapshotDate(data.data_fotografia || null);
        setCorteEntrada(data.corte_entrada || null);
        setCorteSaida(data.corte_saida || null);

        const clean = data.nome_arquivo ? data.nome_arquivo.replace(/\.csv$/i, "") : "inventario_modular";
        setFileName(clean);

        const hasVal = fetchedItems.some((it) => Boolean(it.validade && String(it.validade).trim() !== "" && String(it.validade).trim() !== "-"));
        const hasLot = fetchedItems.some((it) => Boolean(it.lote && String(it.lote).trim() !== "" && String(it.lote).trim() !== "-"));
        const hasNcm = fetchedItems.some((it) => Boolean(it.ncm && String(it.ncm).trim() !== "" && String(it.ncm).trim() !== "-"));
        const hasCat = fetchedItems.some((it) => Boolean(it.categoria && String(it.categoria).trim() !== ""));
        const hasSubcat = fetchedItems.some((it) => Boolean(it.subcategoria && String(it.subcategoria).trim() !== ""));
        const hasBrand = fetchedItems.some((it) => Boolean(it.marca && String(it.marca).trim() !== ""));

        setConfig((prev) => ({
          ...prev,
          reportTitle: clean,
          columns: {
            ...prev.columns,
            sku: false,
            curvaAbc: false,
            validade: hasVal ? prev.columns.validade : false,
            lote: hasLot ? prev.columns.lote : false,
            ncm: hasNcm ? prev.columns.ncm : false,
            categoria: hasCat ? true : prev.columns.categoria,
            subcategoria: hasSubcat ? true : prev.columns.subcategoria,
            marca: hasBrand ? true : prev.columns.marca,
          },
        }));

        // Se houver empresa vinculada, busca os dados da empresa
        if (data.empresa_id) {
          fetch("/api/companies")
            .then((r) => r.json())
            .then((cData) => {
              if (cData.success && Array.isArray(cData.companies)) {
                const comp = cData.companies.find((c: any) => c.id === data.empresa_id);
                if (comp) {
                  const formatCnpj = (val: string) => {
                    return val
                      .replace(/\D/g, "")
                      .replace(/^(\d{2})(\d)/, "$1.$2")
                      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
                      .replace(/\.(\d{3})(\d)/, ".$1/$2")
                      .replace(/(\d{4})(\d)/, "$1-$2")
                      .slice(0, 18);
                  };

                  setConfig((prev) => ({
                    ...prev,
                    companyName: comp.nomeFantasia || comp.razaoSocial || "",
                    companyCnpj: comp.cnpj ? formatCnpj(comp.cnpj) : "",
                  }));
                }
              }
            })
            .catch(() => undefined);
        }
      } catch (err: any) {
        toast({
          title: "Erro ao abrir relatório",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryData();
  }, [historyId, userId]);

  const hasLosses = useMemo(() => {
    return items.some((it) => {
      const s = String(it.status || it.status_item || "").toUpperCase();
      return s === "AVARIADO" || s === "VENCIDO";
    });
  }, [items]);

  const hasValidadeData = useMemo(() => {
    return items.some((it) => Boolean(it.validade && String(it.validade).trim() !== "" && String(it.validade).trim() !== "-"));
  }, [items]);

  const hasLoteData = useMemo(() => {
    return items.some((it) => Boolean(it.lote && String(it.lote).trim() !== "" && String(it.lote).trim() !== "-"));
  }, [items]);

  const hasNcmData = useMemo(() => {
    return items.some((it) => Boolean(it.ncm && String(it.ncm).trim() !== "" && String(it.ncm).trim() !== "-"));
  }, [items]);

  const hasCategoryData = useMemo(() => {
    return items.some((it) => Boolean(it.categoria && String(it.categoria).trim() !== ""));
  }, [items]);

  const hasSubcategoryData = useMemo(() => {
    return items.some((it) => Boolean(it.subcategoria && String(it.subcategoria).trim() !== ""));
  }, [items]);

  const hasMarcaData = useMemo(() => {
    return items.some((it) => Boolean(it.marca && String(it.marca).trim() !== ""));
  }, [items]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((it) => {
      const c = (it.categoria || "").trim();
      if (c) cats.add(c);
    });
    return Array.from(cats).sort();
  }, [items]);

  const availableSubcategories = useMemo(() => {
    const subcats = new Set<string>();
    items.forEach((it) => {
      const s = (it.subcategoria || "").trim();
      if (s) subcats.add(s);
    });
    return Array.from(subcats).sort();
  }, [items]);

  if (bootLoading || loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Carregando relatório modular...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Bar Executiva */}
      <header className="h-14 border-b border-border bg-card px-3 sm:px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/history")}
            className="h-8 px-2 gap-1 text-xs shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao Histórico</span>
            <span className="sm:hidden">Voltar</span>
          </Button>
          <div className="h-4 w-px bg-border shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">
              {config.reportTitle}
            </h1>
            <p className="text-[10px] text-muted-foreground truncate font-mono">
              {items.length} itens registrados | Contagem Modular
            </p>
          </div>
        </div>

        {/* Ações de Download/Impressão no Desktop (no Mobile ficam exclusivamente na barra inferior fixa) */}
        <div className="hidden md:flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBarcodeSummaryCsv}
            className="h-8 text-xs font-medium gap-1.5 border-border hover:bg-muted/60"
            title="Baixar resumo consolidado agrupado por código de barras"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Resumo (Cód. Barras)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportDetailedCsv}
            className="h-8 text-xs font-medium gap-1.5 border-border hover:bg-muted/60"
            title="Baixar todos os itens contados com localização e validade"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
            <span>Detalhado (CSV)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPendingItemsCsv}
            className="h-8 text-xs font-medium gap-1.5 border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            title="Baixar lista de itens com pendência de código, preço ou NCM"
          >
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            <span>Pendências (CSV)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setClosingTermOpen(true)}
            className="h-8 text-xs font-semibold gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-xs"
            title="Gerar Termo de Encerramento Formal do Fechamento Contábil"
          >
            <FileSignature className="h-3.5 w-3.5 text-emerald-600" />
            <span>Termo Fiscal (PDF)</span>
          </Button>

          <Button
            onClick={handlePrint}
            size="sm"
            className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir / PDF</span>
          </Button>
        </div>
      </header>

      {/* Conteúdo Principal: Painel de Configurações (Full no mobile) + Preview (Apenas Desktop) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Painel Lateral de Configurações - Ocupa tela cheia no mobile e lateral fixa no desktop */}
        <aside className="w-full md:w-80 lg:w-96 shrink-0 h-full overflow-hidden border-r border-border shadow-xs z-10 bg-card pb-16 md:pb-0">
          <ModularReportConfigPanel
            config={config}
            setConfig={setConfig}
            hasRecountLogs={recountLogs.length > 0}
            hasLosses={hasLosses}
            hasValidadeData={hasValidadeData}
            hasLoteData={hasLoteData}
            hasNcmData={hasNcmData}
            hasCategoryData={hasCategoryData}
            hasSubcategoryData={hasSubcategoryData}
            hasMarcaData={hasMarcaData}
            availableCategories={availableCategories}
            availableSubcategories={availableSubcategories}
          />
        </aside>

        {/* Pré-visualização Paginada (Oculta no Mobile) */}
        <main className="hidden md:flex flex-1 h-full overflow-y-auto bg-muted/40 p-2 sm:p-6 justify-center">
          <div className="w-full max-w-[1200px]">
            <ModularReportPreview
              ref={componentRef}
              config={config}
              items={items}
              recountLogs={recountLogs}
              snapshotDate={snapshotDate}
              corteEntrada={corteEntrada}
              corteSaida={corteSaida}
            />
          </div>
        </main>

        {/* Barra de Ações Fixa Inferior no Mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-2.5 bg-card/95 backdrop-blur-md border-t border-border z-30 shadow-lg flex items-center gap-1.5">
          <Button
            onClick={handlePrint}
            size="sm"
            className="flex-1 h-9 text-xs font-bold gap-1 bg-primary text-primary-foreground shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir / PDF</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBarcodeSummaryCsv}
            className="h-9 px-2.5 text-[11px] font-medium gap-1 shrink-0"
            title="Baixar Resumo por Código de Barras"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Resumo</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportDetailedCsv}
            className="h-9 px-2.5 text-[11px] font-medium gap-1 shrink-0"
            title="Baixar Contagem Detalhada"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
            <span>Detalhado</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPendingItemsCsv}
            className="h-9 px-2 text-[11px] font-semibold gap-1 text-amber-700 dark:text-amber-300 border-amber-500/40 shrink-0"
            title="Baixar Relatório de Pendências"
          >
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            <span>Pendências</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setClosingTermOpen(true)}
            className="h-9 px-2 text-[11px] font-semibold gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shrink-0"
            title="Termo de Encerramento Formal (Fiscal)"
          >
            <FileSignature className="h-3.5 w-3.5 text-emerald-600" />
            <span>Termo</span>
          </Button>
        </div>
      </div>

      {/* Modal de Emissão do Termo de Encerramento Fiscal */}
      <ClosingTermModal
        open={closingTermOpen}
        onOpenChange={setClosingTermOpen}
        initialData={initialClosingTermData}
      />
    </div>
  );
}
