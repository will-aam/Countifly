// hooks/useInventory.ts
/**
 * Descrição: Hook "Maestro" do Inventário (Modo Individual).
 * Responsabilidade: Orquestrar os hooks especializados (Catálogo, Scanner, Contagens, Histórico)
 * e gerenciar estados globais de UI (Modais).
 *
 * Refatorado para usar Composição de Hooks.
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

export const useInventory = ({ userId }: { userId: number | null }) => {
  // --- 1. Integração dos Hooks (A Ordem Importa!) ---

  // A. Catálogo (Dados base)
  const catalog = useCatalog(userId);

  // B. Scanner (Precisa do catálogo para identificar produtos)
  const scanner = useScanner(catalog.products, catalog.barCodes);

  // C. Contagens (Precisa do produto identificado pelo scanner)
  // Passamos 'resetScanner' como callback para limpar o input após adicionar com sucesso
  const counts = useCounts(
    userId,
    scanner.currentProduct,
    scanner.scanInput,
    scanner.resetScanner
  );

  // D. Histórico (Precisa de tudo para gerar relatórios)
  const history = useHistory(
    userId,
    catalog.products,
    catalog.barCodes,
    counts.productCounts
  );

  // --- 2. Estados Globais de UI ---
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showMissingItemsModal, setShowMissingItemsModal] = useState(false);

  // --- 3. Lógica Cruzada (Calculados) ---

  /**
   * Calcula itens faltantes (Catálogo - Contados).
   * Mantido aqui pois cruza dados de dois hooks diferentes.
   */
  const missingItems = useMemo(() => {
    const productCountMap = new Map(
      counts.productCounts.map((pc) => [pc.codigo_produto, pc])
    );

    return catalog.products
      .map((product) => {
        const countedItem = productCountMap.get(product.codigo_produto);
        const countedQuantity =
          Number(countedItem?.quant_loja ?? 0) +
          Number(countedItem?.quant_estoque ?? 0);

        if (countedQuantity > 0) return null; // Já foi contado

        const barCode = catalog.barCodes.find(
          (bc) => bc.produto_id === product.id
        );
        const saldoEstoque = Number(product.saldo_estoque) || 0;

        return {
          codigo_de_barras: barCode?.codigo_de_barras || "N/A",
          descricao: product.descricao,
          faltante: saldoEstoque,
        };
      })
      .filter(
        (
          item
        ): item is {
          codigo_de_barras: string;
          descricao: string;
          faltante: number;
        } => item !== null
      );
  }, [catalog.products, catalog.barCodes, counts.productCounts]);

  // --- 4. Ações Globais ---

  /**
   * Limpa TODOS os dados (Reset Geral).
   * Orquestra a limpeza em todos os sub-hooks.
   */
  const handleClearAllData = useCallback(async () => {
    if (!userId) return;
    try {
      // 1. Limpa contagens locais
      counts.setProductCounts([]);
      localStorage.removeItem(`productCounts-${userId}`);

      // 2. Limpa servidor
      const response = await fetch(`/api/inventory/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Falha ao limpar dados do servidor.");

      // 3. Reseta estados locais
      catalog.setProducts([]);
      catalog.setBarCodes([]);
      scanner.setTempProducts([]);

      setShowClearDataModal(false);
      toast({
        title: "Sucesso!",
        description: "Todos os dados foram removidos.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao limpar dados",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [userId, counts, catalog, scanner]);

  /**
   * Download do Template CSV (Utilitário estático).
   */
  const downloadTemplateCSV = useCallback(() => {
    const templateData = [
      {
        codigo_de_barras: "7891234567890",
        codigo_produto: "PROD001",
        descricao: "Item Exemplo 1",
        saldo_estoque: "100",
      },
      {
        codigo_de_barras: "7891234567891",
        codigo_produto: "PROD002",
        descricao: "Item Exemplo 2",
        saldo_estoque: "50",
      },
    ];
    const csv = Papa.unparse(templateData, {
      header: true,
      delimiter: ";",
      quotes: true,
    });
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template_itens.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }, []);

  // --- 5. Retorno Unificado ---
  return {
    // Espalha as propriedades dos sub-hooks
    ...catalog,
    ...scanner,
    ...counts,
    ...history,

    // Estados e Funções do Maestro
    csvErrors,
    setCsvErrors,
    showClearDataModal,
    setShowClearDataModal,
    showMissingItemsModal,
    setShowMissingItemsModal,
    missingItems,
    handleClearAllData,
    downloadTemplateCSV,
  };
};
