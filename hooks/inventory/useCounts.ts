// hooks/inventory/useCounts.ts
/**
 * Descrição: Hook responsável pela Gestão de Contagens (Com Persistência Offline).
 * Responsabilidade:
 * 1. Gerenciar o estado da lista de itens contados (productCounts).
 * 2. Implementar a lógica de "Enter de duas etapas" (Cálculo -> Adição).
 * 3. Persistir os dados no IndexedDB para evitar perda de dados no mobile.
 * 4. Calcular estatísticas de diferença (Dif).
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { calculateExpression } from "@/lib/utils";
import { saveLocalCounts, getLocalCounts } from "@/lib/db"; //
import type { Product, TempProduct, ProductCount } from "@/lib/types";

interface UseCountsProps {
  userId: number | null;
  currentProduct: Product | TempProduct | null;
  scanInput: string;
  onCountAdded?: () => void;
}

export const useCounts = ({
  userId,
  currentProduct,
  scanInput,
  onCountAdded,
}: UseCountsProps) => {
  // --- Estados ---
  const [productCounts, setProductCounts] = useState<ProductCount[]>([]);
  const [quantityInput, setQuantityInput] = useState("");
  const [countingMode, setCountingMode] = useState<"loja" | "estoque">("loja");
  const [isLoaded, setIsLoaded] = useState(false); //

  // --- 1. Carregamento Inicial (Do IndexedDB) ---
  useEffect(() => {
    const loadInitialData = async () => {
      if (!userId) return;
      try {
        const stored = await getLocalCounts(userId);
        setProductCounts(stored || []);
      } catch (error) {
        console.error("Erro ao carregar contagens offline:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadInitialData();
  }, [userId]);

  // --- 2. Salvamento Automático (No IndexedDB) ---
  useEffect(() => {
    if (isLoaded && userId) {
      saveLocalCounts(userId, productCounts).catch((err) =>
        console.error("Erro ao salvar contagens offline:", err)
      );
    }
  }, [productCounts, userId, isLoaded]);

  // --- 3. Lógica de Adição ---

  const handleAddCount = useCallback(() => {
    if (!currentProduct || !quantityInput) return;

    // Converte vírgula para ponto para o parseFloat funcionar
    const quantity = parseFloat(quantityInput.replace(",", "."));
    if (isNaN(quantity)) {
      toast({
        title: "Quantidade Inválida",
        description: "Digite um número ou expressão válida.",
        variant: "destructive",
      });
      return;
    }

    setProductCounts((prevCounts) => {
      const existingItemIndex = prevCounts.findIndex(
        (item) => item.codigo_produto === currentProduct.codigo_produto
      );

      if (existingItemIndex >= 0) {
        const updatedCounts = [...prevCounts];
        const existingItem = { ...updatedCounts[existingItemIndex] };

        // Adiciona à quantidade do local selecionado
        if (countingMode === "loja") existingItem.quant_loja += quantity;
        else existingItem.quant_estoque += quantity;

        // Recalcula a Diferença (Dif)
        existingItem.total =
          Number(existingItem.quant_loja) +
          Number(existingItem.quant_estoque) -
          Number(existingItem.saldo_estoque);

        updatedCounts[existingItemIndex] = existingItem;
        return updatedCounts;
      } else {
        const saldoAsNumber = Number(currentProduct.saldo_estoque);

        // Cria novo item na lista de contagem
        const newCount: ProductCount = {
          id: Date.now(),
          codigo_de_barras: scanInput,
          codigo_produto: currentProduct.codigo_produto,
          descricao: currentProduct.descricao,
          saldo_estoque: saldoAsNumber,
          quant_loja: countingMode === "loja" ? quantity : 0,
          quant_estoque: countingMode === "estoque" ? quantity : 0,
          total:
            (countingMode === "loja" ? quantity : 0) +
            (countingMode === "estoque" ? quantity : 0) -
            saldoAsNumber,
          data_hora: new Date().toISOString(),
        };
        return [...prevCounts, newCount];
      }
    });

    toast({ title: "Contagem salva no dispositivo!" });
    setQuantityInput("");
    if (onCountAdded) onCountAdded();
  }, [currentProduct, quantityInput, countingMode, scanInput, onCountAdded]);

  // --- 4. Enter de Duas Etapas ---

  const handleQuantityKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const hasOperators = /[+\-*/]/.test(quantityInput);

        if (hasOperators) {
          // ETAPA 1: Apenas calcula e mostra o resultado
          const calculation = calculateExpression(quantityInput);
          if (calculation.isValid) {
            setQuantityInput(calculation.result.toString());
          } else {
            toast({
              title: "Erro no cálculo",
              description: calculation.error,
              variant: "destructive",
            });
          }
        } else {
          // ETAPA 2: Adiciona à lista
          handleAddCount();
        }
      }
    },
    [quantityInput, handleAddCount]
  );

  // --- 5. Ações Adicionais ---

  const handleRemoveCount = useCallback((id: number) => {
    setProductCounts((prev) => prev.filter((item) => item.id !== id));
    toast({ title: "Item removido da contagem" });
  }, []);

  const handleClearCountsOnly = useCallback(() => {
    setProductCounts([]);
    setQuantityInput("");
  }, []);

  // --- 6. Estatísticas (Totais) ---
  const productCountsStats = useMemo(() => {
    const totalLoja = productCounts.reduce(
      (sum, item) => sum + (item.quant_loja || 0),
      0
    );
    const totalEstoque = productCounts.reduce(
      (sum, item) => sum + (item.quant_estoque || 0),
      0
    );
    return { totalLoja, totalEstoque };
  }, [productCounts]);

  return {
    productCounts,
    setProductCounts,
    quantityInput,
    setQuantityInput,
    countingMode,
    setCountingMode,
    handleAddCount,
    handleQuantityKeyPress,
    handleRemoveCount,
    handleClearCountsOnly,
    productCountsStats,
  };
};
