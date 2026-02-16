// app/(main)/inventory/history/[id]/report/page.tsx

"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { History, Loader2, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useReactToPrint } from "react-to-print";
import * as Papa from "papaparse"; // Importante para ler o CSV salvo

import { ReportConfigPanel } from "@/components/inventory/report-builder/ReportConfigPanel";
import { ReportPreview } from "@/components/inventory/report-builder/ReportPreview";
import { useReportLogic } from "@/components/inventory/report-builder/useReportLogic";
import type { ReportConfig } from "@/components/inventory/report-builder/types";
import type { ProductCount } from "@/lib/types";

// Helper para converter números formato BR (1.000,00) ou US (1000.00) para float JS
const parseNumberBR = (val: any): number => {
  if (typeof val === "number") return val;
  if (!val) return 0;
  // Remove pontos de milhar e troca vírgula decimal por ponto
  const str = String(val).replace(/\./g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const historyId = params?.id as string;

  const [userId, setUserId] = useState<number | null>(null);
  const [bootLoading, setBootLoading] = useState(true);

  const componentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProductCount[]>([]);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  // Configuração padrão do relatório
  const [config, setConfig] = useState<ReportConfig>({
    showCorrect: true,
    showSurplus: true,
    showMissing: true,
    showCardSku: true,
    showCardSystem: false,
    showCardCounted: true,
    showCardDivergence: false,
    showCardAccuracy: true,
    showCardItemsCorrect: true,
    showCardItemsMissing: true,
    showCardItemsSurplus: true,
    showAuditColumn: false,
    hideDecimals: false,
    showInternalCode: false,
    sortByBiggestError: false,
    truncateLimit: 25,
    reportTitle: "Relatório de Inventário",
    customScope: "",
    showSignatureBlock: true,
    showCpfLine: false,
    // Campos de logo
    showLogo: true,
    useDefaultLogo: true,
    logoDataUrl: null,
    hideTempItems: false, // Nova propriedade adicionada
  });

  // Hook que processa os itens (Filtros e Cálculos)
  const { filteredItems, stats } = useReportLogic(items, config);

  // --- NOVA LÓGICA INTELIGENTE ---
  // Verifica se existe algum item na lista bruta que comece com TEMP-
  const hasTempItems = useMemo(() => {
    return items.some((item) => {
      const codeProd = String((item as any).codigo_produto || "").toUpperCase();
      const codeBar = String(item.codigo_de_barras || "").toUpperCase();
      return codeProd.startsWith("TEMP-") || codeBar.startsWith("TEMP-");
    });
  }, [items]);
  // -------------------------------

  // --- 0. Bootstrap do usuário ---
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
          if (res.status === 401 || res.status === 403) {
            router.replace(
              `/login?from=/inventory/history/${historyId}/report`,
            );
            return;
          }
          throw new Error("Falha ao carregar usuário autenticado.");
        }

        const data = await res.json();
        if (data?.success && data.id) {
          setUserId(data.id);
          sessionStorage.setItem("currentUserId", String(data.id));
          if (data.preferredMode) {
            sessionStorage.setItem("preferredMode", data.preferredMode);
          }
        } else {
          router.replace(`/login?from=/inventory/history/${historyId}/report`);
          return;
        }
      } catch (error) {
        console.error("Erro ao inicializar usuário:", error);
        router.replace(`/login?from=/inventory/history/${historyId}/report`);
        return;
      } finally {
        setBootLoading(false);
      }
    };

    bootstrapUser();
  }, [router, historyId]);

  // --- 1. Buscar Dados do histórico ---
  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        if (!historyId || !userId) return;
        setLoading(true);

        const response = await fetch(`/api/inventory/history/${historyId}`);

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("Você não tem permissão para ver este relatório.");
          }
          throw new Error("Falha ao carregar histórico.");
        }

        const data = await response.json();

        // CASO 1: Dados estruturados do Banco (Contagem Livre)
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items);
          if (data.data_contagem) {
            const dateStr = new Date(data.data_contagem).toLocaleDateString(
              "pt-BR",
            );
            setConfig((prev) => ({
              ...prev,
              customScope: `Contagem de ${dateStr}`,
            }));
          }
        }
        // CASO 2: Dados vindos de CSV salvo (Contagem por Importação)
        else if (data.conteudo_csv) {
          Papa.parse(data.conteudo_csv, {
            header: true,
            skipEmptyLines: true,
            delimitersToGuess: [";", ","],
            complete: (results) => {
              const parsed = results.data.map(
                (row: any, idx: number) =>
                  ({
                    id: idx,
                    // Mapeia códigos de barras
                    codigo_de_barras:
                      row["EAN/Código"] ||
                      row["codigo_de_barras"] ||
                      row["código de barras"] ||
                      "",
                    // Mapeia descrição
                    descricao:
                      row["Descrição"] || row["descricao"] || "Item sem nome",

                    // Quantidades contadas
                    quantity: parseNumberBR(
                      row["quantidade_total"] ||
                        row["Qtd Total"] ||
                        row["total"],
                    ),
                    quant_loja: parseNumberBR(row["quant_loja"] || row["Loja"]),
                    quant_estoque: parseNumberBR(
                      row["quant_estoque"] || row["Estoque"],
                    ),

                    // --- CORREÇÃO AQUI: Mapeia o Saldo do Sistema ---
                    saldo_estoque: parseNumberBR(
                      row["saldo_estoque"] ||
                        row["Sistema"] ||
                        row["sistema"] ||
                        row["Saldo"] ||
                        0,
                    ),
                    // ------------------------------------------------

                    // Preço Unitário
                    price: parseNumberBR(
                      row["preco_unitario"] ||
                        row["Preço Unit."] ||
                        row["preco"],
                    ),

                    // Divergência salva (opcional)
                    total: parseNumberBR(
                      row["Divergência"] ||
                        row["Diferença"] ||
                        row["total_divergencia"],
                    ),
                  }) as ProductCount,
              );
              setItems(parsed);

              if (data.nome_arquivo) {
                const cleanName = data.nome_arquivo.replace(".csv", "");
                setConfig((prev) => ({ ...prev, reportTitle: cleanName }));
              }
            },
          });
        } else {
          toast({
            title: "Aviso",
            description: "Nenhum item encontrado nesta contagem.",
            variant: "default",
          });
        }
      } catch (error: any) {
        console.error(error);
        toast({
          title: "Erro",
          description: error.message || "Não foi possível carregar os dados.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryData();
  }, [historyId, userId]);

  // --- 2. Função de Impressão ---
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Relatorio_Inventario_${historyId}`,
    onAfterPrint: () => {
      toast({ description: "Impressão enviada com sucesso!" });
    },
  });

  // --- 3. Função para baixar o CSV deste relatório ---
  const handleDownloadCsv = async () => {
    if (!userId || !historyId) return;

    try {
      setDownloadingCsv(true);

      const res = await fetch(`/api/inventory/history/${historyId}`);
      if (!res.ok) throw new Error("Erro ao buscar arquivo.");

      const data = await res.json();
      const content = data.csv_conteudo as string | undefined;
      const fileName =
        (data.nome_arquivo as string | undefined) ||
        `contagem_${historyId}.csv`;

      if (!content) throw new Error("Conteúdo do arquivo vazio.");

      const blob = new Blob([`\uFEFF${content}`], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({
        title: "Download concluído",
        description: "O arquivo CSV foi baixado com sucesso.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro no download",
        description: error.message || "Não foi possível baixar o arquivo CSV.",
        variant: "destructive",
      });
    } finally {
      setDownloadingCsv(false);
    }
  };

  if (bootLoading || loading || !userId) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-gray-500">Carregando relatório...</p>
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
              Configuração de Relatório
            </h2>
            <p className="text-xs text-muted-foreground">
              Ajuste o relatório de conferência
            </p>
          </div>
        </header>

        {/* Conteúdo do Sidebar */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
          <ReportConfigPanel
            config={config}
            setConfig={setConfig}
            hasTempItems={hasTempItems} // <--- PASSANDO A NOVA PROP
          />
        </div>

        {/* Botões fixos no Rodapé */}
        <div className="flex-none border-t bg-gray-50 p-4 dark:bg-gray-800 z-10">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 font-medium"
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

      {/* CONTEÚDO PRINCIPAL (PREVIEW) */}
      <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          <div className="mx-auto max-w-max pb-20">
            <ReportPreview
              ref={componentRef}
              config={config}
              items={filteredItems}
              stats={stats}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
