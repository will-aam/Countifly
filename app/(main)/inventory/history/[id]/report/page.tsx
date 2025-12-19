// app/(main)/inventory/history/[id]/report/page.tsx

"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useReactToPrint } from "react-to-print";
// Imports dos componentes
import { ReportConfigPanel } from "@/components/inventory/report-builder/ReportConfigPanel";
import { ReportPreview } from "@/components/inventory/report-builder/ReportPreview";
import { useReportLogic } from "@/components/inventory/report-builder/useReportLogic";
import type { ReportConfig } from "@/components/inventory/report-builder/types";
import type { ProductCount } from "@/lib/types";

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const historyId = params?.id as string;
  const userId = 1;

  // Referência para o componente que será impresso (a folha A4)
  const componentRef = useRef<HTMLDivElement>(null);

  // Estados de Dados
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProductCount[]>([]);

  // Estado de Configuração
  const [config, setConfig] = useState<ReportConfig>({
    showCorrect: true,
    showSurplus: true,
    showMissing: true,
    showCardSku: true,
    showCardSystem: true,
    showCardCounted: true,
    showCardDivergence: true,
    showCardAccuracy: true,
    showAuditColumn: false,
    truncateLimit: 30,
    reportTitle: "Relatório de Inventário",
    customScope: "",
    showSignatureBlock: true,
    showCpfLine: false,
  });

  const { filteredItems, stats } = useReportLogic(items, config);

  // --- 1. Buscar Dados ---
  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        if (!historyId) return;
        setLoading(true);

        const response = await fetch(
          `/api/inventory/${userId}/history/${historyId}`
        );

        if (!response.ok) throw new Error("Falha ao carregar histórico");

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
      } catch (error) {
        console.error(error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryData();
  }, [historyId, userId]);

  // --- 2. Função de Impressão (Profissional) ---
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Relatorio_Inventario_${historyId}`,
    onAfterPrint: () => {
      toast({ description: "Impressão enviada com sucesso!" });
    },
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-gray-500">Preparando relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-950 flex flex-col overflow-hidden">
      <header className="bg-white dark:bg-gray-900 border-b p-4 flex items-center gap-4 print:hidden flex-none z-20">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="font-semibold text-lg">Gerador de Relatórios</h1>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">
        {/* Painel de Configuração */}
        <aside className="w-full lg:w-96 bg-white dark:bg-gray-900 border-r z-10 print:hidden overflow-y-auto flex-none shadow-md lg:shadow-none">
          <ReportConfigPanel
            config={config}
            setConfig={setConfig}
            // Passamos a nova função handlePrint do react-to-print
            onPrint={() => handlePrint && handlePrint()}
          />
        </aside>

        {/* Preview (Papel) */}
        <main className="flex-1 overflow-y-auto bg-gray-500/10 p-4 lg:p-8 relative scroll-smooth">
          <div className="lg:hidden mb-4 p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-200 print:hidden">
            💡 Dica: Para melhor visualização do layout A4, use um tablet ou
            computador.
          </div>

          <div className="mx-auto max-w-max pb-20">
            {/* Passamos a ref aqui para conectar a biblioteca ao componente */}
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
