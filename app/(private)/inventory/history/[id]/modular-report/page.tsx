// app/(private)/inventory/history/[id]/modular-report/page.tsx
"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer, Download, Settings2, Eye, FileSpreadsheet } from "lucide-react";
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

  const componentRef = useRef<HTMLDivElement>(null);

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
      const key = item.codigo_de_barras || item.codigo_produto || item.descricao;
      const existing = barcodeMap.get(key) || {
        barcode: item.codigo_de_barras || "",
        code: item.codigo_produto || "",
        description: item.descricao || "",
        lojaQty: 0,
        estoqueQty: 0,
        totalQty: 0,
        custo: Number(item.custo || 0),
        totalValue: 0,
        locations: new Set<string>(),
        validades: new Set<string>(),
        lotes: new Set<string>(),
        damagedQty: 0,
        expiredQty: 0,
      };

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

        setConfig((prev) => ({
          ...prev,
          reportTitle: clean,
          columns: {
            ...prev.columns,
            sku: false,
            curvaAbc: false,
            validade: hasVal ? prev.columns.validade : false,
            lote: hasLot ? prev.columns.lote : false,
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
        </div>
      </div>
    </div>
  );
}
