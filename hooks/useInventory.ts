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

export const useInventory = ({ userId }: { userId: number | null }) => {
  // --- 1. Integração dos Hooks ---

  // A. Catálogo
  const catalog = useCatalog(userId);

  // B. Scanner
  const scanner = useScanner(catalog.products, catalog.barCodes);

  // C. Contagens (Base)
  const counts = useCounts(
    userId,
    scanner.currentProduct,
    scanner.scanInput,
    scanner.resetScanner
  );

  // D. Histórico
  const history = useHistory(
    userId,
    catalog.products,
    catalog.barCodes,
    counts.productCounts
  );

  // --- 2. Estados Globais ---
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showMissingItemsModal, setShowMissingItemsModal] = useState(false);

  // --- 3. Lógica Cruzada (Calculados) ---
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

  // --- 4. Ações Globais e Overrides ---

  /**
   * NOVA FUNÇÃO: Adicionar Item Manual (Sem código de barras).
   * Definida FORA do handleAddCount para ser acessível globalmente.
   */
  const handleAddManualItem = useCallback(
    (description: string, quantity: number, price?: number) => {
      // Gera um código único baseado no timestamp
      const timestampCode = `SEM-COD-${Date.now()}`;

      // GERAÇÃO DE ID ÚNICO (Correção do Bug)
      const newId = Date.now() + Math.floor(Math.random() * 1000);

      const newItem: any = {
        id: newId, // <--- ID OBRIGATÓRIO PARA O BANCO/REACT
        codigo_de_barras: timestampCode,
        codigo_produto: timestampCode,
        descricao: description,
        quant_loja: quantity,
        quant_estoque: 0,
        price: price,
        isManual: true,
      };

      // Adiciona ao estado
      counts.setProductCounts((prev: any[]) => {
        const newList = [newItem, ...prev];

        if (userId) {
          localStorage.setItem(
            `productCounts-${userId}`,
            JSON.stringify(newList)
          );
        }
        return newList;
      });

      toast({
        title: "Item Manual Adicionado",
        description: `${description} (+${quantity})`,
        className: "bg-blue-600 text-white border-none",
      });
    },
    [counts, userId]
  );

  /**
   * Adicionar Contagem com suporte a PREÇO (Scanner).
   */
  const handleAddCount = useCallback(
    (quantity: number, price?: number) => {
      // 1. Validação básica
      if (!scanner.scanInput) {
        toast({
          title: "Erro",
          description: "Nenhum código de barras identificado.",
          variant: "destructive",
        });
        return;
      }

      const product = scanner.currentProduct;
      const barcode = scanner.scanInput;

      // 2. Monta o objeto do item
      // GERAÇÃO DE ID ÚNICO (Correção do Bug)
      const newId = Date.now() + Math.floor(Math.random() * 1000);

      const newItem: any = {
        id: newId, // <--- ID OBRIGATÓRIO PARA O BANCO/REACT
        codigo_de_barras: barcode,
        codigo_produto: product ? product.codigo_produto : `EXTRA-${barcode}`,
        descricao: product ? product.descricao : `Item Novo (${barcode})`,
        quant_loja: quantity,
        quant_estoque: 0,
        price: price,
      };

      // 3. Atualiza o estado das contagens
      counts.setProductCounts((prev: any[]) => {
        const existingIndex = prev.findIndex(
          (p) => p.codigo_de_barras === barcode
        );
        let newList;

        if (existingIndex >= 0) {
          // Se já existe, soma a quantidade
          newList = [...prev];
          const itemExistente = newList[existingIndex];

          itemExistente.quant_loja =
            Number(itemExistente.quant_loja) + quantity;

          // Atualiza o preço se um novo valor foi passado
          if (price !== undefined) {
            itemExistente.price = price;
          }
        } else {
          // Se é novo, adiciona no topo
          newList = [newItem, ...prev];
        }

        // 4. Persiste no LocalStorage
        if (userId) {
          localStorage.setItem(
            `productCounts-${userId}`,
            JSON.stringify(newList)
          );
        }

        return newList;
      });

      // 5. Feedback e Limpeza
      toast({
        title: "Item Registrado",
        description: `${newItem.descricao} (+${quantity}) ${
          price ? `R$ ${price}` : ""
        }`,
        className: "bg-green-600 text-white border-none",
      });

      scanner.resetScanner();
    },
    [scanner, counts, userId]
  );

  /**
   * Limpa TODOS os dados (Reset Geral).
   */
  const handleClearAllData = useCallback(async () => {
    if (!userId) return;
    try {
      counts.setProductCounts([]);
      localStorage.removeItem(`productCounts-${userId}`);

      const response = await fetch(`/api/inventory/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Falha ao limpar dados do servidor.");

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
   * Download do Template CSV.
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
  }, []);

  /**
   * Exportar CSV (Modo Individual)
   */
  const exportToCsv = useCallback(() => {
    try {
      // 1. Prepara os dados LIMPOS (sem referências circulares do React)
      const dataToExport = counts.productCounts.map((item) => ({
        Codigo: item.codigo_produto,
        Descricao: item.descricao,
        Saldo_Sistema: item.saldo_estoque || 0,
        Loja: item.quant_loja || 0, // Garante número
        Estoque: item.quant_estoque || 0, // Garante número
        Total: (item.quant_loja || 0) + (item.quant_estoque || 0),
        Diferenca:
          (item.quant_loja || 0) +
          (item.quant_estoque || 0) -
          (Number(item.saldo_estoque) || 0),
      }));

      if (dataToExport.length === 0) {
        toast({
          title: "Nada para exportar",
          description: "A lista de contagem está vazia.",
          variant: "destructive",
        });
        return;
      }

      // 2. Gera o CSV usando PapaParse
      const csv = Papa.unparse(dataToExport, {
        delimiter: ";", // Padrão Brasil (Excel gosta)
        quotes: true, // Aspas para evitar quebras em descrições com ponto e vírgula
      });

      // 3. Download Hack
      const blob = new Blob([`\uFEFF${csv}`], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `inventario_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Sucesso!",
        description: "Planilha exportada.",
      });
    } catch (error: any) {
      console.error("Erro ao exportar:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o arquivo.",
        variant: "destructive",
      });
    }
  }, [counts.productCounts]); // Dependência correta

  // --- 5. Retorno Unificado ---
  return {
    ...catalog,
    ...scanner,
    ...counts,
    handleAddCount,
    handleAddManualItem, // <--- AGORA SIM ESTÁ SENDO RETORNADO
    ...history,

    csvErrors,
    setCsvErrors,
    showClearDataModal,
    setShowClearDataModal,
    showMissingItemsModal,
    setShowMissingItemsModal,
    missingItems,
    handleClearAllData,
    downloadTemplateCSV,
    exportToCsv, // <--- ADICIONADO A FUNÇÃO DE EXPORTAÇÃO CORRIGIDA
  };
};
