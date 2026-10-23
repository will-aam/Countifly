"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import * as Papa from "papaparse";

import { useCatalog } from "./inventory/useCatalog";
import { useScanner, type ScannerPreferences } from "./inventory/useScanner";
import { useCounts } from "./inventory/useCounts";
import { useHistory } from "./inventory/useHistory";
import { useSyncQueue } from "./useSyncQueue";
import type { Product, TempProduct } from "@/lib/types";
import type { AuditConfig } from "@/lib/audit";
import {
  activateCountContextLock,
  getStoredCompanyContext,
  releaseCountContextLock,
} from "@/lib/company-context";

interface UseInventoryProps {
  userId: number | null;
  mode?: "audit" | "import";
  defaultCountingMode?: "loja" | "estoque";
  scannerPreferences?: Pick<
    ScannerPreferences,
    "soundEnabled" | "vibrationEnabled" | "directScanEnabled" | "barcodeLength"
  >;
  onCountSaved?: () => void;
  auditSessionId?: string;
  auditSessionName?: string;
  auditConfig?: AuditConfig;
}

export const useInventory = ({
  userId,
  mode = "audit",
  defaultCountingMode = "loja",
  scannerPreferences,
  onCountSaved,
  auditSessionId,
  auditSessionName,
  auditConfig,
}: UseInventoryProps) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const updateCompany = () => {
      const id = userId ? getStoredCompanyContext(userId) : null;
      setSelectedCompanyId(id ? Number(id) : null);
    };

    updateCompany();
    window.addEventListener("companyChanged", updateCompany);
    return () => window.removeEventListener("companyChanged", updateCompany);
  }, [userId]);

  const catalog = useCatalog(userId, mode);
  const hasImportedCatalog = useMemo(
    () => catalog.products.some((product) => product.tipo_cadastro !== "FIXO"),
    [catalog.products],
  );

  const fastCountHandlerRef = useRef<
    (
      product: Product | TempProduct,
      barcode: string,
      countingMode?: "loja" | "estoque",
    ) => void
  >(() => {});
  const countingModeRef = useRef<"loja" | "estoque">(defaultCountingMode);
  const scanner = useScanner(catalog.barCodes, catalog.searchProductOnline, {
    soundEnabled: scannerPreferences?.soundEnabled ?? false,
    vibrationEnabled: scannerPreferences?.vibrationEnabled ?? true,
    directScanEnabled: mode === "import" &&
      (scannerPreferences?.directScanEnabled ?? false),
    barcodeLength: mode === "import"
      ? scannerPreferences?.barcodeLength ?? 13
      : undefined,
    isEnabled: mode !== "import" || hasImportedCatalog,
    getCountingMode: () => countingModeRef.current,
    onFastCount: (product, barcode, countingMode) =>
      fastCountHandlerRef.current(product, barcode, countingMode),
  });

  const counts = useCounts({
    userId,
    currentProduct: scanner.currentProduct,
    scanInput: scanner.scanInput,
    mode: mode,
    defaultCountingMode,
    auditSessionId,
    captureQuantity: mode === "audit" ? auditConfig?.collectQuantity : true,
    onCountAdded: () => {
      if (userId) activateCountContextLock(userId, mode);
      scanner.resetScanner();
      setTimeout(() => {
        const barcodeInput = document.getElementById("barcode");
        if (barcodeInput) barcodeInput.focus();
      }, 100);
    },
  });

  useEffect(() => {
    countingModeRef.current = counts.countingMode;
  }, [counts.countingMode]);

  useEffect(() => {
    fastCountHandlerRef.current = (product, barcode, countingMode) => {
      if (mode !== "import" || !hasImportedCatalog) return;
      void counts.handleAddCount(1, {
        productOverride: product,
        barcodeOverride: barcode,
        countingModeOverride: countingMode,
        quiet: true,
        fastScan: true,
      });
    };
  }, [counts.handleAddCount, mode, hasImportedCatalog]);

  const countsHydratedRef = useRef(false);

  useEffect(() => {
    if (!userId || !counts.isLoaded) return;
    if (mode === "import" && catalog.isLoading) return;
    const hasImportedCatalog = catalog.products.some(
      (product) => product.tipo_cadastro !== "FIXO",
    );
    const hasActiveCount = counts.productCounts.length > 0;
    const shouldLock = mode === "import"
      ? hasImportedCatalog || hasActiveCount
      : hasActiveCount;

    if (shouldLock) {
      activateCountContextLock(userId, mode);
    } else if (mode === "import" || !countsHydratedRef.current) {
      // Import mode can recover an interrupted upload after the catalog loads.
      // Audit mode only clears stale locks during initial hydration; removing
      // rows one by one does not unlock the count until the explicit clear action.
      releaseCountContextLock(userId, mode);
    }
    countsHydratedRef.current = true;
  }, [userId, mode, counts.isLoaded, counts.productCounts.length, catalog.products, catalog.isLoading]);

  const historyHook = useHistory(
    userId,
    counts.productCounts,
    mode,
    catalog.products,
    catalog.barCodes,
    onCountSaved,
    auditConfig,
    auditSessionName,
  );

  const handleAddCount = useCallback(
    (...args: Parameters<typeof counts.handleAddCount>) => {
      if (mode === "import" && !hasImportedCatalog) {
        toast({
          title: "Importe um arquivo primeiro",
          description: "A contagem por importação exige uma base de produtos.",
          variant: "destructive",
        });
        return;
      }
      return counts.handleAddCount(...args);
    },
    [counts.handleAddCount, mode, hasImportedCatalog],
  );

  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showMissingItemsModal, setShowMissingItemsModal] = useState(false);

  const handleAddManualItem = useCallback(
    (
      barcode: string,
      quantity: number,
      description?: string,
      price?: number,
    ) => {
      handleAddCount(quantity, {
        isManual: true,
        manualDescription: description,
        manualPrice: price,
      });
    },
    [handleAddCount],
  );

  const handleEditTempItemDescription = useCallback(
    (itemId: number, newDescription: string) => {
      if (!newDescription.trim()) {
        toast({
          title: "Descrição inválida",
          description: "A descrição não pode estar vazia.",
          variant: "destructive",
        });
        return;
      }

      const trimmedDescription = newDescription.trim().slice(0, 30);

      counts.setProductCounts((prevCounts) =>
        prevCounts.map((item) =>
          item.id === itemId
            ? { ...item, descricao: trimmedDescription }
            : item,
        ),
      );

      toast({
        title: "Descrição atualizada!",
        description: "O item temporário foi renomeado com sucesso.",
      });
    },
    [counts],
  );

  const missingItems = useMemo(() => {
    const productCountMap = new Map(
      counts.productCounts.map((pc) => [pc.codigo_produto, pc]),
    );

    return catalog.products
      .filter((product) => {
        if (mode === "import" && product.tipo_cadastro === "FIXO") {
          return false;
        }
        return true;
      })
      .map((product) => {
        const countedItem = productCountMap.get(product.codigo_produto);
        const countedQuantity =
          Number(countedItem?.quant_loja ?? 0) +
          Number(countedItem?.quant_estoque ?? 0);

        if (countedQuantity > 0) return null;

        const barCode = catalog.barCodes.find(
          (bc) => bc.produto_id === product.id,
        );
        const saldoEstoque = Number(product.saldo_estoque) || 0;

        return {
          codigo_de_barras: barCode?.codigo_de_barras || "N/A",
          descricao: product.descricao,
          faltante: saldoEstoque,
        };
      })
      .filter((item): item is any => item !== null);
  }, [catalog.products, counts.productCounts, catalog.barCodes, mode]);

  const handleClearAllData = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/inventory?scope=all`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Falha ao limpar dados do servidor.");
      releaseCountContextLock(userId, "audit");
      releaseCountContextLock(userId, "import");
      toast({
        title: "Sucesso!",
        description: "Todos os dados foram removidos.",
      });
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Erro ao limpar dados",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [userId]);

  const handleClearImportOnly = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/inventory?scope=catalog`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Falha ao limpar importação.");
      releaseCountContextLock(userId, "import");
      toast({
        title: "Importação Limpa!",
        description: "Os produtos foram removidos.",
      });
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Erro ao limpar importação",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [userId]);

  const handleClearCountsOnly = useCallback(async () => {
    const clearConfirmed = await counts.handleClearCountsOnly();
    if (!clearConfirmed) return;
    if (!userId) return;
    const hasImportedCatalog = catalog.products.some(
      (product) => product.tipo_cadastro !== "FIXO",
    );
    if (mode === "audit" || !hasImportedCatalog) {
      releaseCountContextLock(userId, mode);
    }
  }, [counts.handleClearCountsOnly, userId, mode, catalog.products]);

  const downloadTemplateCSV = useCallback(() => {
    const templateData = [
      {
        codigo_de_barras: "7891234567890",
        codigo_produto: "PROD001",
        descricao: "Item Exemplo 1",
        saldo_estoque: "100",
      },
    ];
    const csv = Papa.unparse(templateData, { delimiter: ";", quotes: true });
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template_itens.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }, []);

  return {
    ...catalog,
    ...scanner,
    ...counts,
    ...historyHook,

    hasImportedCatalog: mode !== "import" || hasImportedCatalog,
    handleAddCount,

    selectedCompanyId,
    csvErrors,
    setCsvErrors,
    showClearDataModal,
    setShowClearDataModal,
    showMissingItemsModal,
    setShowMissingItemsModal,
    missingItems,

    handleClearAllData,
    handleClearImportOnly,
    handleClearCountsOnly,
    handleAddManualItem,
    handleEditTempItemDescription,

    downloadTemplateCSV,
  };
};
