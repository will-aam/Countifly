// hooks/inventory/useCounts.ts
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { calculateExpression } from "@/lib/utils";
import {
  saveLocalCounts,
  getLocalCounts,
  getCatalogOffline,
  addToSyncQueue,
} from "@/lib/db";
import type { Product, TempProduct, ProductCount, BarCode } from "@/lib/types";

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
  const [productCounts, setProductCounts] = useState<ProductCount[]>([]);
  const [quantityInput, setQuantityInput] = useState("");
  const [countingMode, setCountingMode] = useState<"loja" | "estoque">("loja");
  const [isLoaded, setIsLoaded] = useState(false);

  // --- 1. Carregamento Inicial (Híbrido: Local + Rede) ---
  useEffect(() => {
    const loadInitialData = async () => {
      if (!userId) return;

      try {
        const localData = await getLocalCounts(userId);
        let mergedCounts: ProductCount[] = localData || [];

        if (navigator.onLine) {
          try {
            const response = await fetch("/api/single/session");
            const data = await response.json();

            if (data.success && data.snapshot && data.snapshot.length > 0) {
              const catalogData = await getCatalogOffline();
              const products = catalogData?.products || [];
              const barcodes = catalogData?.barcodes || [];

              // NOVO: Pré-processamento para consolidar Loja vs Estoque
              // O servidor manda array solto: [{code: A, tipo: LOJA, qtd: 10}, {code: A, tipo: ESTOQUE, qtd: 30}]
              // Nós transformamos em: { A: { loja: 10, estoque: 30 } }
              const consolidatedMap = new Map<
                string,
                { loja: number; estoque: number }
              >();

              data.snapshot.forEach((item: any) => {
                const code = item.codigo_de_barras;
                const qtd = Number(item.quantidade || 0);
                const tipo = item.tipo_local; // "LOJA" ou "ESTOQUE"

                if (!consolidatedMap.has(code)) {
                  consolidatedMap.set(code, { loja: 0, estoque: 0 });
                }
                const entry = consolidatedMap.get(code)!;

                if (tipo === "ESTOQUE") entry.estoque += qtd;
                else entry.loja += qtd; // Default para LOJA
              });

              // Agora geramos a lista final baseada no mapa consolidado
              const serverCounts: ProductCount[] = Array.from(
                consolidatedMap.entries()
              ).map(([scannedCode, amounts]) => {
                // LÓGICA DE BUSCA DE PRODUTO (Mantida)
                const barcodeMatch = barcodes.find(
                  (b: BarCode) => b.codigo_de_barras === scannedCode
                );

                let product: Product | undefined;
                if (barcodeMatch) {
                  product = products.find(
                    (p: Product) => p.id === barcodeMatch.produto_id
                  );
                }
                if (!product) {
                  product = products.find(
                    (p: Product) => p.codigo_produto === scannedCode
                  );
                }

                // Se for Item Novo (sem cadastro)
                if (!product) {
                  return {
                    id: Date.now() + Math.random(),
                    codigo_de_barras: scannedCode,
                    codigo_produto: scannedCode,
                    descricao: `Novo Item: ${scannedCode}`,
                    saldo_estoque: 0,
                    quant_loja: amounts.loja, // <--- Valor correto da Loja
                    quant_estoque: amounts.estoque, // <--- Valor correto do Estoque
                    total: amounts.loja + amounts.estoque,
                    data_hora: new Date().toISOString(),
                  } as ProductCount;
                }

                // Se for Item do Catálogo
                const saldoAsNumber = Number(product.saldo_estoque || 0);
                return {
                  id: Date.now() + Math.random(),
                  codigo_de_barras: scannedCode,
                  codigo_produto: product.codigo_produto,
                  descricao: product.descricao,
                  saldo_estoque: saldoAsNumber,
                  quant_loja: amounts.loja, // <--- Valor correto da Loja
                  quant_estoque: amounts.estoque, // <--- Valor correto do Estoque
                  total: amounts.loja + amounts.estoque - saldoAsNumber,
                  data_hora: new Date().toISOString(),
                } as ProductCount;
              });

              if (serverCounts.length > 0) {
                mergedCounts = serverCounts;
              }
            }
          } catch (apiError) {
            console.warn("Erro no sync inicial:", apiError);
          }
        }

        setProductCounts(mergedCounts);
      } catch (error) {
        console.error("Erro crítico ao carregar contagens:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadInitialData();
  }, [userId]);

  // --- 2. Salvamento Automático ---
  useEffect(() => {
    if (isLoaded && userId) {
      saveLocalCounts(userId, productCounts).catch((err) =>
        console.error("Erro ao salvar contagens offline:", err)
      );
    }
  }, [productCounts, userId, isLoaded]);

  // --- 3. Lógica de Adição ---
  const handleAddCount = useCallback(async () => {
    if (!currentProduct && !scanInput) return;
    if (!quantityInput) return;

    const quantity = parseFloat(quantityInput.replace(",", "."));
    if (isNaN(quantity)) {
      toast({ title: "Quantidade Inválida", variant: "destructive" });
      return;
    }

    // A. Enviar para API (Sync Queue)
    if (userId) {
      try {
        const movementId = crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString();
        await addToSyncQueue(userId, {
          id: movementId,
          codigo_barras: scanInput,
          quantidade: quantity,
          timestamp: Date.now(),
          tipo_local: countingMode === "loja" ? "LOJA" : "ESTOQUE", // Importante: Enviamos o tipo certo
        });
      } catch (error) {
        console.error("Erro ao adicionar na fila:", error);
      }
    }

    // B. Atualizar UI Local
    setProductCounts((prevCounts) => {
      const targetCode = currentProduct?.codigo_produto || scanInput;
      const existingItemIndex = prevCounts.findIndex(
        (item) =>
          item.codigo_produto === targetCode ||
          item.codigo_de_barras === targetCode
      );

      if (existingItemIndex >= 0) {
        const updatedCounts = [...prevCounts];
        const existingItem = { ...updatedCounts[existingItemIndex] };

        if (countingMode === "loja") existingItem.quant_loja += quantity;
        else existingItem.quant_estoque += quantity;

        existingItem.total =
          Number(existingItem.quant_loja) +
          Number(existingItem.quant_estoque) -
          Number(existingItem.saldo_estoque);

        updatedCounts[existingItemIndex] = existingItem;
        return updatedCounts;
      } else {
        const saldoAsNumber = currentProduct
          ? Number(currentProduct.saldo_estoque)
          : 0;
        const descricao = currentProduct
          ? currentProduct.descricao
          : `Novo Item: ${scanInput}`;
        const codigoProd = currentProduct
          ? currentProduct.codigo_produto
          : scanInput;

        const newCount: ProductCount = {
          id: Date.now(),
          codigo_de_barras: scanInput,
          codigo_produto: codigoProd,
          descricao: descricao,
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

    toast({ title: "Contagem salva!" });
    setQuantityInput("");
    if (onCountAdded) onCountAdded();
  }, [
    currentProduct,
    quantityInput,
    countingMode,
    scanInput,
    onCountAdded,
    userId,
  ]);

  // --- 4. Enter ---
  const handleQuantityKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const hasOperators = /[+\-*/]/.test(quantityInput);
        if (hasOperators) {
          const calculation = calculateExpression(quantityInput);
          if (calculation.isValid)
            setQuantityInput(calculation.result.toString());
          else toast({ title: "Erro no cálculo", variant: "destructive" });
        } else {
          handleAddCount();
        }
      }
    },
    [quantityInput, handleAddCount]
  );

  // --- 5. Ações ---
  const handleRemoveCount = useCallback((id: number) => {
    setProductCounts((prev) => prev.filter((item) => item.id !== id));
    toast({ title: "Item removido da tela" });
  }, []);

  const handleClearCountsOnly = useCallback(() => {
    setProductCounts([]);
    setQuantityInput("");
  }, []);

  // --- 6. Totais ---
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
