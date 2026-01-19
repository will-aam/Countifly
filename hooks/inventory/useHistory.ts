// hooks/inventory/useHistory.ts
"use client";

import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import * as Papa from "papaparse";
import type { Product, BarCode, ProductCount } from "@/lib/types";

// --- Formatação ---
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
  productCounts: ProductCount[] = [],
  mode: "audit" | "import" = "audit",
  products: Product[] = [],
  barCodes: BarCode[] = [],
) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  // --- API: Load History ---
  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setIsLoadingHistory(true);
    try {
      const response = await fetch(
        `/api/inventory/history?page=${page}&limit=10`,
      );
      if (!response.ok) throw new Error("Falha ao carregar histórico.");
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
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [userId, page]);

  // --- API: Delete ---
  const handleDeleteHistoryItem = useCallback(
    async (historyId: number) => {
      if (!userId) return;
      try {
        const res = await fetch(`/api/inventory/history/${historyId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Falha ao excluir.");
        await loadHistory();
        toast({ title: "Sucesso!", description: "Item removido." });
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [userId, loadHistory],
  );

  // --- Lógica Principal de Geração de Dados ---
  const generateReportData = useCallback((): any[] => {
    // 1. MODO IMPORTAÇÃO
    if (mode === "import") {
      const importedProducts = products.filter(
        (p) => p.tipo_cadastro !== "FIXO",
      );

      const data = importedProducts.map((prod) => {
        const countItem = productCounts.find(
          (c) => c.codigo_produto === prod.codigo_produto,
        );

        // --- BUSCA INTELIGENTE DE CÓDIGO DE BARRAS ---
        // 1. Pega todos os códigos vinculados a este ID
        const linkedBarcodes = barCodes.filter((b) => b.produto_id == prod.id);

        // 2. Tenta achar um que NÃO SEJA igual ao código interno (preferência pelo EAN)
        const bestBarcode = linkedBarcodes.find(
          (b) => b.codigo_de_barras !== prod.codigo_produto,
        );

        // 3. Se não achar, pega o primeiro vinculado, senão usa o próprio código do produto
        const barcode =
          bestBarcode?.codigo_de_barras ||
          linkedBarcodes[0]?.codigo_de_barras ||
          prod.codigo_produto;

        const saldo = Number(prod.saldo_estoque || 0);
        const loja = countItem ? Number(countItem.quant_loja || 0) : 0;
        const estoque = countItem ? Number(countItem.quant_estoque || 0) : 0;
        const contagemRealizada = loja + estoque;
        const diferenca = contagemRealizada - saldo;

        return {
          codigo_de_barras: barcode,
          codigo_produto: prod.codigo_produto,
          descricao: prod.descricao,
          saldo_estoque: formatForCsv(saldo),
          quant_loja: formatForCsv(loja),
          quant_estoque: formatForCsv(estoque),
          total: formatForCsv(diferenca),
        };
      });

      return data.sort((a, b) => a.descricao.localeCompare(b.descricao));
    }

    // 2. MODO AUDIT (Valuation)
    const sortedCounts = [...productCounts].sort((a, b) =>
      (a.descricao || "").localeCompare(b.descricao || ""),
    );

    return sortedCounts.map((item) => {
      const qtyLoja = Number(item.quant_loja || 0);
      const qtyEstoque = Number(item.quant_estoque || 0);

      const qtyTotal =
        item.total && Number(item.total) > 0
          ? Number(item.total)
          : qtyLoja + qtyEstoque + (Number(item.quantity) || 0);

      const price = Number(item.price || 0);
      const totalValue = qtyTotal * price;

      const row: any = {
        "EAN/Código": item.codigo_de_barras || item.codigo_produto,
        Descrição: item.descricao,
        Loja: formatForCsv(qtyLoja),
        Estoque: formatForCsv(qtyEstoque),
        "Qtd Total": formatForCsv(qtyTotal),
      };

      if (item.price !== undefined || item.categoria) {
        row["Categoria"] = item.categoria || "Geral";
        row["Subcategoria"] = item.subcategoria || "";
        row["Preço Unit."] = formatPriceForCsv(price);
        row["Valor Total"] = formatPriceForCsv(totalValue);
      }

      return row;
    });
  }, [productCounts, mode, products, barCodes]);

  // --- Exportar CSV ---
  const exportToCsv = useCallback(() => {
    if (mode !== "import" && productCounts.length === 0) {
      toast({
        title: "Nada para exportar",
        description: "Conte itens antes de exportar.",
        variant: "destructive",
      });
      return;
    }

    const dataToExport = generateReportData();
    const csv = Papa.unparse(dataToExport, { delimiter: ";", quotes: true });
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);

    const prefix = mode === "import" ? "contagem_importacao" : "auditoria";
    link.download = `${prefix}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [generateReportData, mode, productCounts.length]);

  // --- Salvar Histórico ---
  const handleSaveCount = useCallback(() => {
    if (!userId) {
      toast({ title: "Sessão inválida", variant: "destructive" });
      return;
    }
    if (mode !== "import" && productCounts.length === 0) {
      toast({ title: "Nada para salvar", variant: "destructive" });
      return;
    }
    setShowSaveModal(true);
  }, [userId, productCounts.length, mode]);

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
        const dateSuffix = date.toISOString().split("T")[0];

        const modeLabel = mode === "import" ? "[IMP]" : "[AUD]";
        const finalClientName = clientName ? ` - ${clientName}` : "";
        const fileName = `${modeLabel} ${baseName.trim()}${finalClientName} - ${dateSuffix}`;

        const formData = new FormData();
        formData.append("fileName", fileName);
        formData.append("csvContent", csvContent);
        formData.append(
          "clientName",
          clientName || (mode === "import" ? "Importação" : "Auditoria"),
        );

        const res = await fetch(`/api/inventory/history`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Erro ao salvar.");

        toast({ title: "Salvo com sucesso!" });
        setPage(1);
        await loadHistory();
        setShowSaveModal(false);
      } catch (error: any) {
        toast({
          title: "Erro",
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
