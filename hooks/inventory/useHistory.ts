// hooks/inventory/useHistory.ts

"use client";

import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import * as Papa from "papaparse";
import type { Product, BarCode, ProductCount } from "@/lib/types";

// --- Função Auxiliar para Forçar Padrão BR no CSV ---
const formatForCsv = (val: any) => {
  const num = Number(val);
  if (isNaN(num)) return "0";
  return String(num).replace(".", ",");
};

const formatPriceForCsv = (val: any) => {
  const num = Number(val);
  if (isNaN(num)) return "0,00";
  return num.toFixed(2).replace(".", ",");
};

export const useHistory = (
  userId: number | null,
  products: Product[] = [],
  barCodes: BarCode[] = [],
  productCounts: ProductCount[] = [],
) => {
  // --- Estados ---
  const [history, setHistory] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Estados para paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  // --- Funções de API ---

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setIsLoadingHistory(true);
    try {
      const response = await fetch(
        `/api/inventory/history?page=${page}&limit=10`,
      );

      if (!response.ok) {
        throw new Error("Falha ao carregar o histórico.");
      }

      const result = await response.json();

      if (Array.isArray(result)) {
        setHistory(result);
        setTotalItems(result.length);
      } else {
        setHistory(result.data || []);
        setTotalPages(result.meta?.totalPages || 1);
        setTotalItems(result.meta?.total || (result.data?.length ?? 0));
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

  const handleDeleteHistoryItem = useCallback(
    async (historyId: number) => {
      if (!userId) return;

      try {
        const response = await fetch(`/api/inventory/history/${historyId}`, {
          method: "DELETE",
        });

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
    [userId, loadHistory],
  );

  // --- Lógica de Relatório e Exportação ---

  const generateCompleteReportData = useCallback(() => {
    // 1. Mapeia APENAS itens contados (Auditoria Valuation)

    const processedData = productCounts.map((item) => {
      const price = Number(item.price || 0);
      const qtyLoja = Number(item.quant_loja || 0);
      const qtyEstoque = Number(item.quant_estoque || 0);

      // Prioriza 'total' calculado, senão soma partes
      const qtyTotal =
        item.total && Number(item.total) > 0
          ? Number(item.total)
          : qtyLoja + qtyEstoque + (Number(item.quantity) || 0);

      const totalValue = qtyTotal * price;

      return {
        cod_de_barras:
          item.codigo_produto || item.codigo_de_barras || item.barcode || "",
        descricao: item.descricao || item.name || "",
        categoria: item.categoria || "Geral",
        subcategoria: item.subcategoria || "",
        Loja: formatForCsv(qtyLoja),
        Estoque: formatForCsv(qtyEstoque),
        "Qtd Total": formatForCsv(qtyTotal),
        preco_unitario: formatPriceForCsv(price),
        valor_total: formatPriceForCsv(totalValue),
      };
    });

    // CORREÇÃO DO ERRO AQUI: Adicionado "|| ''" para garantir que seja string
    processedData.sort((a, b) =>
      (a.descricao || "").localeCompare(b.descricao || ""),
    );

    return processedData;
  }, [productCounts]);

  const exportToCsv = useCallback(() => {
    if (productCounts.length === 0) {
      toast({
        title: "Nenhum item para exportar",
        description: "Conte pelo menos um item.",
        variant: "destructive",
      });
      return;
    }

    const dataToExport = generateCompleteReportData();

    const csvData = dataToExport.map((item) => ({
      "EAN/Código": item.cod_de_barras,
      Descrição: item.descricao,
      Categoria: item.categoria,
      Subcategoria: item.subcategoria,
      Loja: item.Loja,
      Estoque: item.Estoque,
      "Qtd Total": item["Qtd Total"],
      "Preço Unit.": item.preco_unitario,
      "Valor Total": item.valor_total,
    }));

    const csv = Papa.unparse(csvData, {
      delimiter: ";",
      quotes: true,
    });

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_valuation_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [productCounts, generateCompleteReportData]);

  const handleSaveCount = useCallback(() => {
    if (!userId) {
      toast({
        title: "Erro de Usuário",
        description: "Sessão inválida. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    if (productCounts.length === 0) {
      toast({
        title: "Nada para salvar",
        description: "Não há itens contados para salvar.",
        variant: "destructive",
      });
      return;
    }

    setShowSaveModal(true);
  }, [userId, productCounts.length]);

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

        const clientName =
          localStorage.getItem("audit_client_name") || "Cliente Desconhecido";

        const date = new Date();
        const dateSuffix = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;

        const fileName = `${baseName.trim()} - ${clientName} - ${dateSuffix}`;

        const formData = new FormData();
        formData.append("fileName", fileName);
        formData.append("csvContent", csvContent);
        formData.append("clientName", clientName);

        const response = await fetch(`/api/inventory/history`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Erro ao salvar no servidor.");

        toast({
          title: "Auditoria Salva!",
          description: "Os dados foram salvos no histórico com sucesso.",
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
    [userId, generateCompleteReportData, loadHistory],
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
    totalItems,
  };
};
