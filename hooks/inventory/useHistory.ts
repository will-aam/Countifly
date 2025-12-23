// hooks/inventory/useHistory.ts

"use client";

import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import * as Papa from "papaparse";
import type { Product, BarCode, ProductCount } from "@/lib/types";

// --- Função Auxiliar para Forçar Padrão BR no CSV ---
// Transforma números decimais em strings com vírgula para compatibilidade com Excel BR
const formatForCsv = (val: any) => {
  const num = Number(val);
  if (isNaN(num)) return "0";
  return String(num).replace(".", ",");
};

export const useHistory = (
  userId: number | null,
  products: Product[] = [],
  barCodes: BarCode[] = [],
  productCounts: ProductCount[] = []
) => {
  // --- Estados ---
  const [history, setHistory] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Estados para paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // --- Funções de API ---

  /**
   * Carrega o histórico de contagens do servidor com paginação.
   */
  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setIsLoadingHistory(true);
    try {
      const response = await fetch(
        `/api/inventory/${userId}/history?page=${page}&limit=10`
      );

      if (!response.ok) {
        throw new Error("Falha ao carregar o histórico.");
      }

      const result = await response.json();

      if (Array.isArray(result)) {
        setHistory(result);
      } else {
        setHistory(result.data || []);
        setTotalPages(result.meta?.totalPages || 1);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar histórico",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [userId, page]);

  /**
   * Exclui um item específico do histórico.
   */
  const handleDeleteHistoryItem = useCallback(
    async (historyId: number) => {
      if (!userId) return;

      try {
        const response = await fetch(
          `/api/inventory/${userId}/history/${historyId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error("Falha ao excluir o item do histórico.");
        }

        await loadHistory();

        toast({
          title: "Sucesso!",
          description: "O item foi removido do histórico.",
        });
      } catch (error: any) {
        toast({
          title: "Erro ao excluir",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [userId, loadHistory]
  );

  // --- Lógica de Relatório e Exportação ---

  /**
   * Cruza os dados de contagem com o catálogo para gerar o relatório final.
   */
  const generateCompleteReportData = useCallback(() => {
    if (productCounts.length === 0 && products.length === 0) return [];

    // 1. Itens que foram efetivamente contados
    const countedItemsData = productCounts.map((item) => ({
      codigo_de_barras: item.codigo_de_barras,
      codigo_produto: item.codigo_produto,
      descricao: item.descricao,
      saldo_estoque: formatForCsv(item.saldo_estoque),
      quant_loja: formatForCsv(item.quant_loja),
      quant_estoque: formatForCsv(item.quant_estoque),
      total: formatForCsv(item.total),
    }));

    const countedProductCodes = new Set(
      productCounts
        .filter((p) => !p.codigo_produto.startsWith("TEMP-"))
        .map((pc) => pc.codigo_produto)
    );

    // 2. Itens do catálogo que não foram contados (Faltantes)
    const uncountedItemsData = products
      .filter((p) => !countedProductCodes.has(p.codigo_produto))
      .map((product) => {
        const barCode = barCodes.find((bc) => bc.produto_id === product.id);
        const saldo = Number(product.saldo_estoque);
        return {
          codigo_de_barras: barCode?.codigo_de_barras || "N/A",
          codigo_produto: product.codigo_produto,
          descricao: product.descricao,
          saldo_estoque: formatForCsv(saldo),
          quant_loja: "0",
          quant_estoque: "0",
          total: formatForCsv(-saldo),
        };
      });

    const combinedData = [...countedItemsData, ...uncountedItemsData];
    combinedData.sort((a, b) => a.descricao.localeCompare(b.descricao));

    return combinedData;
  }, [products, productCounts, barCodes]);

  /**
   * Exporta a contagem atual diretamente para um ficheiro CSV.
   */
  const exportToCsv = useCallback(() => {
    if (products.length === 0 && productCounts.length === 0) {
      toast({
        title: "Nenhum item para exportar",
        description: "Importe um catálogo ou conte um item primeiro.",
        variant: "destructive",
      });
      return;
    }

    const dataToExport = generateCompleteReportData();

    const csv = Papa.unparse(dataToExport, {
      header: true,
      delimiter: ";",
      quotes: true,
    });

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `contagem_completa_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [products, productCounts, generateCompleteReportData]);

  /**
   * Abre o modal de salvamento após validar a existência de dados.
   */
  const handleSaveCount = useCallback(() => {
    if (!userId) {
      toast({
        title: "Erro de Usuário",
        description: "Sessão inválida. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    if (products.length === 0 && productCounts.length === 0) {
      toast({
        title: "Nada para salvar",
        description:
          "Não há catálogo carregado nem itens contados para salvar.",
        variant: "destructive",
      });
      return;
    }

    setShowSaveModal(true);
  }, [userId, products.length, productCounts.length]);

  /**
   * Executa o upload da contagem para o servidor utilizando FormData.
   */
  const executeSaveCount = useCallback(
    async (baseName: string) => {
      if (!userId) return;

      setIsSaving(true);
      try {
        const dataToExport = generateCompleteReportData();
        const csvContent = Papa.unparse(dataToExport, {
          header: true,
          delimiter: ";",
          quotes: true,
        });

        const date = new Date();
        const dateSuffix = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
        const fileName = `${baseName.trim()}_${dateSuffix}.csv`;

        // Utilização de FormData para evitar erros de limite de JSON em ficheiros grandes
        const formData = new FormData();
        formData.append("fileName", fileName);
        formData.append("csvContent", csvContent);

        const response = await fetch(`/api/inventory/${userId}/history`, {
          method: "POST",
          body: formData, // O navegador define o Content-Type: multipart/form-data automaticamente
        });

        if (!response.ok) throw new Error("Erro ao salvar no servidor.");

        toast({
          title: "Sucesso!",
          description: "Sua contagem foi salva no histórico.",
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
    handleDeleteHistoryItem,
    exportToCsv,
    handleSaveCount,
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
