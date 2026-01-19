// app/(main)/inventory/history/[id]/database-report/page.tsx

"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { History, Loader2, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useReactToPrint } from "react-to-print";
import * as Papa from "papaparse";

import { DatabaseReportPreview } from "@/components/inventory/database-report/DatabaseReportPreview";
import { DatabaseReportConfigPanel } from "@/components/inventory/database-report/DatabaseReportConfigPanel";
import { useDatabaseReportLogic } from "@/components/inventory/database-report/useDatabaseReportLogic";
import type { DatabaseReportConfig } from "@/components/inventory/database-report/types";
import type { ProductCount } from "@/lib/types";

const parseNumberBR = (val: any): number => {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const str = String(val).replace(/\./g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

export default function DatabaseReportPage() {
  const router = useRouter();
  const params = useParams();
  const historyId = params?.id as string;
  const componentRef = useRef<HTMLDivElement>(null);

  // Estados
  const [items, setItems] = useState<ProductCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  // Configuração Inicial
  const [config, setConfig] = useState<DatabaseReportConfig>({
    reportTitle: "Relatório de Valuation",
    customScope: "", // Campo obrigatório adicionado

    // --- OPÇÕES DE AGRUPAMENTO E FILTRO ---
    groupByCategory: false,
    groupBySubcategory: false,
    showCategoryTotals: false,
    showSubCategoryTotals: false,
    showCategoryInItem: false,
    selectedCategories: [],
    selectedSubcategories: [],
    // -------------------------------------

    // Filtros Básicos
    showCorrect: true,
    showSurplus: true,
    showMissing: true,

    // Colunas
    showSystemBalance: true,
    showCountColumn: true,
    showDifference: true,
    showValues: true,

    // --- CARDS ---
    showCardSku: true,
    showCardVolume: true,
    showCardTicket: true,
    showCardTotalValue: true,
    // -------------

    showLogo: true,
    useDefaultLogo: true,
    logoDataUrl: null, // Campo opcional, mas bom inicializar

    // --- RODAPÉ E ASSINATURAS ---
    showSignatureBlock: true, // <--- CORREÇÃO AQUI (era showSignature)
    showCpfLine: false,
    truncateLimit: 25,

    orientation: "portrait",
  });

  // Hook de Lógica
  const {
    items: processedItems,
    groupedItems,
    stats,
    availableCategories,
    availableSubcategories,
  } = useDatabaseReportLogic(items, config);

  // --- 1. Carregar Dados ---
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/inventory/history/${historyId}`);
        if (!res.ok) throw new Error("Erro ao carregar");
        const data = await res.json();

        if (data.nome_arquivo) {
          const cleanName = data.nome_arquivo.replace(".csv", "");
          setConfig((prev) => ({ ...prev, reportTitle: cleanName }));
        }

        if (data.items && data.items.length > 0) {
          setItems(data.items);
        } else if (data.conteudo_csv) {
          Papa.parse(data.conteudo_csv, {
            header: true,
            skipEmptyLines: true,
            delimitersToGuess: [";", ","],
            complete: (results) => {
              const parsed = results.data.map(
                (row: any, idx: number) =>
                  ({
                    id: idx,
                    codigo_de_barras:
                      row["EAN/Código"] ||
                      row["codigo_de_barras"] ||
                      row["código de barras"] ||
                      "",
                    descricao:
                      row["Descrição"] || row["descricao"] || "Item sem nome",
                    quantity: parseNumberBR(
                      row["quantidade_total"] ||
                        row["Qtd Total"] ||
                        row["total"],
                    ),
                    quant_loja: parseNumberBR(row["quant_loja"] || row["Loja"]),
                    quant_estoque: parseNumberBR(
                      row["quant_estoque"] || row["Estoque"],
                    ),
                    price: parseNumberBR(
                      row["preco_unitario"] ||
                        row["Preço Unit."] ||
                        row["preco"],
                    ),
                    categoria: row["categoria"] || row["Categoria"] || "Geral",
                    subcategoria:
                      row["subcategoria"] || row["Subcategoria"] || "",
                    marca: row["marca"] || row["Marca"] || "",
                  }) as ProductCount,
              );
              setItems(parsed);
            },
          });
        }
      } catch (e) {
        console.error(e);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [historyId]);

  // --- 2. Função de Download CSV ---
  const handleDownloadCsv = () => {
    try {
      setDownloadingCsv(true);

      if (processedItems.length === 0) {
        toast({
          title: "Atenção",
          description: "Não há itens contados para baixar.",
        });
        setDownloadingCsv(false);
        return;
      }

      const csvData = processedItems.map((item) => {
        const loja = Number(item.quant_loja) || 0;
        const estoque = Number(item.quant_estoque) || 0;
        const total =
          Number(item.total) > 0
            ? Number(item.total)
            : loja + estoque + (Number(item.quantity) || 0);

        return {
          "Código de Barras": item.codigo_de_barras,
          Descrição: item.descricao,
          Categoria: item.categoria || "",
          Subcategoria: item.subcategoria || "",
          Marca: item.marca || "",
          Loja: loja,
          Estoque: estoque,
          "Qtd Total": total,
          "Preço Unit.": (Number(item.price) || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          }),
          "Valor Total": (total * (Number(item.price) || 0)).toLocaleString(
            "pt-BR",
            { minimumFractionDigits: 2 },
          ),
        };
      });

      const csv = Papa.unparse(csvData, { delimiter: ";" });
      const blob = new Blob([`\uFEFF${csv}`], {
        type: "text/csv;charset=utf-8;",
      });

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${config.reportTitle || "relatorio"}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "Download concluído" });
    } catch (error: any) {
      toast({
        title: "Erro no download",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDownloadingCsv(false);
    }
  };

  // --- 3. Função de Impressão ---
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: config.reportTitle,
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-primary h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            Carregando Valuation...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex h-full w-full bg-background">
      {/* SIDEBAR */}
      <aside className="w-96 bg-card border-r border-border flex flex-col shadow-xl z-10">
        <header className="flex items-center gap-2 p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <History className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-bold text-foreground">
              Configuração Valuation
            </h2>
            <p className="text-xs text-muted-foreground">
              Ajuste o relatório financeiro
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          <DatabaseReportConfigPanel
            config={config}
            setConfig={setConfig}
            availableCategories={availableCategories}
            availableSubcategories={availableSubcategories}
          />
        </div>

        {/* Botões fixos no Rodapé */}
        <div className="flex-none border-t bg-gray-50 p-4 dark:bg-gray-800 z-10 border-border">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 font-medium bg-background hover:bg-accent text-foreground"
              onClick={handleDownloadCsv}
              disabled={downloadingCsv}
            >
              {downloadingCsv ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Baixar CSV
            </Button>

            <Button
              variant="default"
              className="flex-1 font-medium"
              onClick={() => handlePrint && handlePrint()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </aside>

      {/* PREVIEW AREA */}
      <main className="flex-1 overflow-auto p-8 flex justify-center bg-muted/20 dark:bg-black/50 scrollbar-hide">
        <DatabaseReportPreview
          ref={componentRef}
          config={config}
          items={processedItems}
          groupedItems={groupedItems}
          stats={stats}
        />
      </main>
    </div>
  );
}
