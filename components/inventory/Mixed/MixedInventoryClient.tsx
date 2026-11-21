"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scan, Upload, Download, Settings, CloudUpload } from "lucide-react";
import { useExternalScannerMode } from "@/hooks/useExternalScannerMode";
import { useMixedInventory } from "./useMixedInventory";
import { MixedConferenceTab } from "./MixedConferenceTab";
import { MixedImportTab } from "./MixedImportTab";
import { MixedExportTab } from "./MixedExportTab";
import { MixedConfigTab } from "./MixedConfigTab";
import { SaveCountModal } from "@/components/shared/save-count-modal";
import { getStoredCompanyContext } from "@/lib/company-context";
import * as Papa from "papaparse";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type TabType = "scan" | "import" | "export" | "config";

interface MixedInventoryClientProps {
  userId: number;
  initialTab?: TabType;
}

export function MixedInventoryClient({
  userId,
  initialTab = "scan",
}: MixedInventoryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get("tab") as TabType) || initialTab;
  const [activeTab, setActiveTab] = useState<TabType>(tabParam);

  // Sincronização ultra-rápida de abas sem travar a navegação do Next.js
  const handleTabChange = useCallback((val: string) => {
    setActiveTab(val as TabType);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/mixed-inventory?tab=${val}`);
    }
  }, []);

  // Suporte a voltar/avançar no navegador (botões do browser)
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = (params.get("tab") as TabType) || "scan";
      setActiveTab(tab);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Sincroniza se query param mudar externamente
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const {
    externalScannerMode,
    setExternalScannerMode,
    externalScannerModeReady,
  } = useExternalScannerMode();

  const mixed = useMixedInventory(userId);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Abertura do modal de salvar contagem
  const handleOpenSaveModal = () => {
    if (mixed.counts.length === 0) {
      toast({
        title: "Nada para salvar",
        description: "Bipe os produtos antes de salvar a contagem.",
        variant: "destructive",
      });
      return;
    }
    setIsSaveModalOpen(true);
  };

  // Salvar contagem no histórico do Countifly
  const handleSaveToHistory = async (fileName: string) => {
    if (!userId || mixed.counts.length === 0) {
      toast({
        title: "Nada para salvar",
        description: "Bipe os produtos antes de salvar a contagem.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const exportRows = mixed.counts.map((item) => ({
        "Código de Barras": item.codigo_de_barras,
        "Código do Produto": item.codigo_produto || "",
        "Descrição": item.descricao,
        "NCM": item.ncm || "",
        "Localização": item.localizacao || "",
        "Data de Validade": item.validade || "",
        "Lote": item.lote || "",
        "Status": item.status_item || "NORMAL",
        "Loja": item.quant_loja ?? (item.tipo_local === "LOJA" ? item.quantidade : 0),
        "Estoque": item.quant_estoque ?? (item.tipo_local === "ESTOQUE" ? item.quantidade : 0),
        "Quantidade Total": item.quantidade,
        "Quantidade": item.quantidade,
        "Custo Unitário": Number(item.custo || 0).toFixed(2),
        "Valor Total": (item.quantidade * Number(item.custo || 0)).toFixed(2),
        "Curva ABC": item.curva_abc || "C",
        "Tipo de Local": item.tipo_local || "LOJA",
        "Data e Hora": item.data_hora,
      }));

      const metaLine = `# COUNTIFLY_METADATA: ${JSON.stringify({
        data_fotografia: mixed.snapshotDate,
        corte_entrada: mixed.corteEntrada,
        corte_saida: mixed.corteSaida,
        recount_logs: mixed.recountLogs,
      })}\n`;
      const csvContent = "\uFEFF" + metaLine + Papa.unparse(exportRows, { delimiter: ";" });

      const dateSuffix = new Date().toISOString().split("T")[0];
      const cleanBase = fileName.replace(/\.csv$/i, "").trim() || "inventario_modular";
      const cleanName = cleanBase.includes(dateSuffix) ? `${cleanBase}.csv` : `${cleanBase} - ${dateSuffix}.csv`;

      const formData = new FormData();
      const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      formData.append("csvFile", csvBlob, cleanName);
      formData.append("fileName", cleanName);
      formData.append("tipo_contagem", "modular");
      if (mixed.snapshotDate) formData.append("data_fotografia", mixed.snapshotDate);
      if (mixed.corteEntrada) formData.append("corte_entrada", mixed.corteEntrada);
      if (mixed.corteSaida) formData.append("corte_saida", mixed.corteSaida);

      const selectedCompanyId = userId ? getStoredCompanyContext(userId) : null;
      if (selectedCompanyId) {
        formData.append("empresa_id", String(selectedCompanyId));
      }

      const res = await fetch("/api/inventory/history", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao registrar contagem no histórico.");
      }

      toast({ title: "Contagem salva com sucesso!" });
      setIsSaveModalOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-0 sm:px-6 lg:px-8 pt-0 sm:pt-6 pb-32 sm:pb-8">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="sm:space-y-6">
        {/* Menu Desktop (Oculto no Mobile, onde atua somente a navegação inferior) */}
        <div className="hidden sm:block mb-6">
          <TabsList className="grid w-full grid-cols-4 h-11 sm:h-12 bg-muted/60 p-1 rounded-xl">
            <TabsTrigger
              value="scan"
              className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:shadow-xs"
            >
              <Scan className="h-4 w-4 shrink-0" />
              <span>Conferência</span>
            </TabsTrigger>
            <TabsTrigger
              value="import"
              className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:shadow-xs"
            >
              <Upload className="h-4 w-4 shrink-0" />
              <span>Importar</span>
            </TabsTrigger>
            <TabsTrigger
              value="export"
              className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:shadow-xs"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span>Exportar</span>
            </TabsTrigger>
            <TabsTrigger
              value="config"
              className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:shadow-xs"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Configurações</span>
              <span className="sm:hidden">Config.</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. ABA DE CONFERÊNCIA (Mantida viva na memória para troca instantânea de abas) */}
        <TabsContent
          value="scan"
          forceMount
          className={cn("mt-0 sm:space-y-6", activeTab !== "scan" && "hidden")}
        >
          <MixedConferenceTab
            scanInput={mixed.scanInput}
            setScanInput={mixed.setScanInput}
            handleScan={mixed.handleScan}
            isCameraActive={mixed.isCameraActive}
            setIsCameraActive={mixed.setIsCameraActive}
            currentProduct={mixed.currentProduct}
            setCurrentProduct={mixed.setCurrentProduct}
            descriptionInput={mixed.descriptionInput}
            setDescriptionInput={mixed.setDescriptionInput}
            quantityInput={mixed.quantityInput}
            setQuantityInput={mixed.setQuantityInput}
            priceInput={mixed.priceInput}
            setPriceInput={mixed.setPriceInput}
            locationInput={mixed.locationInput}
            setLocationInput={mixed.setLocationInput}
            validadeInput={mixed.validadeInput}
            setValidadeInput={mixed.setValidadeInput}
            loteInput={mixed.loteInput}
            setLoteInput={mixed.setLoteInput}
            countingMode={mixed.countingMode}
            setCountingMode={mixed.setCountingMode}
            handleAddCount={mixed.handleAddCount}
            counts={mixed.counts}
            handleRemoveCount={mixed.handleRemoveCount}
            handleClearCountsOnly={mixed.clearCountsOnly}
            hasImportedCatalog={mixed.products.length > 0}
            catalogCount={mixed.products.length}
            isImportReady={mixed.products.length > 0}
            onGoToImport={() => handleTabChange("import")}
            settings={mixed.settings}
            externalScannerMode={externalScannerMode}
            externalScannerModeReady={externalScannerModeReady}
            statusItemInput={mixed.statusItemInput}
            setStatusItemInput={mixed.setStatusItemInput}
            barcodeLength={mixed.barcodeLength}
          />
        </TabsContent>

        {/* 2. ABA DE IMPORTAÇÃO */}
        <TabsContent
          value="import"
          forceMount
          className={cn("space-y-6 px-3 sm:px-0", activeTab !== "import" && "hidden")}
        >
          <MixedImportTab
            products={mixed.products}
            onImportComplete={mixed.updateCatalog}
            downloadTemplateCSV={mixed.downloadTemplateCSV}
            onClearCatalog={mixed.clearAllData}
            onGoToConference={() => handleTabChange("scan")}
            snapshotDate={mixed.snapshotDate}
          />
        </TabsContent>

        {/* 3. ABA DE EXPORTAÇÃO */}
        <TabsContent
          value="export"
          forceMount
          className={cn("space-y-6 px-3 sm:px-0", activeTab !== "export" && "hidden")}
        >
          <MixedExportTab
            products={mixed.products}
            counts={mixed.counts}
            userId={userId}
            onSaveToHistory={handleSaveToHistory}
            snapshotDate={mixed.snapshotDate}
            corteEntrada={mixed.corteEntrada}
            setCorteEntrada={mixed.setCorteEntrada}
            corteSaida={mixed.corteSaida}
            setCorteSaida={mixed.setCorteSaida}
            recountLogs={mixed.recountLogs}
            onApplyRecount={mixed.handleApplyRecount}
          />
        </TabsContent>

        {/* 4. ABA DE CONFIGURAÇÕES */}
        <TabsContent
          value="config"
          forceMount
          className={cn("space-y-6 px-3 sm:px-0", activeTab !== "config" && "hidden")}
        >
          <MixedConfigTab
            settings={mixed.settings}
            onSettingsChange={mixed.updateSettings}
            onClearCountsOnly={mixed.clearCountsOnly}
            onClearAllData={mixed.clearAllData}
            catalogCount={mixed.products.length}
            onGoToImport={() => handleTabChange("import")}
            barcodeLength={mixed.barcodeLength}
            onBarcodeLengthChange={mixed.setBarcodeLength}
            onClearCatalog={() => {
              mixed.updateCatalog([]);
              toast({ title: "Catálogo descarregado", description: "O Modular agora está operando sem catálogo." });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Botão Flutuante Salvar Contagem (Presente em todas as telas) */}
      <button
        type="button"
        onClick={handleOpenSaveModal}
        className={cn(
          "fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40",
          "h-12 w-12 sm:h-14 sm:w-14 rounded-full",
          "bg-primary text-primary-foreground shadow-lg hover:shadow-xl",
          "flex items-center justify-center transition-all duration-200",
          "hover:scale-105 active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer",
          mixed.counts.length === 0 && "opacity-80"
        )}
        title="Salvar Contagem"
        aria-label="Salvar Contagem"
      >
        <CloudUpload className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
        {mixed.counts.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-background shadow-xs">
            {mixed.counts.length > 99 ? "99+" : mixed.counts.length}
          </span>
        )}
      </button>

      {/* Modal Unificado de Salvar Contagem */}
      <SaveCountModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onConfirm={(name) => handleSaveToHistory(name)}
        isLoading={isSaving}
        userId={userId}
        companyId={
          userId && getStoredCompanyContext(userId)
            ? Number(getStoredCompanyContext(userId))
            : null
        }
        contextLabel="Contagem Modular"
        defaultFileName="contagem_modular"
        minimal={true}
      />
    </main>
  );
}
