// components/inventory/Import/CountImportPageClient.tsx
// Componente principal da página de Importação de Contagem. Gerencia as abas (Conferência, Importar, Exportar, Configurações) e integra o hook de inventário para fornecer funcionalidades completas de contagem, importação/exportação e configuração. Inclui modais para ações críticas como limpeza de dados e visualização de itens faltantes.
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useInventory } from "@/hooks/useInventory";
import { useImportSettings } from "@/hooks/inventory/useImportSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Subcomponentes das Abas
import { ConferenceTab } from "./ConferenceTab";
import { ImportTab } from "./ImportTab";
import { ExportTab } from "./ExportTab";
import { ConfigTab } from "./ConfigTab";

// Modais
import { ClearDataModal } from "@/components/shared/clear-data-modal";
import { MissingItemsModal } from "@/components/shared/missing-items-modal";
import { SaveCountModal } from "@/components/shared/save-count-modal";

// Botão Flutuante para Itens Faltantes
import { FloatingMissingItemsButton } from "@/components/shared/FloatingMissingItemsButton";

// Ícones
import { Scan, Upload, Download, Settings, Monitor } from "lucide-react";

// Toast para notificações
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TabType = "scan" | "import" | "export" | "config";

interface CountImportPageClientProps {
  userId: number;
  initialTab: TabType;
}

export function CountImportPageClient({
  userId,
  initialTab,
}: CountImportPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean | null>(null);
  const [showClearImportModal, setShowClearImportModal] = useState(false);
  const [scannerBarcodeLength, setScannerBarcodeLength] = useState(13);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const resetScannerBarcodeLength = useCallback(
    () => setScannerBarcodeLength(13),
    [],
  );

  // Sincroniza ?tab= com o estado via BottomNav Mobile
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const updateScreenSize = () => setIsSmallScreen(mediaQuery.matches);
    updateScreenSize();
    mediaQuery.addEventListener("change", updateScreenSize);
    return () => mediaQuery.removeEventListener("change", updateScreenSize);
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab") as TabType | null;
    if (isSmallScreen && tab === "import") return;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab, isSmallScreen]);

  useEffect(() => {
    if (isSmallScreen && activeTab === "import") {
      setActiveTab("scan");
      router.replace("/count-import?tab=scan");
    }
  }, [activeTab, isSmallScreen, router]);

  // Atualiza a URL ao clicar nas abas pelo desktop
  const handleTabChange = (val: string) => {
    if (isSmallScreen && val === "import") return;
    setActiveTab(val as TabType);
    router.push(`/count-import?tab=${val}`);
  };

  // HOOK DO INVENTÁRIO (Já com o userId pronto do servidor!)
  const { settings: importSettings, updateSettings } =
    useImportSettings(userId);
  const inventory = useInventory({
    userId,
    mode: "import",
    defaultCountingMode: importSettings.defaultCountingLocation,
    scannerPreferences: {
      soundEnabled: importSettings.soundEnabled,
      vibrationEnabled: importSettings.vibrationEnabled,
      directScanEnabled: importSettings.directScanEnabled,
      barcodeLength: scannerBarcodeLength,
    },
    onCountSaved: resetScannerBarcodeLength,
  });

  return (
    <>
      <main
        ref={mainContainerRef}
        // Removemos px-4 e pt-4 do mobile, deixando apenas para telas maiores (sm:px-6 sm:pt-6)
        className="flex-1 max-w-7xl w-full mx-auto px-0 sm:px-6 lg:px-8 pt-0 sm:pt-6 pb-32 sm:pb-8"
      >
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          // Mudamos space-y-6 para sm:space-y-6 (só aplica o gap no desktop)
          className="sm:space-y-6"
        >
          {/* Menu Desktop */}
          <div className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="scan" className="flex items-center gap-2">
                <Scan className="h-4 w-4" />
                Conferência
              </TabsTrigger>
              {/* ... restantes das abas ... */}
              <TabsTrigger value="import" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Importar
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Config.
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Conteúdo das Abas */}
          <TabsContent value="scan" className="mt-0 sm:space-y-6">
            {isSmallScreen && (
              <div className="mx-4 mb-4 flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm sm:hidden">
                <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p>
                  A importação de arquivos está disponível somente no computador.
                </p>
              </div>
            )}
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
              handleClearCountsOnly={inventory.handleClearCountsOnly}
              isImportReady={inventory.hasImportedCatalog}
              isLoadingImport={inventory.isLoading}
              isSmallScreen={isSmallScreen === true}
              onGoToImport={() => handleTabChange("import")}
              soundEnabled={importSettings.soundEnabled}
              vibrationEnabled={importSettings.vibrationEnabled}
              fastCountEnabled={importSettings.directScanEnabled}
              canUndoFastCount={inventory.canUndoFastCount}
              onUndoFastCount={inventory.undoLastFastCount}
            />
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            {isSmallScreen !== false ? (
              <div className="mx-4 rounded-xl border border-border bg-card p-6 text-center sm:mx-0">
                <Monitor className="mx-auto mb-3 h-9 w-9 text-primary" />
                <h2 className="font-semibold">Importação disponível no computador</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Para importar arquivos e consultar o catálogo importado, acesse esta aba em uma tela maior.
                </p>
              </div>
            ) : (
              <ImportTab
                userId={userId}
                setIsLoading={inventory.setIsLoading}
                setCsvErrors={inventory.setCsvErrors}
                loadCatalogFromDb={inventory.loadCatalogFromDb}
                isLoading={inventory.isLoading}
                csvErrors={inventory.csvErrors}
                products={inventory.products}
                barCodes={inventory.barCodes}
                downloadTemplateCSV={inventory.downloadTemplateCSV}
                allowBalanceStrategyChoice
                onImportStarted={() => {
                  resetScannerBarcodeLength();
                  inventory.resetScanner();
                }}
                onClearAllData={() => setShowClearImportModal(true)}
              />
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <ExportTab
              products={inventory.products}
              barCodes={inventory.barCodes}
              tempProducts={inventory.tempProducts}
              productCounts={inventory.productCounts}
              productCountsStats={inventory.productCountsStats}
              exportToCsv={inventory.exportToCsv}
              handleSaveCount={inventory.handleSaveCount}
              hasImportedCatalog={inventory.hasImportedCatalog}
              setShowMissingItemsModal={inventory.setShowMissingItemsModal}
              onEditTempItemDescription={
                inventory.handleEditTempItemDescription
              }
            />
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <ConfigTab
              settings={importSettings}
              onSettingsChange={updateSettings}
              barcodeLength={scannerBarcodeLength}
              onBarcodeLengthChange={setScannerBarcodeLength}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Modais */}
      <>
        {inventory.showClearDataModal && (
          <ClearDataModal
            isOpen={inventory.showClearDataModal}
            onClose={() => inventory.setShowClearDataModal(false)}
            onConfirm={inventory.handleClearAllData}
          />
        )}

        <AlertDialog
          open={showClearImportModal}
          onOpenChange={setShowClearImportModal}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar Importação?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso removerá todos os produtos importados do catálogo.
                <br />
                <strong>Suas contagens (bipes) serão preservadas.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  inventory.handleClearImportOnly();
                  setShowClearImportModal(false);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Confirmar Limpeza
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
            userId={userId}
            companyId={inventory.selectedCompanyId}
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
    </>
  );
}
