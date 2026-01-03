"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { History, Loader2, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useReactToPrint } from "react-to-print";

import { ReportConfigPanel } from "@/components/inventory/report-builder/ReportConfigPanel";
import { ReportPreview } from "@/components/inventory/report-builder/ReportPreview";
import { useReportLogic } from "@/components/inventory/report-builder/useReportLogic";
import type { ReportConfig } from "@/components/inventory/report-builder/types";
import type { ProductCount } from "@/lib/types";

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
  });

  const { filteredItems, stats } = useReportLogic(items, config);

  // --- 0. Bootstrap do usuário: sessionStorage -> /api/user/me ---
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
              `/login?from=/inventory/history/${historyId}/report`
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

        const response = await fetch(
          `/api/inventory/${userId}/history/${historyId}`
        );

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("Você não tem permissão para ver este relatório.");
          }
          throw new Error("Falha ao carregar histórico.");
        }

        const data = await response.json();

        if (data && Array.isArray(data.items)) {
          setItems(data.items);
          if (data.data_contagem) {
            const dateStr = new Date(data.data_contagem).toLocaleDateString(
              "pt-BR"
            );
            setConfig((prev) => ({
              ...prev,
              customScope: `Contagem de ${dateStr}`,
            }));
          }
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

      const res = await fetch(`/api/inventory/${userId}/history/${historyId}`);
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
    <div className="fixed inset-0 z-50 flex h-full w-full overflow-hidden bg-gray-100 dark:bg-gray-950">
      {/* SIDEBAR */}
      <aside className="flex h-full w-96 flex-none flex-col border-r bg-white shadow-xl dark:bg-gray-900">
        {/* Header do Sidebar - Botão Voltar e Título */}
        <header className="flex flex-none items-center gap-4 border-b p-3 px-4 shadow-sm z-10 h-16">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
            Configurações
          </h2>
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <History className="h-4 w-4" />
          </Button>
        </header>

        {/* Conteúdo do Sidebar */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
          <ReportConfigPanel config={config} setConfig={setConfig} />
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
