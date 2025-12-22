// hooks/inventory/useHistory.ts

"use client";

import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import * as Papa from "papaparse";
import type { Product, BarCode, ProductCount } from "@/lib/types";

export const useHistory = (
  userId: number | null,
  products: Product[] = [],
  barCodes: BarCode[] = [],
  productCounts: ProductCount[] = []
) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // ... (Gera o relatório CSV - Mantendo sua lógica de formatação)
  const generateCompleteReportData = useCallback(() => {
    // ... sua lógica de map aqui (omitida para brevidade, mantenha a sua)
    return []; // Retorne o array processado
  }, [products, productCounts, barCodes]);

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setIsLoadingHistory(true);
    try {
      const response = await fetch(
        `/api/inventory/${userId}/history?page=${page}&limit=10`
      );
      if (!response.ok) throw new Error("Falha ao carregar histórico.");
      const result = await response.json();
      setHistory(result.data || []);
      setTotalPages(result.meta?.totalPages || 1);
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [userId, page]);

  const executeSaveCount = useCallback(
    async (baseName: string) => {
      if (!userId) return;
      setIsSaving(true);
      try {
        const dataToExport = generateCompleteReportData();
        const csvContent = Papa.unparse(dataToExport, {
          delimiter: ";",
          quotes: true,
        });

        const date = new Date();
        const dateSuffix = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
        const fileName = `${baseName.trim()}_${dateSuffix}.csv`;

        // MUDANÇA: FormData para suportar volumes grandes de dados
        const formData = new FormData();
        formData.append("fileName", fileName);
        formData.append("csvContent", csvContent);

        const response = await fetch(`/api/inventory/${userId}/history`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Erro ao salvar no servidor.");

        toast({
          title: "Sucesso!",
          description: "Contagem salva no histórico.",
        });
        setPage(1);
        await loadHistory();
        setShowSaveModal(false);
      } catch (error: any) {
        toast({
          title: "Erro ao salvar",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [userId, generateCompleteReportData, loadHistory]
  );

  return {
    history,
    loadHistory,
    executeSaveCount,
    isSaving,
    showSaveModal,
    setShowSaveModal,
    page,
    setPage,
    totalPages,
    isLoadingHistory,
  };
};
