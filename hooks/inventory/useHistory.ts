// hooks/inventory/useHistory.ts
"use client";

import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import * as Papa from "papaparse";
import type { ProductCount } from "@/lib/types"; // Removidos Product e BarCode dos imports

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
  // REMOVIDOS: products e barCodes (não eram usados)
  productCounts: ProductCount[] = [],
  mode: "audit" | "import" = "audit", // Agora será usado!
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

  // --- Lógica de Relatório Inteligente (CAMALEÃO) ---
  const generateReportData = useCallback(() => {
    // Ordenação padrão
    const sortedCounts = [...productCounts].sort((a, b) =>
      (a.descricao || "").localeCompare(b.descricao || ""),
    );

    return sortedCounts.map((item) => {
      const qtyLoja = Number(item.quant_loja || 0);
      const qtyEstoque = Number(item.quant_estoque || 0);

      // Prioriza 'total' calculado
      const qtyTotal =
        item.total && Number(item.total) > 0
          ? Number(item.total)
          : qtyLoja + qtyEstoque + (Number(item.quantity) || 0);

      // Dados Base (Sempre existem)
      const baseData = {
        cod_de_barras: item.codigo_produto || item.codigo_de_barras || "",
        descricao: item.descricao || item.name || "",
        Loja: formatForCsv(qtyLoja),
        Estoque: formatForCsv(qtyEstoque),
        "Qtd Total": formatForCsv(qtyTotal),
      };

      // Se for AUDIT, adiciona financeiro e taxonomia
      if (mode === "audit") {
        const price = Number(item.price || 0);
        const totalValue = qtyTotal * price;
        return {
          ...baseData,
          categoria: item.categoria || "Geral",
          subcategoria: item.subcategoria || "",
          preco_unitario: formatPriceForCsv(price),
          valor_total: formatPriceForCsv(totalValue),
        };
      }

      // Se for IMPORT, retorna só o básico (limpo)
      return baseData;
    });
  }, [productCounts, mode]);

  const exportToCsv = useCallback(() => {
    if (productCounts.length === 0) {
      toast({
        title: "Nenhum item para exportar",
        description: "Conte pelo menos um item.",
        variant: "destructive",
      });
      return;
    }

    const dataToExport = generateReportData();

    // Gera CSV com Header dinâmico
    const csvData = dataToExport.map((item: any) => {
      const row: any = {
        "EAN/Código": item.cod_de_barras,
        Descrição: item.descricao,
        Loja: item.Loja,
        Estoque: item.Estoque,
        "Qtd Total": item["Qtd Total"],
      };

      // Adiciona colunas extras apenas se existirem (Modo Audit)
      if (item.preco_unitario) {
        row["Categoria"] = item.categoria;
        row["Subcategoria"] = item.subcategoria;
        row["Preço Unit."] = item.preco_unitario;
        row["Valor Total"] = item.valor_total;
      }

      return row;
    });

    const csv = Papa.unparse(csvData, { delimiter: ";", quotes: true });
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    // Prefixo no nome do arquivo baixado
    const prefix = mode === "import" ? "importacao" : "auditoria";
    link.download = `${prefix}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [productCounts, generateReportData, mode]);

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
        const dataToExport = generateReportData();
        const csvContent = Papa.unparse(dataToExport, {
          header: true,
          delimiter: ";",
          quotes: true,
        });

        const clientName = localStorage.getItem("audit_client_name") || "";
        const date = new Date();
        const dateSuffix = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;

        // Nome do Arquivo no Histórico: [IMP] ou [AUD] para facilitar identificação
        const modeLabel = mode === "import" ? "[IMP]" : "[AUD]";
        const finalClientName = clientName ? ` - ${clientName}` : "";
        const fileName = `${modeLabel} ${baseName.trim()}${finalClientName} - ${dateSuffix}`;

        const formData = new FormData();
        formData.append("fileName", fileName);
        formData.append("csvContent", csvContent);
        // Usa o clientName para armazenar o contexto se não houver cliente definido
        formData.append(
          "clientName",
          clientName || (mode === "import" ? "Importação" : "Auditoria"),
        );

        const response = await fetch(`/api/inventory/history`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Erro ao salvar no servidor.");

        toast({
          title: "Contagem Salva!",
          description: "Os dados foram salvos no histórico.",
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
    [userId, generateReportData, loadHistory, mode],
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
