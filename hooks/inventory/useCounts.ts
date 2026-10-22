// hooks/inventory/useCounts.ts
// Hook especializado em gerenciar as contagens de produtos durante a auditoria ou importação.
// Responsabilidades:
// 1. Gerenciar o estado das contagens (quantidade, tipo de local, etc).
// 2. Sincronizar com o servidor (apenas no modo AUDIT).
// 3. Salvar e carregar dados localmente, isolando por modo (audit vs import).
// 4. Fornecer funções para adicionar, remover e limpar contagens, respeitando o modo atual.
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { calculateExpression } from "@/lib/utils";
import {
  saveLocalCounts,
  getLocalCounts,
  addToSyncQueue,
} from "@/lib/db";
import type { Product, TempProduct, ProductCount } from "@/lib/types";

interface UseCountsProps {
  userId: number | null;
  currentProduct: Product | TempProduct | null;
  scanInput: string;
  onCountAdded?: () => void;
  mode: "audit" | "import"; // <--- CAMPO OBRIGATÓRIO NOVO
  defaultCountingMode?: "loja" | "estoque";
}

export interface AddCountOptions {
  isManual?: boolean;
  manualDescription?: string;
  manualPrice?: number;
  price?: number;
  productOverride?: Product | TempProduct;
  barcodeOverride?: string;
  countingModeOverride?: "loja" | "estoque";
  quiet?: boolean;
  fastScan?: boolean;
}

