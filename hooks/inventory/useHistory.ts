// hooks/inventory/useHistory.ts

"use client";

import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import * as Papa from "papaparse";
import type { Product, BarCode, ProductCount } from "@/lib/types";
import { formatCurrency } from "@/lib/utils"; // Supondo que você adicionou isso no lib/utils

// --- Função Auxiliar para Forçar Padrão BR no CSV ---
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
  const [totalItems, setTotalItems] = useState(0);

  // --- Funções de API ---

  /**
   * Carrega o histórico de contagens do servidor com paginação.
   */
  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setIsLoadingHistory(true);
    try {
      const response = await fetch(
        `/api/inventory/history?page=${page}&limit=10`
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

  /**
   * Exclui um item específico do histórico.
   */
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
    [userId, loadHistory]
  );

  // --- Lógica de Relatório e Exportação ---

  const generateCompleteReportData = useCallback(() => {
    // Se não tem itens contados, retorna vazio (a menos que tenha produtos no catálogo para listar zerados)
    if (productCounts.length === 0 && products.length === 0) return [];

    // 1. Processa itens contados
    const countedItemsData = productCounts.map((item) => {
      const price = Number(item.price || 0);
      const qtyLoja = Number(item.quant_loja || 0);
      const qtyEstoque = Number(item.quant_estoque || 0);
      // Fallback para quantity genérica se loja/estoque não usados
      const qtyTotal =
        qtyLoja + qtyEstoque > 0
          ? qtyLoja + qtyEstoque
          : Number(item.quantity || 0);

      const totalValue = qtyTotal * price;

      return {
        codigo_de_barras: item.codigo_de_barras,
        codigo_produto: item.codigo_produto,
        descricao: item.descricao,
        categoria: item.categoria || "Geral",
        preco_unitario: formatForCsv(price),
        quant_loja: formatForCsv(qtyLoja),
        quant_estoque: formatForCsv(qtyEstoque),
        quantidade_total: formatForCsv(qtyTotal),
        valor_total: formatForCsv(totalValue),
        // Campos legados para compatibilidade
        saldo_sistema: formatForCsv(item.saldo_estoque),
        diferenca: formatForCsv(qtyTotal - Number(item.saldo_estoque)),
      };
    });

    // 2. Processa itens NÃO contados (apenas se houver catálogo carregado e quisermos ver os zerados)
    // Para Auditoria "Blind", isso pode ser opcional, mas mantemos para consistência.
    const countedProductCodes = new Set(
      productCounts
        .filter(
          (p) =>
            !p.codigo_produto.startsWith("SEM-COD") &&
            !p.codigo_produto.startsWith("TEMP")
        )
        .map((pc) => pc.codigo_produto)
    );

    const uncountedItemsData = products
      .filter((p) => !countedProductCodes.has(p.codigo_produto))
      .map((product) => {
        const barCode = barCodes.find((bc) => bc.produto_id === product.id);
        const saldo = Number(product.saldo_estoque);
        const price = Number(product.price || product.preco || 0);

        return {
          codigo_de_barras: barCode?.codigo_de_barras || "N/A",
          codigo_produto: product.codigo_produto,
          descricao: product.descricao,
          categoria: product.categoria || "Geral",
          preco_unitario: formatForCsv(price),
          quant_loja: "0",
          quant_estoque: "0",
          quantidade_total: "0",
          valor_total: "0",
          saldo_sistema: formatForCsv(saldo),
          diferenca: formatForCsv(0 - saldo),
        };
      });

    const combinedData = [...countedItemsData, ...uncountedItemsData];
    combinedData.sort((a, b) => a.descricao.localeCompare(b.descricao));

    return combinedData;
  }, [products, productCounts, barCodes]);

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

    // Mapeia para CSV com cabeçalhos amigáveis
    const csvData = dataToExport.map((item) => ({
      "EAN/Código": item.codigo_de_barras,
      Descrição: item.descricao,
      Categoria: item.categoria,
      "Preço Unit.": item.preco_unitario,
      "Qtd Total": item.quantidade_total,
      "Valor Total": item.valor_total,
    }));

    const csv = Papa.unparse(csvData, {
      header: true,
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
  }, [products, productCounts, generateCompleteReportData]);

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

  const executeSaveCount = useCallback(
    async (baseName: string) => {
      if (!userId) return;

      setIsSaving(true);
      try {
        const dataToExport = generateCompleteReportData();

        // Gera CSV Raw para salvar no banco (Backup de dados)
        const csvContent = Papa.unparse(dataToExport, {
          header: true,
          delimiter: ";",
          quotes: true,
        });

        // Recupera nome do cliente do localStorage se não vier no baseName
        // (O baseName geralmente vem do modal, que o usuário digita)
        const clientName =
          localStorage.getItem("audit_client_name") || "Cliente Desconhecido";

        const date = new Date();
        const dateSuffix = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;

        // Nome do arquivo final
        const fileName = `${baseName.trim()} - ${clientName} - ${dateSuffix}`;

        const formData = new FormData();
        formData.append("fileName", fileName);
        formData.append("csvContent", csvContent);
        formData.append("clientName", clientName); // Enviamos separado para metadados futuros

        const response = await fetch(`/api/inventory/history`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Erro ao salvar no servidor.");

        const savedData = await response.json();

        toast({
          title: "Auditoria Salva!",
          description: "Os dados foram salvos no histórico com sucesso.",
        });

        // Limpa o estado local após salvar com sucesso
        setPage(1);
        await loadHistory();
        setShowSaveModal(false);

        // Opcional: Redirecionar para a página de relatório do ID gerado
        // if (savedData.id) router.push(`/history/${savedData.id}/report`);
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
    totalItems,
  };
};
