// components/inventory/Audit/AuditPageClient.tsx
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
import { Settings, Scan, Download, MapPin, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// A interface das props que o servidor vai nos enviar
interface AuditPageClientProps {
  userId: number;
  initialTab: "scan" | "settings" | "export";
}

export function AuditPageClient({ userId, initialTab }: AuditPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // --- CONTEXTO DA AUDITORIA ---
  const [clientName, setClientName] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"scan" | "settings" | "export">(
    initialTab,
  );

  const [fileName, setFileName] = useState("");

  const [auditConfig, setAuditConfig] = useState<AuditConfig>({
    offlineMode: false,
    collectPrice: true,
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

  // Sincroniza abas via URL (BottomNav)
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

  // Atualiza a URL ao clicar nas abas pelo desktop
  const handleTabChange = (val: string) => {
    setActiveTab(val as "scan" | "settings" | "export");
    router.push(`/audit?tab=${val}`);
  };

  // HOOK DO INVENTÁRIO (Usando o userId que veio direto do servidor!)
  const inventory = useInventory({
    userId: userId,
    mode: "audit",
  });

  // --- ADAPTERS (CORREÇÃO DOS ERROS DE ARGUMENTO) ---
  const handleAddCountAdapter = (quantity: number, price?: number) => {
    inventory.handleAddCount(quantity, { price });
  };

  const handleAddManualItemAdapter = (
    desc: string,
    qty: number,
    price?: number,
  ) => {
    inventory.handleAddManualItem("MANUAL-ENTRY", qty, desc, price);
  };

  return (
    <>
      {/* HEADER DE CONTEXTO */}
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
          onValueChange={handleTabChange}
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
            <AuditSettingsTab
              config={auditConfig}
              setConfig={setAuditConfig}
              userId={userId}
            />
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
