// app/(main)/audit/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInventory } from "@/hooks/useInventory";
import { AuthModal } from "@/components/shared/AuthModal";
import { ExportTab } from "@/components/inventory/Audit/AuditExportTab";
import {
  AuditSettingsTab,
  AuditConfig,
} from "@/components/inventory/Audit/AuditSettingsTab";
import { AuditConferenceTab } from "@/components/inventory/Audit/AuditConferenceTab";
import { ClearDataModal } from "@/components/shared/clear-data-modal";
import { MissingItemsModal } from "@/components/shared/missing-items-modal";
import { SaveCountModal } from "@/components/shared/save-count-modal";
import { Loader2, Settings, Scan, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AuditPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<"manager" | "participant" | null>(
    null
  );
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"scan" | "settings" | "export">(
    "scan"
  );

  const [fileName, setFileName] = useState("");

  const [auditConfig, setAuditConfig] = useState<AuditConfig>({
    offlineMode: false,
    collectPrice: true,
    enableCustomName: false,
  });

  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  // Carrega configurações salvas de auditoria
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

  const mainContainerRef = useRef<HTMLDivElement>(null);

  const inventory = useInventory({ userId: currentUserId });

  // Recupera sessão básica (apenas se ainda estiver usando esse fluxo aqui)
  useEffect(() => {
    const savedUserId = sessionStorage.getItem("currentUserId");
    const savedSession = sessionStorage.getItem("currentSession");

    if (savedUserId) {
      setCurrentUserId(parseInt(savedUserId, 10));
      setUserType("manager");
    } else if (savedSession) {
      setSessionData(JSON.parse(savedSession));
      setUserType("participant");
    }

    setIsLoading(false);
  }, []);

  const handleManagerLogin = (userId: number, token: string) => {
    sessionStorage.setItem("currentUserId", userId.toString());
    sessionStorage.removeItem("currentSession");

    setCurrentUserId(userId);
    setUserType("manager");
  };

  const handleCollaboratorJoin = (data: any) => {
    sessionStorage.setItem("currentSession", JSON.stringify(data));
    sessionStorage.removeItem("currentUserId");

    setSessionData(data);
    setUserType("participant");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Se quiser que /audit seja só para manager, pode remover o AuthModal
  // e confiar apenas no middleware + /login. Enquanto isso, mantemos:
  if (!userType) {
    return (
      <AuthModal
        onUnlock={handleManagerLogin}
        onJoinSession={handleCollaboratorJoin}
      />
    );
  }

  if (userType === "participant") {
    // Por enquanto, só bloqueia /audit para colaborador
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        A tela de auditoria é disponível apenas para o gestor.
      </div>
    );
  }

  // Manager logado
  return (
    <>
      <div className="relative min-h-screen flex flex-col">
        <main
          ref={mainContainerRef}
          className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 sm:pt-16 sm:pb-8"
        >
          <Tabs
            value={activeTab}
            onValueChange={(val) =>
              setActiveTab(val as "scan" | "settings" | "export")
            }
            className="space-y-6"
          >
            {/* Tabs Desktop */}
            <div className="hidden sm:block">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="scan" className="flex items-center gap-2">
                  <Scan className="h-4 w-4" />
                  Conferência
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Configurações
                </TabsTrigger>
                <TabsTrigger value="export" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Aba Conferência */}
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
                handleQuantityKeyPress={inventory.handleQuantityKeyPress}
                handleAddCount={inventory.handleAddCount}
                handleAddManualItem={(inventory as any).handleAddManualItem}
                productCounts={inventory.productCounts}
                handleRemoveCount={inventory.handleRemoveCount}
                handleSaveCount={inventory.handleSaveCount}
                auditConfig={auditConfig}
                fileName={fileName}
                setFileName={setFileName}
              />
            </TabsContent>

            {/* Aba Configurações */}
            <TabsContent value="settings" className="space-y-6">
              <AuditSettingsTab
                config={auditConfig}
                setConfig={setAuditConfig}
              />
            </TabsContent>

            {/* Aba Exportar */}
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

        {/* Modais globais da auditoria */}
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
      </div>

      {/* Navegação inferior mobile das abas de auditoria */}
      <div className="sm:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex items-center justify-center gap-4 px-6 py-3 bg-white/10 dark:bg-black/20 backdrop-blur-2xl rounded-full shadow-2xl border border-white/20 dark:border-white/10">
          <button
            onClick={() => setActiveTab("scan")}
            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 ${
              activeTab === "scan"
                ? "text-primary scale-110"
                : "text-muted-foreground hover:text-foreground "
            }`}
          >
            <Scan className={activeTab === "scan" ? "h-6 w-6" : "h-5 w-5"} />
            <span className="text-[10px] font-medium">Conferir</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 ${
              activeTab === "settings"
                ? "text-primary scale-110"
                : "text-muted-foreground hover:text-foreground "
            }`}
          >
            <Settings
              className={activeTab === "settings" ? "h-6 w-6" : "h-5 w-5"}
            />
            <span className="text-[10px] font-medium">Configurar</span>
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 ${
              activeTab === "export"
                ? "text-primary scale-110"
                : "text-muted-foreground hover:text-foreground "
            }`}
          >
            <Download
              className={activeTab === "export" ? "h-6 w-6" : "h-5 w-5"}
            />
            <span className="text-[10px] font-medium">Exportar</span>
          </button>
        </div>
      </div>
    </>
  );
}
