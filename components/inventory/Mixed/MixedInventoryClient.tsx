"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scan, Upload, Download, Settings } from "lucide-react";
import { useExternalScannerMode } from "@/hooks/useExternalScannerMode";
import { useMixedInventory } from "./useMixedInventory";
import { MixedConferenceTab } from "./MixedConferenceTab";
import { MixedImportTab } from "./MixedImportTab";
import { MixedExportTab } from "./MixedExportTab";
import { MixedConfigTab } from "./MixedConfigTab";
import * as Papa from "papaparse";
import { toast } from "@/hooks/use-toast";

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

  const {
    externalScannerMode,
    setExternalScannerMode,
    externalScannerModeReady,
  } = useExternalScannerMode();

  const mixed = useMixedInventory(userId);

  const handleTabChange = (val: string) => {
    setActiveTab(val as TabType);
    router.push(`/mixed-inventory?tab=${val}`);
  };

  // Salvar no histórico
  const handleSaveToHistory = async (fileName: string) => {
    if (!userId || mixed.counts.length === 0) return;

    const exportRows = mixed.counts.map((item) => ({
      "Código de Barras": item.codigo_de_barras,
      "Código do Produto": item.codigo_produto || "",
      "Descrição": item.descricao,
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
      "Data / Hora": item.data_hora,
    }));

    const metaLine = `# COUNTIFLY_METADATA: ${JSON.stringify({
      data_fotografia: mixed.snapshotDate,
      corte_entrada: mixed.corteEntrada,
      corte_saida: mixed.corteSaida,
      recount_logs: mixed.recountLogs,
    })}\n`;
    const csvContent = "\uFEFF" + metaLine + Papa.unparse(exportRows, { delimiter: ";" });

    const cleanName = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
    const formData = new FormData();
    const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    formData.append("csvFile", csvBlob, cleanName);
    formData.append("fileName", cleanName);
    formData.append("tipo_contagem", "modular");
    if (mixed.snapshotDate) formData.append("data_fotografia", mixed.snapshotDate);
    if (mixed.corteEntrada) formData.append("corte_entrada", mixed.corteEntrada);
    if (mixed.corteSaida) formData.append("corte_saida", mixed.corteSaida);

    const res = await fetch("/api/inventory/history", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Falha ao registrar contagem no histórico.");
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-0 sm:px-6 lg:px-8 pt-0 sm:pt-6 pb-32 sm:pb-8">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="sm:space-y-6">
        {/* Menu Desktop */}
        <div className="hidden sm:block">
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Config.
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. ABA DE CONFERÊNCIA */}
        <TabsContent value="scan" className="mt-0 sm:space-y-6">
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
            handleSaveCount={() => handleTabChange("export")}
            hasImportedCatalog={mixed.products.length > 0}
            catalogCount={mixed.products.length}
            isImportReady={mixed.products.length > 0}
            onGoToImport={() => handleTabChange("import")}
            settings={mixed.settings}
            externalScannerMode={externalScannerMode}
            externalScannerModeReady={externalScannerModeReady}
            statusItemInput={mixed.statusItemInput}
            setStatusItemInput={mixed.setStatusItemInput}
          />
        </TabsContent>

        {/* 2. ABA DE IMPORTAÇÃO */}
        <TabsContent value="import" className="space-y-6">
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
        <TabsContent value="export" className="space-y-6">
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
        <TabsContent value="config" className="space-y-6">
          <MixedConfigTab
            settings={mixed.settings}
            onSettingsChange={mixed.updateSettings}
            onClearCountsOnly={mixed.clearCountsOnly}
            onClearAllData={mixed.clearAllData}
            catalogCount={mixed.products.length}
            onGoToImport={() => handleTabChange("import")}
            onClearCatalog={() => {
              mixed.updateCatalog([]);
              toast({ title: "Catálogo descarregado", description: "O Modular agora está operando sem catálogo." });
            }}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
