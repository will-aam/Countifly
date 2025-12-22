// hooks/inventory/useCounts.ts
/**
 * Descrição: Hook responsável pela Gestão de Contagens (Com Persistência Offline).
 * Responsabilidade: Gerenciar estado, calculadora e persistência no IndexedDB por usuário.
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { calculateExpression } from "@/lib/utils";
import { saveLocalCounts, getLocalCounts } from "@/lib/db";
import type { Product, TempProduct, ProductCount } from "@/lib/types";

export const useCounts = (
  userId: number | null,
  currentProduct: Product | TempProduct | null,
  scanInput: string,
  onCountAdded?: () => void
) => {
  const [productCounts, setProductCounts] = useState<ProductCount[]>([]);
  const [quantityInput, setQuantityInput] = useState("");
  const [countingMode, setCountingMode] = useState<"loja" | "estoque">("loja");
  const [isLoaded, setIsLoaded] = useState(false);

  // --- 1. Carregamento Inicial (Filtrado por UserID) ---
  useEffect(() => {
    const loadInitialData = async () => {
      if (!userId) return;
      try {
        // Agora passando o userId como exigido pelo novo lib/db.ts
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

  // --- 2. Salvamento Automático (Filtrado por UserID) ---
  useEffect(() => {
    if (isLoaded && userId) {
      // Agora passando o userId e o estado de contagens
      saveLocalCounts(userId, productCounts).catch((err) =>
        console.error("Erro ao salvar contagens offline:", err)
      );
    }
  }, [productCounts, userId, isLoaded]);

  // --- 3. Ações ---

  const handleAddCount = useCallback(() => {
    if (!currentProduct || !quantityInput) return;

    let finalQuantity: number;
    const hasOperators = /[+\-*/]/.test(quantityInput);

    if (hasOperators) {
      const calculation = calculateExpression(quantityInput);
      if (!calculation.isValid) {
        toast({
          title: "Erro no cálculo",
          description: calculation.error || "Expressão inválida",
          variant: "destructive",
        });
        return;
      }
      finalQuantity = calculation.result;
    } else {
      const parsed = Number.parseFloat(quantityInput.replace(",", "."));
      if (isNaN(parsed) || parsed < 0) {
        toast({
          title: "Erro",
          description: "Quantidade inválida",
          variant: "destructive",
        });
        return;
      }
      finalQuantity = parsed;
    }

    const quantidade = finalQuantity;

    setProductCounts((prevCounts) => {
      const existingIndex = prevCounts.findIndex(
        (item) => item.codigo_produto === currentProduct.codigo_produto
      );

      if (existingIndex >= 0) {
        const updatedCounts = [...prevCounts];
        const existingItem = { ...updatedCounts[existingIndex] };

        if (countingMode === "loja") existingItem.quant_loja += quantidade;
        else existingItem.quant_estoque += quantidade;

        existingItem.total =
          Number(existingItem.quant_loja) +
          Number(existingItem.quant_estoque) -
          Number(existingItem.saldo_estoque);

        updatedCounts[existingIndex] = existingItem;
        return updatedCounts;
      } else {
        const saldoAsNumber = Number(currentProduct.saldo_estoque);

        // Criando o objeto conforme a interface ProductCount (SEM local_estoque)
        const newCount: ProductCount = {
          id: Date.now(),
          codigo_de_barras: scanInput,
          codigo_produto: currentProduct.codigo_produto,
          descricao: currentProduct.descricao,
          saldo_estoque: saldoAsNumber,
          quant_loja: countingMode === "loja" ? quantidade : 0,
          quant_estoque: countingMode === "estoque" ? quantidade : 0,
          total:
            (countingMode === "loja" ? quantidade : 0) +
            (countingMode === "estoque" ? quantidade : 0) -
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

  const handleRemoveCount = useCallback((id: number) => {
    setProductCounts((prev) => prev.filter((item) => item.id !== id));
    toast({ title: "Item removido da contagem" });
  }, []);

  const productCountsStats = useMemo(() => {
    const totalLoja = productCounts.reduce(
      (sum, item) => sum + item.quant_loja,
      0
    );
    const totalEstoque = productCounts.reduce(
      (sum, item) => sum + item.quant_estoque,
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
    handleRemoveCount,
    productCountsStats,
  };
};
