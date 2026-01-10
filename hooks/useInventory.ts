// hooks/useInventory.ts
/**
 * Descrição: Hook "Maestro" do Inventário.
 * Responsabilidade: Orquestrar os hooks especializados e gerenciar a lógica de Auditoria (Preço) e Itens Manuais.
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
import { useSyncQueue } from "./useSyncQueue"; // <--- NOVO: Import do Sync

export const useInventory = ({ userId }: { userId: number | null }) => {
  // --- 1. Integração dos Hooks ---

  // A. Catálogo: Gerencia produtos, códigos de barras e cache offline
  const catalog = useCatalog(userId);

  // B. Scanner: Gerencia câmera, input de texto e modo demo
  const scanner = useScanner(catalog.products, catalog.barCodes);

  // C. Contagens (Base): Gerencia a lista de itens contados e calculadora
  const counts = useCounts({
    userId,
    currentProduct: scanner.currentProduct,
    scanInput: scanner.scanInput,
    onCountAdded: () => {
      // Callback pós-adição: Reseta scanner e devolve foco
      scanner.resetScanner();
      setTimeout(() => {
        const barcodeInput = document.getElementById("barcode");
        if (barcodeInput) barcodeInput.focus();
      }, 100);

      // DICA DE ARQUITETURA:
      // Aqui poderíamos forçar um "trigger" imediato de sync se quiséssemos,
      // mas o useSyncQueue já deve rodar em background (setInterval).
    },
  });

  // D. Sincronização em Background (O Carteiro Silencioso)
  // Esse hook garante que o que foi salvo no IndexedDB (pelo useCounts) suba para a nuvem
  // Só ativa o sync se o usuário estiver logado (userId não for nulo)
  useSyncQueue(userId ?? undefined);
  // E. Histórico: Gerencia o salvamento de "Relatórios Finais" (CSV Snapshot)
  const historyHook = useHistory(
    userId,
    catalog.products,
    catalog.barCodes,
    counts.productCounts
  );

  // --- 2. Estados Globais do Maestro ---
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showMissingItemsModal, setShowMissingItemsModal] = useState(false);

  // --- 3. Lógicas Transversais (Dependem de múltiplos hooks) ---

  /**
   * Identifica itens do catálogo que ainda não tiveram nenhuma unidade contada.
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

        // Se já foi contado (mesmo que 0), não é "faltante" no sentido de "esquecido"
        if (countedQuantity > 0) return null;

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
      .filter((item): item is any => item !== null);
  }, [catalog.products, counts.productCounts, catalog.barCodes]);

  /**
   * Limpa todos os dados do inventário (API e local).
   */
  const handleClearAllData = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/inventory/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Falha ao limpar dados do servidor.");

      toast({
        title: "Sucesso!",
        description: "Dados removidos. Recarregando...",
      });

      // Recarregamos a página para garantir que todos os hooks resetem seus estados
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Erro ao limpar dados",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [userId]);

  /**
   * Gera o arquivo de template para importação.
   */
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

  // --- 4. Retorno Unificado ---
  return {
    // Espalha todos os métodos e estados dos sub-hooks para o componente usar diretamente
    ...catalog,
    ...scanner,
    ...counts,
    ...historyHook,

    // Estados e métodos próprios do Maestro
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
