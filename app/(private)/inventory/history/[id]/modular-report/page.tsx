// app/(private)/inventory/history/[id]/modular-report/page.tsx
"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer, Download, Settings2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useReactToPrint } from "react-to-print";
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
  const [isConfigOpen, setIsConfigOpen] = useState(true);

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

        setItems(Array.isArray(data.items) ? data.items : []);
        setRecountLogs(Array.isArray(data.recount_logs) ? data.recount_logs : []);
        setSnapshotDate(data.data_fotografia || null);
        setCorteEntrada(data.corte_entrada || null);
        setCorteSaida(data.corte_saida || null);

        if (data.nome_arquivo) {
          const clean = data.nome_arquivo.replace(/\.csv$/i, "");
          setFileName(clean);
          setConfig((prev) => ({
            ...prev,
            reportTitle: clean,
          }));
        }

        // Se houver empresa vinculada, busca os dados da empresa
        if (data.empresa_id) {
          fetch("/api/companies")
            .then((r) => r.json())
            .then((cData) => {
              if (cData.success && Array.isArray(cData.companies)) {
                const comp = cData.companies.find((c: any) => c.id === data.empresa_id);
                if (comp) {
                  setConfig((prev) => ({
                    ...prev,
                    companyName: comp.nomeFantasia || comp.razaoSocial || "",
                    companyCnpj: comp.cnpj || "",
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
      <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/history")}
            className="h-8 px-2 gap-1 text-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao Histórico</span>
          </Button>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-md">
              {config.reportTitle}
            </h1>
            <p className="text-[10px] text-muted-foreground hidden sm:block font-mono">
              {items.length} itens registrados | Contagem Modular
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsConfigOpen((prev) => !prev)}
            className="h-8 text-xs gap-1.5"
          >
            <Settings2 className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">
              {isConfigOpen ? "Ocultar Painel" : "Configurar"}
            </span>
          </Button>

          <Button
            onClick={handlePrint}
            size="sm"
            className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir / Salvar PDF</span>
          </Button>
        </div>
      </header>

      {/* Conteúdo Principal: Painel de Configurações à esquerda + Preview à direita */}
      <div className="flex-1 flex overflow-hidden">
        {/* Painel Lateral de Configurações */}
        {isConfigOpen && (
          <aside className="w-80 sm:w-96 shrink-0 h-full overflow-hidden border-r border-border shadow-sm z-10 bg-card">
            <ModularReportConfigPanel
              config={config}
              setConfig={setConfig}
              hasRecountLogs={recountLogs.length > 0}
              hasLosses={hasLosses}
            />
          </aside>
        )}

        {/* Pré-visualização Paginada */}
        <main className="flex-1 h-full overflow-y-auto bg-muted/40 p-2 sm:p-6 flex justify-center">
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
      </div>
    </div>
  );
}
