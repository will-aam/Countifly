// hooks/inventory/useCounts.ts
/**
 * Descrição: Hook responsável pela Gestão de Contagens (Com Persistência Offline).
 * Responsabilidade:
 * 1. Gerenciar o estado da lista de itens contados (productCounts).
 * 2. Controlar o input de quantidade (incluindo a calculadora).
 * 3. Persistir os dados no IndexedDB (Offline-First).
 * 4. Calcular estatísticas (totais).
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { calculateExpression } from "@/lib/utils";
import { saveLocalCounts, getLocalCounts } from "@/lib/db"; // <--- O Segredo
import type { Product, TempProduct, ProductCount } from "@/lib/types";

export const useCounts = (
  userId: number | null,
  currentProduct: Product | TempProduct | null,
  scanInput: string,
  onCountAdded?: () => void
) => {
  // --- Estados ---
  const [productCounts, setProductCounts] = useState<ProductCount[]>([]);
  const [quantityInput, setQuantityInput] = useState("");
  const [countingMode, setCountingMode] = useState<"loja" | "estoque">("loja");
  const [isLoaded, setIsLoaded] = useState(false); // Para evitar salvar antes de carregar

  // --- 1. Carregamento Inicial (Do IndexedDB) ---
  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      try {
        const savedCounts = await getLocalCounts();
        if (savedCounts && savedCounts.length > 0) {
          setProductCounts(savedCounts);
          console.log(
            `📦 Recuperados ${savedCounts.length} itens da contagem local.`
          );
        }
      } catch (error) {
        console.error("Erro ao carregar contagem local:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
  }, [userId]);

  // --- 2. Salvamento Automático (No IndexedDB) ---
  useEffect(() => {
    // Só salva se já tiver carregado os dados iniciais (evita sobrescrever com vazio)
    if (userId && isLoaded) {
      saveLocalCounts(productCounts).catch((err) =>
        console.error("Erro ao salvar contagem localmente:", err)
      );
    }
  }, [productCounts, userId, isLoaded]);

  // --- Lógica de Negócio (Inalterada) ---

  const handleQuantityKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const expression = quantityInput.trim();
        if (!expression) return;

        if (/[+\-*/]/.test(expression)) {
          const calculation = calculateExpression(expression);
          if (calculation.isValid) {
            setQuantityInput(calculation.result.toString());
          } else {
            toast({
              title: "Erro no cálculo",
              description: calculation.error,
              variant: "destructive",
            });
          }
        } else if (currentProduct) {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          handleAddCount();

          const barcodeEl = document.getElementById("barcode");
          if (barcodeEl) barcodeEl.focus();
        }
      }
    },
    [quantityInput, currentProduct]
  );

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
          description: "Quantidade deve ser um número válido",
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
          local_estoque: "",
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
    handleQuantityKeyPress,
    productCountsStats,
  };
};
