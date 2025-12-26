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
import { TeamManagerView } from "@/components/inventory/TeamManagerView";
import { ParticipantView } from "@/components/inventory/ParticipantView";
import { ClearDataModal } from "@/components/shared/clear-data-modal";
import { Navigation } from "@/components/shared/navigation";
import { MissingItemsModal } from "@/components/shared/missing-items-modal";
import { SaveCountModal } from "@/components/shared/save-count-modal";
import { Loader2, Settings, Scan, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default function InventorySystem() {
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<"manager" | "participant" | null>(
    null
  );
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [managerMode, setManagerMode] = useState<"single" | "team">("single");
  const [sessionData, setSessionData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("scan");

  // NOVO: Estado para o nome do arquivo
  const [fileName, setFileName] = useState("");

  // --- CONFIGURAÇÕES DA AUDITORIA COM PERSISTÊNCIA ---

  // 1. Definimos o estado inicial com 'collectPrice: true' (Padrão Ativado)
  const [auditConfig, setAuditConfig] = useState<AuditConfig>({
    offlineMode: false,
    collectPrice: true, // <--- JÁ INICIA ATIVADO
    enableCustomName: false,
  });

  // Estado auxiliar para saber se já carregamos as configs salvas (evita sobrescrever ao iniciar)
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  // 2. Efeito para CARREGAR as configurações salvas ao abrir a página
  useEffect(() => {
    const savedConfig = localStorage.getItem("audit-settings-v1");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // Mesclamos com o estado atual para garantir que novas chaves não quebrem configs antigas
        setAuditConfig((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Erro ao carregar configurações salvas", e);
      }
    }
    setIsConfigLoaded(true); // Marca como carregado para liberar o salvamento
  }, []);

  // 3. Efeito para SALVAR as configurações sempre que mudarem
  useEffect(() => {
    // Só salva se já tiver carregado (para não salvar o padrão 'true' em cima de um 'false' salvo pelo usuário)
    if (isConfigLoaded) {
      localStorage.setItem("audit-settings-v1", JSON.stringify(auditConfig));
    }
  }, [auditConfig, isConfigLoaded]);

  // ---------------------------------------------------

  const mainContainerRef = useRef<HTMLDivElement>(null);

  const inventory = useInventory({ userId: currentUserId });

  useEffect(() => {
    const savedUserId = sessionStorage.getItem("currentUserId");
    const savedSession = sessionStorage.getItem("currentSession");
    const savedMode = sessionStorage.getItem("managerMode");

    if (savedUserId) {
      setCurrentUserId(parseInt(savedUserId, 10));
      setUserType("manager");
      if (savedMode === "team") setManagerMode("team");
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

  const handleSwitchMode = () => {
    const newMode = managerMode === "single" ? "team" : "single";
    setManagerMode(newMode);
    sessionStorage.setItem("managerMode", newMode);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}

    sessionStorage.clear();
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!userType) {
    return (
      <AuthModal
        onUnlock={handleManagerLogin}
        onJoinSession={handleCollaboratorJoin}
      />
    );
  }

  if (userType === "participant") {
    return (
      <ParticipantView sessionData={sessionData} onLogout={handleLogout} />
    );
  }

  return (
    <>
      <div className="relative min-h-screen flex flex-col">
        <Navigation
          setShowClearDataModal={inventory.setShowClearDataModal}
          onNavigate={setActiveTab}
          currentMode={managerMode}
          onSwitchToTeamMode={handleSwitchMode}
        />

        {managerMode === "team" && currentUserId ? (
          <TeamManagerView
            userId={currentUserId}
            onBack={() => {
              setManagerMode("single");
              sessionStorage.setItem("managerMode", "single");
            }}
          />
        ) : (
          <main
            ref={mainContainerRef}
            className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 sm:pt-16 sm:pb-8"
          >
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
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
                  <TabsTrigger
                    value="export"
                    className="flex items-center gap-2"
                  >
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

              <TabsContent value="settings" className="space-y-6">
                <AuditSettingsTab
                  config={auditConfig}
                  setConfig={setAuditConfig}
                />
              </TabsContent>

              <TabsContent value="export" className="space-y-6">
                <ExportTab
                  products={inventory.products}
                  tempProducts={inventory.tempProducts}
                  productCounts={inventory.productCounts}
                  // Não passamos mais o exportToCsv do hook, pois o componente vai gerar localmente
                  handleSaveCount={inventory.handleSaveCount}
                  auditConfig={auditConfig}
                  // NOVAS PROPS PARA O NOME
                  fileName={fileName}
                />
              </TabsContent>
            </Tabs>
          </main>
        )}

        {managerMode === "single" && (
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
        )}
      </div>

      {managerMode === "single" && (
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
      )}
    </>
  );
}