export const useCounts = ({
  userId,
  currentProduct,
  scanInput,
  onCountAdded,
  mode, // <--- Recebendo o modo
  defaultCountingMode = "loja",
}: UseCountsProps) => {
  const [productCounts, setProductCounts] = useState<ProductCount[]>([]);
  const [quantityInput, setQuantityInput] = useState("");
  const [countingMode, setCountingMode] =
    useState<"loja" | "estoque">(defaultCountingMode);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [lastFastCount, setLastFastCount] = useState<{
    targetCode: string;
    barcode: string;
    countingMode: "loja" | "estoque";
    isTemporary: boolean;
  } | null>(null);

  useEffect(() => {
    if (productCounts.length === 0) setCountingMode(defaultCountingMode);
  }, [defaultCountingMode, productCounts.length]);

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

        // --- ISOLAMENTO DE SINCRONIZAÇÃO ---
        // Só buscamos dados do servidor se estivermos no modo AUDIT.
        // O modo IMPORT funciona 100% local para evitar misturar com a auditoria global.
        if (navigator.onLine && mode === "audit") {
          try {
            const response = await fetch("/api/single/session");
            const data = await response.json();

            if (data.success) {
              if (data.sessaoId) setCurrentSessionId(data.sessaoId);

              if (data.snapshot && data.snapshot.length > 0) {
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
                ).map(
                  ([scannedCode, amounts]) =>
                    ({
                      id: Date.now() + Math.random(),
                      codigo_de_barras: scannedCode,
                      codigo_produto: scannedCode,
                      descricao: `Novo Item: ${scannedCode}`,
                      saldo_estoque: 0,
                      quant_loja: amounts.loja,
                      quant_estoque: amounts.estoque,
                      total: amounts.loja + amounts.estoque,
                      data_hora: new Date().toISOString(),
                      mode,
                    }) as ProductCount,
                );

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
      // Salva localmente independente do modo (mas separado por chave interna do DB)
      saveLocalCounts(userId, productCounts, mode).catch((err) =>
        console.error("Erro ao salvar contagens offline:", err),
      );
    }
  }, [productCounts, userId, isLoaded, mode]);

  // --- 3. Lógica de Adição (com MODO) ---
  const handleAddCount = useCallback(
    async (quantityOverride?: number, options?: AddCountOptions) => {
      const activeProduct = options?.productOverride ?? currentProduct;
      const activeScanInput = options?.barcodeOverride ?? scanInput;
      const activeCountingMode = options?.countingModeOverride ?? countingMode;
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
      if (!activeProduct && !activeScanInput && !isManual) return;

      // --- ISOLAMENTO DE SINCRONIZAÇÃO ---
      // Só enviamos para a fila de sync se for AUDIT.
      // Mas SEMPRE adiciona ao state local (tanto audit quanto import)
      if (userId && mode === "audit") {
        try {
          const movementId = crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString();

          // O servidor agrupa movimentos pelo código bipado; o código interno
          // do produto global não é necessariamente um código de barras.
          let codigoBarrasParaSync =
            activeScanInput ||
            activeProduct?.codigo_de_barras ||
            activeProduct?.codigo_produto ||
            "";
          if (isManual) codigoBarrasParaSync = `SEM-COD-${Date.now()}`;

          await addToSyncQueue(userId, {
            id: movementId,
            codigo_barras: codigoBarrasParaSync,
            quantidade: finalQuantity,
            timestamp: Date.now(),
            tipo_local: activeCountingMode === "loja" ? "LOJA" : "ESTOQUE",
          });
        } catch (error) {
          console.error("Erro ao adicionar na fila:", error);
        }
      }

      // ✅ CORREÇÃO PRINCIPAL: Calcular targetCode ANTES do setProductCounts
      let targetCode = activeProduct?.codigo_produto || activeScanInput;

      // ✅ Garantir que itens manuais/temporários tenham código único
      if (isManual) {
        const safeDesc = options?.manualDescription
          ? String(options.manualDescription).trim()
          : "ITEM-MANUAL";
        // ✅ Código produto E código de barras AMBOS começam com TEMP-
        targetCode = `TEMP-${Date.now()}-${safeDesc.replace(/\s+/g, "-")}`;
      }

      // ✅ Se ainda não tiver código (item temporário sem descrição), gera um genérico
      if (!targetCode || (!isManual && !activeProduct)) {
        targetCode = `TEMP-${Date.now()}-${activeScanInput || "SEM-CODIGO"}`;
      }

      if (options?.fastScan) {
        setLastFastCount({
          targetCode,
          barcode: activeScanInput,
          countingMode: activeCountingMode,
          isTemporary: targetCode.startsWith("TEMP-"),
        });
      } else {
        setLastFastCount(null);
      }

      setProductCounts((prevCounts) => {
        // ✅ Agora usa o targetCode calculado acima (não redeclara)

        const existingItemIndex = prevCounts.findIndex(
          (item) =>
            item.codigo_produto === targetCode ||
            item.codigo_de_barras === targetCode,
        );

        if (existingItemIndex >= 0) {
          const updatedCounts = [...prevCounts];
          const existingItem = { ...updatedCounts[existingItemIndex] };

          if (activeCountingMode === "loja")
            existingItem.quant_loja += finalQuantity!;
          else existingItem.quant_estoque += finalQuantity!;

          existingItem.total =
            Number(existingItem.quant_loja) +
            Number(existingItem.quant_estoque) -
            Number(existingItem.saldo_estoque);

          if (options?.price !== undefined) existingItem.price = options.price;
          if (options?.manualPrice !== undefined)
            existingItem.price = options.manualPrice;

          existingItem.mode = mode;

          updatedCounts[existingItemIndex] = existingItem;
          return updatedCounts;
        } else {
          const saldoAsNumber = activeProduct
            ? Number(activeProduct.saldo_estoque)
            : 0;

          let descricao = `Novo Item: ${activeScanInput || "Sem código"}`;
          if (activeProduct) descricao = activeProduct.descricao;
          if (options?.manualDescription) descricao = options.manualDescription;

          let initialPrice = 0;
          if (activeProduct) {
            if ("price" in activeProduct && activeProduct.price)
              initialPrice = activeProduct.price;
            else if ("preco" in activeProduct && activeProduct.preco)
              initialPrice = activeProduct.preco;
          }
          if (options?.price) initialPrice = options.price;
          if (options?.manualPrice) initialPrice = options.manualPrice;

          let categoria = "Geral";
          let subcategoria = "";
          let marca = "";

          if (activeProduct) {
            if ("categoria" in activeProduct && activeProduct.categoria) {
              categoria = activeProduct.categoria;
            }
            if (
              "subcategoria" in activeProduct &&
              activeProduct.subcategoria
            ) {
              subcategoria = activeProduct.subcategoria;
            }
            if ("marca" in activeProduct && activeProduct.marca) {
              marca = activeProduct.marca;
            }
          }

          const newCount: ProductCount = {
            id: Date.now() + Math.random(),
            codigo_de_barras: isManual
              ? targetCode
              : activeScanInput || targetCode,
            codigo_produto: targetCode,
            descricao: descricao,
            saldo_estoque: saldoAsNumber,
            quant_loja: activeCountingMode === "loja" ? finalQuantity! : 0,
            quant_estoque: activeCountingMode === "estoque" ? finalQuantity! : 0,
            total:
              (activeCountingMode === "loja" ? finalQuantity! : 0) +
              (activeCountingMode === "estoque" ? finalQuantity! : 0) -
              saldoAsNumber,
            data_hora: new Date().toISOString(),
            price: initialPrice,
            categoria: categoria,
            subcategoria: subcategoria,
            marca: marca,
            isManual: isManual,
            mode: mode,
          };
          return [...prevCounts, newCount];
        }
      });

      if (!options?.quiet) toast({ title: "Contagem salva!" });
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
      mode,
    ],
  );

  const undoLastFastCount = useCallback(() => {
    if (!lastFastCount) return;

    setProductCounts((previous) => {
      const index = previous.findIndex(
        (item) =>
          item.codigo_produto === lastFastCount.targetCode ||
          item.codigo_de_barras === lastFastCount.barcode,
      );
      if (index < 0) return previous;

      const next = [...previous];
      const item = { ...next[index] };
      const quantityKey = lastFastCount.countingMode === "loja"
        ? "quant_loja"
        : "quant_estoque";
      item[quantityKey] = Math.max(0, Number(item[quantityKey] || 0) - 1);

      if (
        lastFastCount.isTemporary &&
        Number(item.quant_loja || 0) === 0 &&
        Number(item.quant_estoque || 0) === 0
      ) {
        next.splice(index, 1);
      } else {
        item.total =
          Number(item.quant_loja || 0) +
          Number(item.quant_estoque || 0) -
          Number(item.saldo_estoque || 0);
        next[index] = item;
      }
      return next;
    });

    setLastFastCount(null);
    toast({ title: "Última bipagem desfeita" });
  }, [lastFastCount]);

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
      if (
        lastFastCount &&
        (itemToRemove.codigo_produto === lastFastCount.targetCode ||
          itemToRemove.codigo_de_barras === lastFastCount.barcode)
      ) {
        setLastFastCount(null);
      }
      setProductCounts((prev) => prev.filter((item) => item.id !== id));

      // Só tenta deletar do servidor se estiver no modo AUDIT
      if (mode === "audit") {
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
      }
    },
    [productCounts, currentSessionId, mode, lastFastCount], // Adicionado mode
  );

  const handleClearCountsOnly = useCallback(async () => {
    setProductCounts([]);
    setQuantityInput("");
    setLastFastCount(null);
    let confirmedClear = mode !== "audit";

    // Só limpa o servidor se for AUDIT
    if (mode === "audit") {
      try {
        if (navigator.onLine) {
          const res = await fetch("/api/inventory?scope=counts", {
            method: "DELETE",
          });

          if (!res.ok) throw new Error("Falha na API");
          confirmedClear = true;
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
    } else {
      // Se for IMPORT, só avisa que limpou local
      toast({
        title: "Contagens de importação limpas!",
      });
    }
    return confirmedClear;
  }, [mode]); // Adicionado mode

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
    isLoaded,
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
    canUndoFastCount: lastFastCount !== null,
    undoLastFastCount,
  };
};
