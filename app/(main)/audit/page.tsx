"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInventory } from "@/hooks/useInventory";
import { ExportTab } from "@/components/inventory/Audit/AuditExportTab";
import {
  AuditSettingsTab,
  AuditConfig,
} from "@/components/inventory/Audit/AuditSettingsTab";
import { AuditConferenceTab } from "@/components/inventory/Audit/AuditConferenceTab";
import { ClearDataModal } from "@/components/shared/clear-data-modal";
import { MissingItemsModal } from "@/components/shared/missing-items-modal";
import { SaveCountModal } from "@/components/shared/save-count-modal";
import { Loader2, Settings, Scan, Download, MapPin, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function AuditPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [bootLoading, setBootLoading] = useState(true);

  // --- CONTEXTO DA AUDITORIA ---
  const [clientName, setClientName] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"scan" | "settings" | "export">(
    () => (searchParams.get("tab") as "scan" | "settings" | "export") || "scan",
  );

  const [fileName, setFileName] = useState("");

  const [auditConfig, setAuditConfig] = useState<AuditConfig>({
    offlineMode: false,
    collectPrice: true,
    enableCustomName: false,
  });

  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // 1. APENAS RECUPERA O NOME DO CLIENTE
  useEffect(() => {
    const storedClient = localStorage.getItem("audit_client_name");
    if (storedClient) {
      setClientName(storedClient);
      setFileName(`Auditoria - ${storedClient}`);
    }
  }, []);

  // Carrega configurações salvas
  useEffect(() => {
    const savedConfig = localStorage.getItem("audit-settings-v1");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setAuditConfig((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Erro ao carregar configurações salvas", e);
      }
    }
    setIsConfigLoaded(true);
  }, []);

  useEffect(() => {
    if (isConfigLoaded) {
      localStorage.setItem("audit-settings-v1", JSON.stringify(auditConfig));
    }
  }, [auditConfig, isConfigLoaded]);

  // Bootstrap de usuário
  useEffect(() => {
    const bootstrapUser = async () => {
      try {
        const savedUserId = sessionStorage.getItem("currentUserId");
        if (savedUserId) {
          setCurrentUserId(parseInt(savedUserId, 10));
          setBootLoading(false);
          return;
        }

        const res = await fetch("/api/user/me", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.replace("/login?from=/audit");
            return;
          }
        }

        const data = await res.json();
        if (data?.success && data.id) {
          setCurrentUserId(data.id);
          sessionStorage.setItem("currentUserId", String(data.id));
        } else {
          router.replace("/login?from=/audit");
          return;
        }
      } catch (error) {
        console.error("Erro ao inicializar usuário:", error);
        router.replace("/login?from=/audit");
        return;
      } finally {
        setBootLoading(false);
      }
    };

    bootstrapUser();
  }, [router]);

  // Sincroniza abas
  useEffect(() => {
    const tab = searchParams.get("tab") as
      | "scan"
      | "settings"
      | "export"
      | null;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  // HOOK DO INVENTÁRIO
  const inventory = useInventory({
    userId: currentUserId,
  });

  // --- ADAPTERS (CORREÇÃO DOS ERROS DE ARGUMENTO) ---

  // 1. Adapter para Contagem Normal (Scan)
  const handleAddCountAdapter = (quantity: number, price?: number) => {
    inventory.handleAddCount(quantity, { price });
  };

  // 2. Adapter para Item Manual (CORREÇÃO DO BUG DO PREÇO ZERO)
  // O componente visual manda (desc, qty, price)
  // O hook espera (barcode, qty, desc, price)
  const handleAddManualItemAdapter = (
    desc: string,
    qty: number,
    price?: number,
  ) => {
    // Passamos uma string fixa como barcode, pois a lógica interna do useCounts
    // vai gerar um ID único SEM-COD-... baseado na descrição e timestamp.
    inventory.handleAddManualItem("MANUAL-ENTRY", qty, desc, price);
  };

  if (bootLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center flex-col gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Carregando sistema...</p>
      </div>
    );
  }

  return (
    <>
      {/* HEADER DE CONTEXTO - MOVIDO PARA FORA DO MAIN */}
      {clientName && (
        <div className="bg-muted/30 border-b px-4 py-2 text-xs sm:text-sm flex justify-between items-center max-w-7xl w-full mx-auto">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>
              Local: <strong className="text-foreground">{clientName}</strong>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] sm:text-xs px-2"
            onClick={() => {
              const novo = prompt("Nome do Cliente/Local:", clientName || "");
              if (novo) {
                localStorage.setItem("audit_client_name", novo);
                setClientName(novo);
              }
            }}
          >
            <Edit2 className="h-3 w-3 mr-1" /> Alterar
          </Button>
        </div>
      )}

      <main
        ref={mainContainerRef}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 sm:pt-6 sm:pb-8"
      >
        <Tabs
          value={activeTab}
          onValueChange={(val) =>
            setActiveTab(val as "scan" | "settings" | "export")
          }
          className="space-y-6"
        >
          <div className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="scan" className="flex items-center gap-2">
                <Scan className="h-4 w-4" />
                Conferência
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Config.
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="scan" className="space-y-6">
            <AuditConferenceTab
              countingMode={inventory.countingMode}
              setCountingMode={inventory.setCountingMode}
              scanInput={inventory.scanInput}
              setScanInput={inventory.setScanInput}
              handleScan={inventory.handleScan}
              isCameraViewActive={inventory.isCameraViewActive}
              setIsCameraViewActive={inventory.setIsCameraViewActive}
              handleBarcodeScanned={inventory.handleBarcodeScanned}
              currentProduct={inventory.currentProduct}
              quantityInput={inventory.quantityInput}
              setQuantityInput={inventory.setQuantityInput}
              // Usando os adapters corrigidos
              handleAddCount={handleAddCountAdapter}
              handleAddManualItem={handleAddManualItemAdapter}
              productCounts={inventory.productCounts}
              handleRemoveCount={inventory.handleRemoveCount}
              handleSaveCount={inventory.handleSaveCount}
              handleClearCountsOnly={inventory.handleClearCountsOnly}
              auditConfig={auditConfig}
              fileName={fileName}
              setFileName={setFileName}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <AuditSettingsTab config={auditConfig} setConfig={setAuditConfig} />
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <ExportTab
              products={inventory.products}
              tempProducts={inventory.tempProducts}
              productCounts={inventory.productCounts}
              handleSaveCount={inventory.handleSaveCount}
              auditConfig={auditConfig}
              fileName={fileName}
            />
          </TabsContent>
        </Tabs>
      </main>

      <>
        {inventory.showClearDataModal && (
          <ClearDataModal
            isOpen={inventory.showClearDataModal}
            onClose={() => inventory.setShowClearDataModal(false)}
            onConfirm={inventory.handleClearAllData}
          />
        )}

        {inventory.showMissingItemsModal && (
          <MissingItemsModal
            isOpen={inventory.showMissingItemsModal}
            onClose={() => inventory.setShowMissingItemsModal(false)}
            items={inventory.missingItems}
          />
        )}

        {inventory.showSaveModal && (
          <SaveCountModal
            isOpen={inventory.showSaveModal}
            onClose={() => inventory.setShowSaveModal(false)}
            onConfirm={inventory.executeSaveCount}
            isLoading={inventory.isSaving}
          />
        )}
      </>
    </>
  );
}
