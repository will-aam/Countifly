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
  mode: "audit" | "import"; // <--- CAMPO OBRIGATÓRIO NOVO
}

export interface AddCountOptions {
  isManual?: boolean;
  manualDescription?: string;
  manualPrice?: number;
  price?: number;
}

export const useCounts = ({
  userId,
  currentProduct,
  scanInput,
  onCountAdded,
  mode, // <--- Recebendo o modo
}: UseCountsProps) => {
  const [productCounts, setProductCounts] = useState<ProductCount[]>([]);
  const [quantityInput, setQuantityInput] = useState("");
  const [countingMode, setCountingMode] = useState<"loja" | "estoque">("loja");
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  // --- 1. Carregamento Inicial (com FILTRO DE MODO) ---
  useEffect(() => {
    const loadInitialData = async () => {
      if (!userId) return;
      try {
        const localData = await getLocalCounts(userId);

        // FILTRO CRÍTICO: Carrega apenas o que for do modo atual
        let mergedCounts: ProductCount[] = localData
          ? localData.filter((item) => item.mode === mode)
          : [];

        if (navigator.onLine) {
          try {
            // Nota: O sync online (fetch /api/single/session) precisaria ser
            // ajustado futuramente no backend para também suportar 'mode'.
            // Por enquanto, mantemos a lógica local como guardiã principal do estado.
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
                  consolidatedMap.entries(),
                ).map(([scannedCode, amounts]) => {
                  const barcodeMatch = barcodes.find(
                    (b: BarCode) => b.codigo_de_barras === scannedCode,
                  );
                  let product: Product | undefined;
                  if (barcodeMatch)
                    product = products.find(
                      (p: Product) => p.id === barcodeMatch.produto_id,
                    );
                  if (!product)
                    product = products.find(
                      (p: Product) => p.codigo_produto === scannedCode,
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
                      mode: mode, // Forçamos o modo atual para dados do servidor
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
                    categoria: product.categoria,
                    subcategoria: product.subcategoria,
                    marca: product.marca,
                    mode: mode, // Forçamos o modo atual
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
  }, [userId, mode]); // Recarrega se mudar o modo

  // --- 2. Salvamento Automático (com MODO) ---
  useEffect(() => {
    if (isLoaded && userId) {
      // Passa o modo para a função de salvar
      saveLocalCounts(userId, productCounts, mode).catch((err) =>
        console.error("Erro ao salvar contagens offline:", err),
      );
    }
  }, [productCounts, userId, isLoaded, mode]);

  // --- 3. Lógica de Adição (com MODO) ---
  const handleAddCount = useCallback(
    async (quantityOverride?: number, options?: AddCountOptions) => {
      let finalQuantity = quantityOverride;

      if (finalQuantity === undefined) {
        if (!quantityInput) return;
        const parsed = parseFloat(quantityInput.replace(",", "."));
        if (isNaN(parsed)) {
          toast({ title: "Quantidade Inválida", variant: "destructive" });
          return;
        }
        finalQuantity = parsed;
      }

      const isManual = options?.isManual === true;
      if (!currentProduct && !scanInput && !isManual) return;

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

      setProductCounts((prevCounts) => {
        let targetCode = currentProduct?.codigo_produto || scanInput;

        if (isManual) {
          const safeDesc = options?.manualDescription
            ? String(options.manualDescription).trim()
            : "ITEM-MANUAL";
          targetCode = `SEM-COD-${safeDesc.replace(/\s+/g, "-")}`;
        }

        const existingItemIndex = prevCounts.findIndex(
          (item) =>
            item.codigo_produto === targetCode ||
            item.codigo_de_barras === targetCode,
        );

        if (existingItemIndex >= 0) {
          const updatedCounts = [...prevCounts];
          const existingItem = { ...updatedCounts[existingItemIndex] };

          if (countingMode === "loja")
            existingItem.quant_loja += finalQuantity!;
          else existingItem.quant_estoque += finalQuantity!;

          existingItem.total =
            Number(existingItem.quant_loja) +
            Number(existingItem.quant_estoque) -
            Number(existingItem.saldo_estoque);

          if (options?.price !== undefined) existingItem.price = options.price;
          if (options?.manualPrice !== undefined)
            existingItem.price = options.manualPrice;

          existingItem.mode = mode; // Garante/Atualiza a tag do modo

          updatedCounts[existingItemIndex] = existingItem;
          return updatedCounts;
        } else {
          const saldoAsNumber = currentProduct
            ? Number(currentProduct.saldo_estoque)
            : 0;

          let descricao = `Novo Item: ${scanInput}`;
          if (currentProduct) descricao = currentProduct.descricao;
          if (options?.manualDescription) descricao = options.manualDescription;

          let initialPrice = 0;
          if (currentProduct) {
            if ("price" in currentProduct && currentProduct.price)
              initialPrice = currentProduct.price;
            else if ("preco" in currentProduct && currentProduct.preco)
              initialPrice = currentProduct.preco;
          }
          if (options?.price) initialPrice = options.price;
          if (options?.manualPrice) initialPrice = options.manualPrice;

          let categoria = "Geral";
          let subcategoria = "";
          let marca = "";

          if (currentProduct) {
            if ("categoria" in currentProduct && currentProduct.categoria) {
              categoria = currentProduct.categoria;
            }
            if (
              "subcategoria" in currentProduct &&
              currentProduct.subcategoria
            ) {
              subcategoria = currentProduct.subcategoria;
            }
            if ("marca" in currentProduct && currentProduct.marca) {
              marca = currentProduct.marca;
            }
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
            subcategoria: subcategoria,
            marca: marca,
            isManual: isManual,
            mode: mode, // <--- ADICIONADO: Marca o item novo
          };
          return [...prevCounts, newCount];
        }
      });

      toast({ title: "Contagem salva!" });
      setQuantityInput("");
      if (onCountAdded) onCountAdded();
    },
    [
      currentProduct,
      quantityInput,
      countingMode,
      scanInput,
      onCountAdded,
      userId,
      mode, // Dependência adicionada
    ],
  );

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
    [quantityInput, handleAddCount],
  );

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
    [productCounts, currentSessionId],
  );

  const handleClearCountsOnly = useCallback(async () => {
    setProductCounts([]);
    setQuantityInput("");

    try {
      if (navigator.onLine) {
        const res = await fetch("/api/inventory?scope=counts", {
          method: "DELETE",
        });

        if (!res.ok) throw new Error("Falha na API");
        toast({
          title: "Contagens limpas!",
        });
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
        description: "Falha ao limpar contagens.",
        variant: "destructive",
      });
    }
  }, []);

  const productCountsStats = useMemo(() => {
    const totalLoja = productCounts.reduce(
      (sum, item) => sum + (item.quant_loja || 0),
      0,
    );
    const totalEstoque = productCounts.reduce(
      (sum, item) => sum + (item.quant_estoque || 0),
      0,
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
