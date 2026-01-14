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

// Interface para as opções extras (Auditoria/Manual)
// Exportamos para poder usar na tipagem da prop em outros componentes se necessário
export interface AddCountOptions {
  isManual?: boolean;
  manualDescription?: string;
  manualPrice?: number;
  price?: number; // Preço para itens normais (auditoria)
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
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  // --- 1. Carregamento Inicial ---
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

            if (data.success) {
              if (data.sessaoId) setCurrentSessionId(data.sessaoId);

              if (data.snapshot && data.snapshot.length > 0) {
                const catalogData = await getCatalogOffline();
                const products = catalogData?.products || [];
                const barcodes = catalogData?.barcodes || [];
                const consolidatedMap = new Map<
                  string,
                  { loja: number; estoque: number }
                >();

                data.snapshot.forEach((item: any) => {
                  const code = item.codigo_de_barras;
                  const qtd = Number(item.quantidade || 0);
                  const tipo = item.tipo_local;
                  if (!consolidatedMap.has(code))
                    consolidatedMap.set(code, { loja: 0, estoque: 0 });
                  const entry = consolidatedMap.get(code)!;
                  if (tipo === "ESTOQUE") entry.estoque += qtd;
                  else entry.loja += qtd;
                });

                const serverCounts: ProductCount[] = Array.from(
                  consolidatedMap.entries()
                ).map(([scannedCode, amounts]) => {
                  const barcodeMatch = barcodes.find(
                    (b: BarCode) => b.codigo_de_barras === scannedCode
                  );
                  let product: Product | undefined;
                  if (barcodeMatch)
                    product = products.find(
                      (p: Product) => p.id === barcodeMatch.produto_id
                    );
                  if (!product)
                    product = products.find(
                      (p: Product) => p.codigo_produto === scannedCode
                    );

                  if (!product) {
                    return {
                      id: Date.now() + Math.random(),
                      codigo_de_barras: scannedCode,
                      codigo_produto: scannedCode,
                      descricao: `Novo Item: ${scannedCode}`,
                      saldo_estoque: 0,
                      quant_loja: amounts.loja,
                      quant_estoque: amounts.estoque,
                      total: amounts.loja + amounts.estoque,
                      data_hora: new Date().toISOString(),
                    } as ProductCount;
                  }

                  const saldoAsNumber = Number(product.saldo_estoque || 0);
                  return {
                    id: Date.now() + Math.random(),
                    codigo_de_barras: scannedCode,
                    codigo_produto: product.codigo_produto,
                    descricao: product.descricao,
                    saldo_estoque: saldoAsNumber,
                    quant_loja: amounts.loja,
                    quant_estoque: amounts.estoque,
                    total: amounts.loja + amounts.estoque - saldoAsNumber,
                    data_hora: new Date().toISOString(),
                    price: product.price || product.preco,
                  } as ProductCount;
                });

                if (serverCounts.length > 0) mergedCounts = serverCounts;
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
  // --- 3. Lógica de Adição (Versão Blindada) ---
  const handleAddCount = useCallback(
    async (
      quantityOverride?: number, // Opcional
      options?: AddCountOptions // Opcional
    ) => {
      // 1. Determina a quantidade final
      let finalQuantity = quantityOverride;

      if (finalQuantity === undefined) {
        if (!quantityInput) return; // Se não tem override nem input, cancela
        const parsed = parseFloat(quantityInput.replace(",", "."));
        if (isNaN(parsed)) {
          toast({ title: "Quantidade Inválida", variant: "destructive" });
          return;
        }
        finalQuantity = parsed;
      }

      // 2. Validação de Segurança
      // Permite prosseguir se for manual OU se tiver produto/scan válido
      const isManual = options?.isManual === true;
      if (!currentProduct && !scanInput && !isManual) return;

      // 3. Sync Queue (API)
      if (userId) {
        try {
          const movementId = crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString();

          let codigoBarrasParaSync = scanInput || "";
          if (currentProduct?.codigo_produto)
            codigoBarrasParaSync = currentProduct.codigo_produto;
          if (isManual) codigoBarrasParaSync = `SEM-COD-${Date.now()}`;

          await addToSyncQueue(userId, {
            id: movementId,
            codigo_barras: codigoBarrasParaSync,
            quantidade: finalQuantity,
            timestamp: Date.now(),
            tipo_local: countingMode === "loja" ? "LOJA" : "ESTOQUE",
          });
        } catch (error) {
          console.error("Erro ao adicionar na fila:", error);
        }
      }

      // 4. Atualização Otimista da UI
      setProductCounts((prevCounts) => {
        let targetCode = currentProduct?.codigo_produto || scanInput;

        // Tratamento seguro para itens manuais
        if (isManual) {
          const safeDesc = options?.manualDescription
            ? String(options.manualDescription).trim()
            : "ITEM-MANUAL";
          targetCode = `SEM-COD-${safeDesc.replace(/\s+/g, "-")}`;
        }

        const existingItemIndex = prevCounts.findIndex(
          (item) =>
            item.codigo_produto === targetCode ||
            item.codigo_de_barras === targetCode
        );

        if (existingItemIndex >= 0) {
          // --- UPDATE ---
          const updatedCounts = [...prevCounts];
          const existingItem = { ...updatedCounts[existingItemIndex] };

          if (countingMode === "loja")
            existingItem.quant_loja += finalQuantity!;
          else existingItem.quant_estoque += finalQuantity!;

          existingItem.total =
            Number(existingItem.quant_loja) +
            Number(existingItem.quant_estoque) -
            Number(existingItem.saldo_estoque);

          // Atualiza preço se fornecido (prioridade para o novo valor)
          if (options?.price !== undefined) existingItem.price = options.price;
          if (options?.manualPrice !== undefined)
            existingItem.price = options.manualPrice;

          updatedCounts[existingItemIndex] = existingItem;
          return updatedCounts;
        } else {
          // --- CREATE ---
          const saldoAsNumber = currentProduct
            ? Number(currentProduct.saldo_estoque)
            : 0;

          // Descrição Segura
          let descricao = `Novo Item: ${scanInput}`;
          if (currentProduct) descricao = currentProduct.descricao;
          if (options?.manualDescription) descricao = options.manualDescription;

          // Preço Seguro
          let initialPrice = 0;
          if (currentProduct) {
            if ("price" in currentProduct && currentProduct.price)
              initialPrice = currentProduct.price;
            else if ("preco" in currentProduct && currentProduct.preco)
              initialPrice = currentProduct.preco;
          }
          if (options?.price) initialPrice = options.price;
          if (options?.manualPrice) initialPrice = options.manualPrice;

          // Categoria Segura
          let categoria = "Geral";
          if (
            currentProduct &&
            "categoria" in currentProduct &&
            currentProduct.categoria
          ) {
            categoria = currentProduct.categoria;
          }

          const newCount: ProductCount = {
            id: Date.now(),
            codigo_de_barras: isManual ? targetCode : scanInput,
            codigo_produto: targetCode,
            descricao: descricao,
            saldo_estoque: saldoAsNumber,
            quant_loja: countingMode === "loja" ? finalQuantity! : 0,
            quant_estoque: countingMode === "estoque" ? finalQuantity! : 0,
            total:
              (countingMode === "loja" ? finalQuantity! : 0) +
              (countingMode === "estoque" ? finalQuantity! : 0) -
              saldoAsNumber,
            data_hora: new Date().toISOString(),
            price: initialPrice,
            categoria: categoria,
            isManual: isManual,
          };
          return [...prevCounts, newCount];
        }
      });

      toast({ title: "Contagem salva!" });
      setQuantityInput(""); // Limpa input visual
      if (onCountAdded) onCountAdded();
    },
    [
      currentProduct,
      quantityInput,
      countingMode,
      scanInput,
      onCountAdded,
      userId,
    ]
  );

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
  const handleRemoveCount = useCallback(
    async (id: number) => {
      const itemToRemove = productCounts.find((item) => item.id === id);
      if (!itemToRemove) return;
      setProductCounts((prev) => prev.filter((item) => item.id !== id));
      try {
        if (navigator.onLine) {
          let url = `/api/inventory/item?barcode=${itemToRemove.codigo_de_barras}`;
          if (currentSessionId) url += `&sessionId=${currentSessionId}`;
          const res = await fetch(url, { method: "DELETE" });
          if (!res.ok) throw new Error("Falha na API");
          toast({ title: "Item excluído do servidor." });
        } else {
          toast({
            title: "Removido Localmente",
            description: "Sincronização pendente.",
          });
        }
      } catch (error) {
        console.error("Erro ao deletar:", error);
        toast({
          title: "Erro",
          description: "Falha ao excluir.",
          variant: "destructive",
        });
      }
    },
    [productCounts, currentSessionId]
  );

  const handleClearCountsOnly = useCallback(async () => {
    setProductCounts([]);
    setQuantityInput("");
    try {
      if (navigator.onLine) {
        const res = await fetch("/api/inventory", { method: "DELETE" });
        if (!res.ok) throw new Error("Falha na API");
        toast({ title: "Inventário limpo!" });
      } else {
        toast({
          title: "Limpo Localmente",
          description: "Sincronização pendente.",
        });
      }
    } catch (error) {
      console.error("Erro ao limpar:", error);
      toast({
        title: "Erro",
        description: "Falha ao limpar.",
        variant: "destructive",
      });
    }
  }, []);

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
