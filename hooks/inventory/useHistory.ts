/**
 * Descrição: Hook responsável pelo Histórico e Exportação.
 * Responsabilidade:
 * 1. Carregar e gerenciar a lista de históricos salvos com paginação.
 * 2. Gerar relatórios (CSV) cruzando catálogo e contagens.
 * 3. Exportar dados para arquivo ou salvar no servidor.
 */

"use client";

import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import * as Papa from "papaparse";
import type { Product, BarCode, ProductCount } from "@/lib/types";

export const useHistory = (
  userId: number | null,
  products: Product[],
  barCodes: BarCode[],
  productCounts: ProductCount[]
) => {
  // --- Estados ---
  const [history, setHistory] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Novos estados para paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // --- Funções de API (Histórico) ---

  /**
   * Carrega o histórico de contagens salvas do servidor com paginação.
   */
  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setIsLoadingHistory(true); // Feedback visual é importante
    try {
      // Passamos a página atual na query string
      const response = await fetch(
        `/api/inventory/${userId}/history?page=${page}&limit=10`
      );

      if (!response.ok) {
        throw new Error("Falha ao carregar o histórico.");
      }

      const result = await response.json();

      // Ajustamos para o novo formato da API
      // Se a API antiga (array direto) ainda responder por cache, tratamos isso
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
  }, [userId, page]); // 'page' entra nas dependências para recarregar ao mudar

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

        // Opção A: Recarregar do servidor (mais seguro com paginação)
        loadHistory();

        // Opção B: Remover localmente (apenas se tiver certeza que não vai quebrar a página)
        // setHistory((prevHistory) =>
        //   prevHistory.filter((item) => item.id !== historyId)
        // );

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
   * Gera os dados completos para o relatório (Contados + Não Contados).
   */
  const generateCompleteReportData = useCallback(() => {
    // 1. Itens que foram contados
    const countedItemsData = productCounts.map((item) => ({
      codigo_de_barras: item.codigo_de_barras,
      codigo_produto: item.codigo_produto,
      descricao: item.descricao,
      saldo_estoque: item.saldo_estoque,
      quant_loja: item.quant_loja,
      quant_estoque: item.quant_estoque,
      total: item.total,
    }));

    // Lista de códigos de produtos que já foram contados (para filtrar o resto)
    const countedProductCodes = new Set(
      productCounts
        .filter((p) => !p.codigo_produto.startsWith("TEMP-"))
        .map((pc) => pc.codigo_produto)
    );

    // 2. Itens do catálogo que NÃO foram contados (Faltantes)
    const uncountedItemsData = products
      .filter((p) => !countedProductCodes.has(p.codigo_produto))
      .map((product) => {
        const barCode = barCodes.find((bc) => bc.produto_id === product.id);
        const saldo = Number(product.saldo_estoque);
        return {
          codigo_de_barras: barCode?.codigo_de_barras || "N/A",
          codigo_produto: product.codigo_produto,
          descricao: product.descricao,
          saldo_estoque: saldo,
          quant_loja: 0,
          quant_estoque: 0,
          total: -saldo,
        };
      });

    // Combina e ordena
    const combinedData = [...countedItemsData, ...uncountedItemsData];
    combinedData.sort((a, b) => a.descricao.localeCompare(b.descricao));

    return combinedData;
  }, [products, productCounts, barCodes]);

  /**
   * Exporta para CSV (Download Direto).
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
   * Valida e abre o modal de salvar.
   */
  const handleSaveCount = useCallback(async () => {
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
   * Envia os dados para o servidor (Persistência Final).
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

        const response = await fetch(`/api/inventory/${userId}/history`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileName, csvContent }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Falha ao salvar a contagem no servidor."
          );
        }

        toast({
          title: "Sucesso!",
          description: "Sua contagem foi salva no histórico.",
        });

        // Volta para a primeira página ao salvar um novo item
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
    [userId, generateCompleteReportData, loadHistory, setPage]
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
    // Novos retornos
    page,
    setPage,
    totalPages,
    isLoadingHistory,
  };
};
