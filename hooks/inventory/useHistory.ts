// hooks/inventory/useHistory.ts
// Hook especializado em gerenciar o histórico de contagens salvas do usuário.
// Responsabilidades:
// 1. Carregar o histórico do usuário com suporte a paginação.
// 2. Gerenciar a exclusão de itens do histórico (individual e em lote).
// 3. Gerar relatórios CSV para auditoria e importação, com formatação adequada.
// 4. Salvar novas contagens no histórico, recebendo o arquivo CSV e metadados via form-data.
"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import * as Papa from "papaparse";
import type { Product, BarCode, ProductCount } from "@/lib/types";
import { DEFAULT_AUDIT_CONFIG, type AuditConfig, getAuditProfileLabel } from "@/lib/audit";
import { buildAuditReportRows } from "@/lib/audit-report";
import {
  getCountContextSnapshot,
  getStoredCompanyContext,
} from "@/lib/company-context";

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
  onSaveSuccess?: () => void,
  auditConfig: AuditConfig = DEFAULT_AUDIT_CONFIG,
  auditSessionName = "",
) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const latestLoadIdRef = useRef(0);
  const lastFiltersRef = useRef<{
    companyId?: string;
    query?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sortBy?: "date" | "name" | "company";
    sortOrder?: "asc" | "desc";
  }>({});

  // --- API: Load History ---
  const loadHistory = useCallback(async (filters?: {
    companyId?: string;
    query?: string;
    dateFrom?: Date;
    dateTo?: Date;
    sortBy?: "date" | "name" | "company";
    sortOrder?: "asc" | "desc";
  }) => {
    if (!userId) return;
    if (filters) lastFiltersRef.current = filters;
    const activeFilters = lastFiltersRef.current;
    const loadId = ++latestLoadIdRef.current;
    setIsLoadingHistory(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (activeFilters.companyId && activeFilters.companyId !== "all") params.set("empresaId", activeFilters.companyId);
      if (activeFilters.query?.trim()) params.set("q", activeFilters.query.trim());
      const toBoundary = (date: Date, endOfDay = false) => {
        const boundary = new Date(date);
        if (endOfDay) boundary.setHours(23, 59, 59, 999);
        else boundary.setHours(0, 0, 0, 0);
        return boundary.toISOString();
      };
      if (activeFilters.dateFrom) params.set("dateFrom", toBoundary(activeFilters.dateFrom));
      if (activeFilters.dateTo) params.set("dateTo", toBoundary(activeFilters.dateTo, true));
      if (activeFilters.sortBy) params.set("sortBy", activeFilters.sortBy);
      if (activeFilters.sortOrder) params.set("sortOrder", activeFilters.sortOrder);
      const response = await fetch(`/api/inventory/history?${params.toString()}`);
      if (!response.ok) throw new Error("Falha ao carregar histórico.");
      const result = await response.json();
      if (loadId !== latestLoadIdRef.current) return;

      if (Array.isArray(result)) {
        setHistory(result);
        setTotalItems(result.length);
      } else {
        setHistory(result.data || []);
        setTotalPages(result.meta?.totalPages || 1);
        setTotalItems(result.meta?.total || (result.data?.length ?? 0));
      }
    } catch (error: any) {
      if (loadId !== latestLoadIdRef.current) return;
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (loadId === latestLoadIdRef.current) setIsLoadingHistory(false);
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

  // --- API: Batch Delete ---
  const handleBatchDelete = useCallback(
    async (ids: number[]) => {
      if (!userId || ids.length === 0) return;

      try {
        const res = await fetch("/api/inventory/history/batch-delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });

        if (!res.ok) throw new Error("Falha ao excluir itens.");

        const result = await res.json();
        await loadHistory();

        toast({
          title: "Sucesso!",
          description: `${result.count} ${result.count === 1 ? "item removido" : "itens removidos"}.`,
        });
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

      // ✅ CORREÇÃO: Separar itens que têm produto vs itens temporários
      const countsWithProduct = new Set<string>();

      const data = importedProducts.map((prod) => {
        const countItem = productCounts.find(
          (c) => c.codigo_produto === prod.codigo_produto,
        );

        // ✅ Marca que este produto foi processado
        if (countItem && countItem.codigo_produto) {
          countsWithProduct.add(countItem.codigo_produto);
        }

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

      // ✅ ADICIONA ITENS TEMPORÁRIOS (que não foram processados acima)
      // ✅ ADICIONA ITENS TEMPORÁRIOS (que não foram processados acima)
      const tempItems = productCounts
        .filter((count) => {
          // Inclui itens que:
          // 1. Foram marcados como manuais OU
          // 2. Não foram processados acima (não têm produto correspondente)
          const codigoProduto = count.codigo_produto || "";
          return count.isManual || !countsWithProduct.has(codigoProduto);
        })
        .map((tempCount, index) => {
          const loja = Number(tempCount.quant_loja || 0);
          const estoque = Number(tempCount.quant_estoque || 0);
          const contagemRealizada = loja + estoque;

          // ✅ Mantém o código original se começar com TEMP-, senão gera um novo
          let tempCode = tempCount.codigo_produto || "";
          if (!tempCode.startsWith("TEMP-")) {
            tempCode = `TEMP-PROD${String(index + 1).padStart(3, "0")}`;
          }

          // ✅ Extrai apenas o código de barras numérico (sem prefixo TEMP-)
          let cleanBarcode =
            tempCount.codigo_de_barras ||
            `PROD${String(index + 1).padStart(3, "0")}`;
          // Remove o prefixo "TEMP-" se existir
          if (cleanBarcode.startsWith("TEMP-")) {
            // Pega apenas a parte após o segundo hífen (TEMP-timestamp-CODIGO → CODIGO)
            const parts = cleanBarcode.split("-");
            cleanBarcode =
              parts.length > 2
                ? parts.slice(2).join("-")
                : `PROD${String(index + 1).padStart(3, "0")}`;
          }

          return {
            codigo_de_barras: cleanBarcode, // ✅ Sem prefixo TEMP- (para leitura)
            codigo_produto: tempCode, // ✅ COM prefixo TEMP- (para detecção)
            descricao: tempCount.descricao, // ✅ Sem prefixo [TEMP] - fica mais limpo
            saldo_estoque: formatForCsv(0), // Itens temporários não têm saldo
            quant_loja: formatForCsv(loja),
            quant_estoque: formatForCsv(estoque),
            total: formatForCsv(contagemRealizada), // Diferença = contagem (sem saldo)
          };
        });

      // ✅ Junta tudo e ordena
      const allData = [...data, ...tempItems];
      return allData.sort((a, b) => a.descricao.localeCompare(b.descricao));
    }

    // 2. MODO AUDIT: O mesmo esquema é usado na exportação direta e no histórico.
    return buildAuditReportRows(productCounts, auditConfig, auditSessionName);
  }, [productCounts, mode, products, barCodes, auditConfig, auditSessionName]);

  // --- Exportar CSV ---
  const exportToCsv = useCallback(() => {
    if (mode === "import" && !products.some((product) => product.tipo_cadastro !== "FIXO")) {
      toast({
        title: "Nenhuma importação disponível",
        description: "Importe um arquivo antes de exportar a contagem.",
        variant: "destructive",
      });
      return;
    }
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
  }, [generateReportData, mode, productCounts.length, products]);

  // --- Salvar Histórico ---
  const handleSaveCount = useCallback(() => {
    if (!userId) {
      toast({ title: "Sessão inválida", variant: "destructive" });
      return;
    }
    if (mode === "import" && !products.some((product) => product.tipo_cadastro !== "FIXO")) {
      toast({
        title: "Nenhuma importação disponível",
        description: "Importe um arquivo antes de salvar a contagem.",
        variant: "destructive",
      });
      return;
    }
    if (productCounts.length === 0) {
      toast({ title: "Nada para salvar", variant: "destructive" });
      return;
    }
    setShowSaveModal(true);
  }, [userId, productCounts.length, mode, products]);

  const executeSaveCount = useCallback(
    async (baseName: string) => {
      if (!userId) return;
      if (mode === "import" && !products.some((product) => product.tipo_cadastro !== "FIXO")) {
        setShowSaveModal(false);
        toast({
          title: "Nenhuma importação disponível",
          description: "Importe um arquivo antes de salvar a contagem.",
          variant: "destructive",
        });
        return;
      }
      if (productCounts.length === 0) {
        setShowSaveModal(false);
        toast({ title: "Nada para salvar", variant: "destructive" });
        return;
      }
      setIsSaving(true);
      try {
        const dataToExport = generateReportData();
        const csvContent = Papa.unparse(dataToExport, {
          header: true,
          delimiter: ";",
          quotes: true,
        });

        const clientName =
          auditSessionName || localStorage.getItem("audit_client_name") || "";
        const date = new Date();
        const dateSuffix = date.toISOString().split("T")[0];

        const modeLabel = mode === "import" ? "[IMP]" : `[AUD - ${getAuditProfileLabel(auditConfig.profile)}]`;
        const finalClientName = clientName ? ` - ${clientName}` : "";
        const fileName = `${modeLabel} ${baseName.trim()}${finalClientName} - ${dateSuffix}`;

        const formData = new FormData();
        formData.append("fileName", fileName);
        formData.append("csvContent", csvContent);
        formData.append(
          "clientName",
          clientName || (mode === "import" ? "Importação" : "Auditoria"),
        );

        // ✅ NOVO: Pegar empresa selecionada GLOBALMENTE e adicionar ao FormData
        const modeSnapshot = getCountContextSnapshot(
          userId,
          mode === "audit" ? "audit" : "import",
        );
        const selectedCompanyId = modeSnapshot === undefined
          ? getStoredCompanyContext(userId)
          : modeSnapshot == null
            ? null
            : String(modeSnapshot);
        if (selectedCompanyId) {
          formData.append("empresa_id", selectedCompanyId);
        }

        const res = await fetch(`/api/inventory/history`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Erro ao salvar.");

        toast({ title: "Salvo com sucesso!" });
        onSaveSuccess?.();
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
    [userId, generateReportData, loadHistory, mode, products, productCounts.length, onSaveSuccess, auditSessionName, auditConfig.profile],
  );

  return {
    history,
    loadHistory,
    handleDeleteHistoryItem,
    handleBatchDelete,
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
