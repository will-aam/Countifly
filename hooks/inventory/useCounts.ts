// hooks/inventory/useCounts.ts
/**
 * Descrição: Hook responsável pela Gestão de Contagens (Com Persistência Offline + Sync Inicial).
 * Responsabilidade:
 * 1. Gerenciar o estado da lista de itens contados (productCounts).
 * 2. Implementar a lógica de "Enter de duas etapas" (Cálculo -> Adição).
 * 3. Persistir os dados no IndexedDB para evitar perda de dados (Local).
 * 4. Adicionar à Fila de Sincronização (SyncQueue) para envio ao servidor.
 * 5. Hidratar (carregar) dados do servidor ao iniciar em um novo dispositivo.
 */

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
  // --- Estados ---
  const [productCounts, setProductCounts] = useState<ProductCount[]>([]);
  const [quantityInput, setQuantityInput] = useState("");
  const [countingMode, setCountingMode] = useState<"loja" | "estoque">("loja");
  const [isLoaded, setIsLoaded] = useState(false);

  // --- 1. Carregamento Inicial (Híbrido: Local + Rede) ---
  useEffect(() => {
    const loadInitialData = async () => {
      if (!userId) return;

      try {
        // A. Tenta carregar do IndexedDB primeiro (mais rápido)
        const localData = await getLocalCounts(userId);

        let mergedCounts: ProductCount[] = localData || [];

        // B. Se estiver online, tenta buscar o Snapshot do servidor (Fonte da Verdade)
        if (navigator.onLine) {
          try {
            // Busca o snapshot na nova rota segura
            const response = await fetch("/api/single/session");
            const data = await response.json();

            if (data.success && data.snapshot && data.snapshot.length > 0) {
              // Precisamos do catálogo offline para preencher os detalhes
              const catalogData = await getCatalogOffline();

              // Garante que products e barcodes sejam arrays, mesmo que vazios
              const products = catalogData?.products || [];
              const barcodes = catalogData?.barcodes || [];

              // Mapeia o snapshot do servidor para o formato ProductCount
              const serverCounts: ProductCount[] = data.snapshot
                .map((snapItem: any) => {
                  const scannedCode = snapItem.codigo_de_barras;
                  const qtdServer = Number(snapItem.quantidade || 0);

                  // LÓGICA DE BUSCA:
                  // 1. Tenta achar na lista de códigos de barras
                  const barcodeMatch = barcodes.find(
                    (b: BarCode) => b.codigo_de_barras === scannedCode
                  );

                  let product: Product | undefined;

                  if (barcodeMatch) {
                    product = products.find(
                      (p: Product) => p.id === barcodeMatch.produto_id
                    );
                  }

                  // 2. Se não achou via barcode, tenta ver se é o código do produto
                  if (!product) {
                    product = products.find(
                      (p: Product) => p.codigo_produto === scannedCode
                    );
                  }

                  // --- CORREÇÃO PARA ITENS NOVOS/TEMPORÁRIOS ---
                  if (!product) {
                    // Se o produto não está no catálogo, criamos um "Item Temporário" visual
                    // para que ele não seja descartado da lista.
                    return {
                      id: Date.now() + Math.random(),
                      codigo_de_barras: scannedCode,
                      codigo_produto: scannedCode,
                      descricao: `Novo Item: ${scannedCode}`, // Identificação visual
                      saldo_estoque: 0,
                      quant_loja: qtdServer, // Assume que está na loja se não houver distinção
                      quant_estoque: 0,
                      total: qtdServer, // Total = Quantidade - 0
                      data_hora: new Date().toISOString(),
                    } as ProductCount;
                  }

                  // Se achou o produto, usa os dados reais
                  const saldoAsNumber = Number(product.saldo_estoque || 0);

                  return {
                    id: Date.now() + Math.random(),
                    codigo_de_barras: scannedCode,
                    codigo_produto: product.codigo_produto,
                    descricao: product.descricao,
                    saldo_estoque: saldoAsNumber,
                    quant_loja: qtdServer,
                    quant_estoque: 0,
                    total: qtdServer - saldoAsNumber,
                    data_hora: new Date().toISOString(),
                  } as ProductCount;
                })
                .filter((item: ProductCount | null) => item !== null);

              // Se o servidor retornou dados, assumimos como a verdade atualizada
              if (serverCounts.length > 0) {
                mergedCounts = serverCounts;
              }
            }
          } catch (apiError) {
            console.warn(
              "Sem conexão ou erro na API, mantendo dados locais.",
              apiError
            );
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

  // --- 2. Salvamento Automático (No IndexedDB - Local Counts) ---
  useEffect(() => {
    if (isLoaded && userId) {
      saveLocalCounts(userId, productCounts).catch((err) =>
        console.error("Erro ao salvar contagens offline:", err)
      );
    }
  }, [productCounts, userId, isLoaded]);

  // --- 3. Lógica de Adição ---

  const handleAddCount = useCallback(async () => {
    if (!currentProduct && !scanInput) return; // Precisa pelo menos do input se for item novo manual
    if (!quantityInput) return;

    const quantity = parseFloat(quantityInput.replace(",", "."));

    if (isNaN(quantity)) {
      toast({
        title: "Quantidade Inválida",
        description: "Digite um número ou expressão válida.",
        variant: "destructive",
      });
      return;
    }

    // --- A. Adiciona à Fila de Sincronização (Backend) ---
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
          tipo_local: countingMode === "loja" ? "LOJA" : "ESTOQUE",
        });
      } catch (error) {
        console.error("Erro ao adicionar na fila de sync:", error);
      }
    }

    // --- B. Atualiza o Estado Local (UI + IndexedDB Local) ---
    setProductCounts((prevCounts) => {
      // Tenta encontrar pelo produto OU pelo código bipado (caso seja item novo)
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
        // Se for item novo (sem currentProduct), define valores padrão
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

  // --- 4. Enter de Duas Etapas ---

  const handleQuantityKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const hasOperators = /[+\-*/]/.test(quantityInput);

        if (hasOperators) {
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
          handleAddCount();
        }
      }
    },
    [quantityInput, handleAddCount]
  );

  // --- 5. Ações Adicionais ---

  const handleRemoveCount = useCallback((id: number) => {
    setProductCounts((prev) => prev.filter((item) => item.id !== id));
    toast({ title: "Item removido da tela" });
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
