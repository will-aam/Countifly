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
import { Loader2, Settings, Scan, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AuditPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [bootLoading, setBootLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"scan" | "settings" | "export">(
    () => (searchParams.get("tab") as "scan" | "settings" | "export") || "scan"
  );

  const [fileName, setFileName] = useState("");

  const [auditConfig, setAuditConfig] = useState<AuditConfig>({
    offlineMode: false,
    collectPrice: true,
    enableCustomName: false,
  });

  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  const mainContainerRef = useRef<HTMLDivElement>(null);

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

  // Bootstrap de usuário: tenta sessionStorage; se não tiver, usa /api/user/me (JWT no cookie)
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
          throw new Error("Falha ao carregar usuário autenticado.");
        }

        const data = await res.json();
        if (data?.success && data.id) {
          setCurrentUserId(data.id);
          sessionStorage.setItem("currentUserId", String(data.id));
          if (data.preferredMode) {
            sessionStorage.setItem("preferredMode", data.preferredMode);
          }
        } else {
          router.replace("/login?from=/audit");
          return;
        }
      } catch (error) {
        console.error("Erro ao inicializar usuário em /audit:", error);
        router.replace("/login?from=/audit");
        return;
      } finally {
        setBootLoading(false);
      }
    };

    bootstrapUser();
  }, [router]);

  // Sincroniza a aba com o query param ?tab=...
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

  const inventory = useInventory({ userId: currentUserId });

  if (bootLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
                handleClearCountsOnly={inventory.handleClearCountsOnly}
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
    </>
  );
}
