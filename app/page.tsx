/**
 * Descrição: Página Principal (Controlador de Fluxo Global).
 * Responsabilidade:
 * 1. Determinar o tipo de usuário (Anfitrião ou Colaborador).
 * 2. Para Anfitriãoes: Alternar entre Modo Individual e Modo Equipe.
 * 3. Gerenciar o estado global e navegação.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInventory } from "@/hooks/useInventory";
import { AuthModal } from "@/components/shared/AuthModal";
import { ConferenceTab } from "@/components/inventory/ConferenceTab";
import { ImportTab } from "@/components/inventory/ImportTab";
import { ExportTab } from "@/components/inventory/ExportTab";
import { TeamManagerView } from "@/components/inventory/TeamManagerView";
import { ParticipantView } from "@/components/inventory/ParticipantView";
import { ClearDataModal } from "@/components/shared/clear-data-modal";
import { Navigation } from "@/components/shared/navigation";
import { MissingItemsModal } from "@/components/shared/missing-items-modal";
import { SaveCountModal } from "@/components/shared/save-count-modal";
import { FloatingMissingItemsButton } from "@/components/shared/FloatingMissingItemsButton";
import { Loader2, Upload, Download, Scan } from "lucide-react";

export const dynamic = "force-dynamic";

export default function InventorySystem() {
  // --- Estados de Sessão ---
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<"manager" | "participant" | null>(
    null
  );

  // Estado Anfitrião
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [managerMode, setManagerMode] = useState<"single" | "team">("single"); // <--- NOVO ESTADO

  // Estado Colaborador
  const [sessionData, setSessionData] = useState<any>(null);

  // --- Estados de UI do Anfitrião (Modo Individual) ---
  const [activeTab, setActiveTab] = useState("scan");
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Hook do Inventário (Funciona plenamente apenas para o Anfitrião)
  const inventory = useInventory({ userId: currentUserId });

  // --- Efeito de Inicialização (Restaura Sessão) ---
  useEffect(() => {
    const savedUserId = sessionStorage.getItem("currentUserId");
    const savedSession = sessionStorage.getItem("currentSession");
    const savedMode = sessionStorage.getItem("managerMode"); // Restaura o modo se houver

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

  // --- Handlers de Login e Modos ---

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

  // --- Renderização ---

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // 1. Login
  if (!userType) {
    return (
      <AuthModal
        onUnlock={handleManagerLogin}
        onJoinSession={handleCollaboratorJoin}
      />
    );
  }

  // 2. Visão do Colaborador
  if (userType === "participant") {
    return (
      <ParticipantView sessionData={sessionData} onLogout={handleLogout} />
    );
  }

  // 3. Visão do Anfitrião (Híbrida)
  return (
    <>
      {/* Navegação Global (Controla o modo) */}
      <div className="relative min-h-screen flex flex-col">
        <Navigation
          setShowClearDataModal={inventory.setShowClearDataModal}
          onNavigate={setActiveTab}
          currentMode={managerMode}
          onSwitchToTeamMode={handleSwitchMode}
        />

        {/* --- MODO EQUIPE (NOVA INTERFACE DEDICADA) --- */}
        {managerMode === "team" && currentUserId ? (
          <TeamManagerView
            userId={currentUserId}
            onBack={() => {
              setManagerMode("single");
              sessionStorage.setItem("managerMode", "single");
            }}
            historyData={{
              history: inventory.history,
              loadHistory: inventory.loadHistory,
              handleDeleteHistoryItem: inventory.handleDeleteHistoryItem,
            }}
          />
        ) : (
          /* --- MODO INDIVIDUAL (INTERFACE CLÁSSICA) --- */
          <main
            ref={mainContainerRef}
            className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 sm:pt-16 sm:pb-8"
          >
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              {/* Menu Desktop */}
              <div className="hidden sm:block">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="scan" className="flex items-center gap-2">
                    <Scan className="h-4 w-4" />
                    Conferência
                  </TabsTrigger>
                  <TabsTrigger
                    value="import"
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Importar
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

              {/* Conteúdo das Abas */}
              <TabsContent value="scan" className="space-y-6">
                <ConferenceTab
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
                  productCounts={inventory.productCounts}
                  handleRemoveCount={inventory.handleRemoveCount}
                  handleSaveCount={inventory.handleSaveCount}
                />
              </TabsContent>

              <TabsContent value="import" className="space-y-6">
                <ImportTab
                  userId={currentUserId}
                  setIsLoading={inventory.setIsLoading}
                  setCsvErrors={inventory.setCsvErrors}
                  loadCatalogFromDb={inventory.loadCatalogFromDb}
                  isLoading={inventory.isLoading}
                  csvErrors={inventory.csvErrors}
                  products={inventory.products}
                  barCodes={inventory.barCodes}
                  downloadTemplateCSV={inventory.downloadTemplateCSV}
                  onStartDemo={() => {
                    inventory.enableDemoMode();
                    setActiveTab("scan");
                  }}
                />
              </TabsContent>

              <TabsContent value="export" className="space-y-6">
                <ExportTab
                  products={inventory.products}
                  tempProducts={inventory.tempProducts}
                  productCounts={inventory.productCounts}
                  productCountsStats={inventory.productCountsStats}
                  exportToCsv={inventory.exportToCsv}
                  handleSaveCount={inventory.handleSaveCount}
                  setShowMissingItemsModal={inventory.setShowMissingItemsModal}
                />
              </TabsContent>
            </Tabs>
          </main>
        )}

        {/* Modais Globais (Modo Individual) */}
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

            {activeTab === "scan" && (
              <FloatingMissingItemsButton
                itemCount={inventory.missingItems.length}
                onClick={() => inventory.setShowMissingItemsModal(true)}
                dragConstraintsRef={mainContainerRef}
              />
            )}
          </>
        )}
      </div>

      {/* Menu Mobile (Apenas Modo Individual) - AJUSTADO */}
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
