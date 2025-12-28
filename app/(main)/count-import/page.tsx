// app/(main)/count-import/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useInventory } from "@/hooks/useInventory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConferenceTab } from "@/components/inventory/ConferenceTab";
import { ImportTab } from "@/components/inventory/ImportTab";
import { ExportTab } from "@/components/inventory/ExportTab";
import { ClearDataModal } from "@/components/shared/clear-data-modal";
import { MissingItemsModal } from "@/components/shared/missing-items-modal";
import { SaveCountModal } from "@/components/shared/save-count-modal";
import { FloatingMissingItemsButton } from "@/components/shared/FloatingMissingItemsButton";
import {
  Loader2,
  Scan,
  Upload,
  Download,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ContagemPage() {
  const searchParams = useSearchParams();

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"scan" | "import" | "export">(
    () => (searchParams.get("tab") as "scan" | "import" | "export") || "scan"
  );

  const mainContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUserId = sessionStorage.getItem("currentUserId");
    if (savedUserId) {
      setCurrentUserId(parseInt(savedUserId, 10));
    }
    setBootLoading(false);
  }, []);

  const inventory = useInventory({ userId: currentUserId });

  const handleSetAsDefault = async () => {
    let preferredMode: string | null = null;

    if (activeTab === "scan") preferredMode = "count_scan";
    if (activeTab === "import" || activeTab === "export")
      preferredMode = "count_import";

    if (!preferredMode) return;

    try {
      const response = await fetch("/api/user/preferred-mode", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preferredMode }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Erro ao salvar modo preferido:", data.error);
        return;
      }

      sessionStorage.setItem(
        "preferredMode",
        data.preferredMode || preferredMode
      );
    } catch (error) {
      console.error("Erro ao atualizar preferredMode:", error);
    }
  };

  if (bootLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <main
        ref={mainContainerRef}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-32 sm:pt-6 sm:pb-8"
      >
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "scan" | "import" | "export")}
          className="space-y-6"
        >
          {/* Menu Desktop */}
          <div className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="scan" className="flex items-center gap-2">
                <Scan className="h-4 w-4" />
                Conferência
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Importar
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
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
              handleClearCountsOnly={inventory.handleClearCountsOnly}
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
              barCodes={inventory.barCodes}
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

      {/* Navegação inferior - Modo Contagem por Importação (apenas mobile) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-around py-2">
          {/* Conferir (aba scan) */}
          <button
            type="button"
            onClick={() => setActiveTab("scan")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-1 text-[11px]",
              activeTab === "scan"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Scan
              className={cn("h-5 w-5", activeTab === "scan" && "scale-110")}
            />
            <span className="font-medium">Conferir</span>
          </button>

          {/* Exportar (aba export) */}
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-1 text-[11px]",
              activeTab === "export"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Download
              className={cn("h-5 w-5", activeTab === "export" && "scale-110")}
            />
            <span className="font-medium">Exportar</span>
          </button>

          {/* Configurações (estático por enquanto) */}
          <button
            type="button"
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-1 text-[11px]",
              "text-muted-foreground"
            )}
          >
            <SettingsIcon className="h-5 w-5" />
            <span className="font-medium">Configurações</span>
          </button>
        </div>
      </nav>

      {/* Modais Globais da tela de contagem */}
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
    </>
  );
}
