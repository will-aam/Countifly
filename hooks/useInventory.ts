// hooks/useInventory.ts
/**
 * Descrição: Hook "Maestro" do Inventário.
 * Responsabilidade: Orquestrar os hooks especializados e gerenciar a lógica de Auditoria e Itens Manuais.
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import * as Papa from "papaparse";

// --- Sub-hooks ---
import { useCatalog } from "./inventory/useCatalog";
import { useScanner } from "./inventory/useScanner";
import { useCounts } from "./inventory/useCounts";
import { useHistory } from "./inventory/useHistory";
import { useSyncQueue } from "./useSyncQueue";

interface UseInventoryProps {
  userId: number | null;
  mode?: "audit" | "import"; // Define o modo de operação
}

export const useInventory = ({ userId, mode = "audit" }: UseInventoryProps) => {
  // --- 1. Integração dos Hooks ---

  // A. Catálogo (Busca do Banco de Dados via API/IndexedDB)
  const catalog = useCatalog(userId);

  // B. Scanner
  const scanner = useScanner(catalog.products, catalog.barCodes);

  // C. Contagens
  const counts = useCounts({
    userId,
    currentProduct: scanner.currentProduct,
    scanInput: scanner.scanInput,
    mode: mode, // Passa o modo para o hook de contagem (Isolamento de estado)
    onCountAdded: () => {
      scanner.resetScanner();
      setTimeout(() => {
        const barcodeInput = document.getElementById("barcode");
        if (barcodeInput) barcodeInput.focus();
      }, 100);
    },
  });

  // D. Sincronização
  useSyncQueue(userId ?? undefined);

  // E. Histórico
  const historyHook = useHistory(
    userId,
    counts.productCounts,
    mode,
    catalog.products,
    catalog.barCodes,
  );

  // --- 2. Estados Globais ---
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showMissingItemsModal, setShowMissingItemsModal] = useState(false);

  // --- 3. Lógicas Transversais ---

  // Lógica de Itens Manuais
  const handleAddManualItem = useCallback(
    (
      barcode: string,
      quantity: number,
      description?: string,
      price?: number,
    ) => {
      // Adiciona item manual diretamente ao state de contagem
      counts.handleAddCount(quantity, {
        isManual: true,
        manualDescription: description,
        manualPrice: price,
      });
    },
    [counts],
  );

  // ✅ NOVA FUNÇÃO: Editar descrição de itens temporários
  const handleEditTempItemDescription = useCallback(
    (itemId: number, newDescription: string) => {
      // Validação básica
      if (!newDescription.trim()) {
        toast({
          title: "Descrição inválida",
          description: "A descrição não pode estar vazia.",
          variant: "destructive",
        });
        return;
      }

      // Limita a 30 caracteres
      const trimmedDescription = newDescription.trim().slice(0, 30);

      // Atualiza o item no estado
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

    return (
      catalog.products
        // --- FILTRO DE VISIBILIDADE (Mantido) ---
        .filter((product) => {
          // Se estamos no modo IMPORTAÇÃO, ignoramos produtos FIXOS do banco
          if (mode === "import" && product.tipo_cadastro === "FIXO") {
            return false;
          }
          return true;
        })
        // ----------------------------------------
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
        .filter((item): item is any => item !== null)
    );
  }, [catalog.products, counts.productCounts, catalog.barCodes, mode]);

  // --- FUNÇÃO 1: A "BORRACHA" (Limpa Tudo) ---
  const handleClearAllData = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/inventory?scope=all`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Falha ao limpar dados do servidor.");

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

  // --- FUNÇÃO 2: A "LIXEIRA DE IMPORTAÇÃO" (Limpa só produtos) ---
  const handleClearImportOnly = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/inventory?scope=catalog`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Falha ao limpar importação.");

      toast({
        title: "Importação Limpa!",
        description:
          "Os produtos foram removidos. Suas contagens foram mantidas.",
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

    csvErrors,
    setCsvErrors,
    showClearDataModal,
    setShowClearDataModal,
    showMissingItemsModal,
    setShowMissingItemsModal,
    missingItems,

    handleClearAllData,
    handleClearImportOnly,
    handleAddManualItem,
    handleEditTempItemDescription, // ✅ EXPORTA A NOVA FUNÇÃO

    downloadTemplateCSV,
  };
};
