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
            const response = await fetch("/api/inventory/single/session");
            const data = await response.json();

            if (data.success && data.snapshot && data.snapshot.length > 0) {
              // Precisamos do catálogo offline para preencher os detalhes
              // O getCatalogOffline retorna um objeto { products, barcodes }
              const catalogData = await getCatalogOffline();

              // Verifica se temos produtos carregados no catálogo
              if (
                catalogData &&
                catalogData.products &&
                catalogData.products.length > 0
              ) {
                const { products, barcodes } = catalogData;

                // Mapeia o snapshot do servidor para o formato ProductCount
                const serverCounts: ProductCount[] = data.snapshot
                  .map((snapItem: any) => {
                    const scannedCode = snapItem.codigo_de_barras;

                    // LÓGICA DE BUSCA CORRIGIDA:
                    // 1. Tenta achar na lista de códigos de barras
                    // Nota: barcodes pode ser undefined se o banco estiver vazio, então usamos ?.
                    const barcodeMatch = barcodes?.find(
                      (b: BarCode) => b.codigo_de_barras === scannedCode
                    );

                    let product: Product | undefined;

                    if (barcodeMatch) {
                      // Se achou o código de barras, busca o produto pelo ID
                      product = products.find(
                        (p: Product) => p.id === barcodeMatch.produto_id
                      );
                    }

                    // 2. Se não achou via barcode, tenta ver se o código bipado é o próprio código do produto (Fallback)
                    if (!product) {
                      product = products.find(
                        (p: Product) => p.codigo_produto === scannedCode
                      );
                    }

                    if (!product) return null; // Produto não está no catálogo local

                    const saldoAsNumber = Number(product.saldo_estoque || 0);
                    const qtdServer = Number(snapItem.quantidade || 0);

                    // Cria o objeto de contagem restaurado
                    return {
                      id: Date.now() + Math.random(), // ID temporário para UI
                      codigo_de_barras: scannedCode,
                      codigo_produto: product.codigo_produto,
                      descricao: product.descricao,
                      saldo_estoque: saldoAsNumber,
                      // Como o snapshot soma tudo, jogamos na "Loja" por padrão para visualizar
                      quant_loja: qtdServer,
                      quant_estoque: 0,
                      total: qtdServer - saldoAsNumber,
                      data_hora: new Date().toISOString(),
                    } as ProductCount;
                  })
                  .filter((item: ProductCount | null) => item !== null);

                // Se o servidor retornou dados válidos, usamos eles como base
                if (serverCounts.length > 0) {
                  // console.log("Hidratando dados do servidor:", serverCounts.length, "itens.");
                  mergedCounts = serverCounts;
                }
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

    // --- A. Adiciona à Fila de Sincronização (Backend) ---
    if (userId) {
      try {
        // Gera um ID único para o movimento
        const movementId = crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString();

        await addToSyncQueue(userId, {
          id: movementId,
          codigo_barras: scanInput, // Usa o código que foi realmente bipado
          quantidade: quantity,
          timestamp: Date.now(),
          tipo_local: countingMode === "loja" ? "LOJA" : "ESTOQUE",
          // sessao_id e participante_id deixamos undefined para o SinglePlayer (a API resolve)
        });
      } catch (error) {
        console.error("Erro ao adicionar na fila de sync:", error);
        // Não bloqueamos o fluxo, pois o salvamento local (abaixo) é prioridade
      }
    }

    // --- B. Atualiza o Estado Local (UI + IndexedDB Local) ---
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

        // Cria novo item na lista de contagem visual
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
          // ETAPA 2: Adiciona à lista (Chama o handleAddCount atualizado)
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
    // Nota: Em uma arquitetura Event Sourcing completa, deveríamos lançar um movimento de compensação (-quantidade).
    // Por enquanto, isso remove apenas da visualização local.
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
