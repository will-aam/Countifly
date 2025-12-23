// hooks/useParticipantInventory.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { areBarcodesEqual } from "@/lib/utils";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { saveCatalogOffline, getCatalogOffline } from "@/lib/db";

interface ProductSessao {
  codigo_produto: string;
  codigo_barras: string | null;
  descricao: string;
  saldo_sistema: number;
  saldo_contado: number;
}

interface UseParticipantInventoryProps {
  sessionData: {
    session: { id: number; codigo: string; nome: string };
    participant: { id: number; nome: string };
  } | null;
}

const vibrateSuccess = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate)
    navigator.vibrate(200);
};

export const useParticipantInventory = ({
  sessionData,
}: UseParticipantInventoryProps) => {
  // Conecta com a fila de sincronização
  const { addToQueue, queueSize, isSyncing, syncNow } = useSyncQueue(
    sessionData?.participant.id
  );

  const [products, setProducts] = useState<ProductSessao[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [currentProduct, setCurrentProduct] = useState<ProductSessao | null>(
    null
  );
  const [isSessionFinalized, setIsSessionFinalized] = useState(false);

  // 1. CARGA DE PRODUTOS (Sistema)
  const loadSessionProducts = useCallback(async () => {
    if (!sessionData) return;

    try {
      const response = await fetch(
        `/api/session/${sessionData.session.id}/products`
      );

      if (response.status === 409) {
        setIsSessionFinalized(true);
        toast({ title: "Sessão Encerrada", variant: "destructive" });
        return;
      }

      if (!response.ok) throw new Error("Erro na rede");

      const data: ProductSessao[] = await response.json();
      setProducts(data);

      // Persistência local do catálogo (Sistema)
      const dbProducts = data.map((p) => ({
        id: parseInt(p.codigo_produto.replace(/\D/g, "") || "0"),
        codigo_produto: p.codigo_produto,
        descricao: p.descricao,
        saldo_estoque: p.saldo_sistema, // Campo do sistema
      }));

      const dbBarcodes = data.map((p) => ({
        codigo_de_barras: p.codigo_barras || p.codigo_produto,
        produto_id: parseInt(p.codigo_produto.replace(/\D/g, "") || "0"),
      }));

      await saveCatalogOffline(dbProducts, dbBarcodes);
    } catch (error) {
      console.warn("Offline: Carregando cache local...");
      const cached = await getCatalogOffline();
      if (cached.products.length > 0) {
        const restored = cached.products.map((p) => {
          const bc = cached.barcodes.find((b) => b.produto_id === p.id);
          return {
            codigo_produto: p.codigo_produto,
            codigo_barras: bc?.codigo_de_barras || null,
            descricao: p.descricao,
            saldo_sistema: p.saldo_estoque, // Restaura saldo do sistema do cache
            saldo_contado: 0,
          };
        });
        setProducts(restored);
      }
    }
  }, [sessionData]);

  useEffect(() => {
    loadSessionProducts();
  }, [loadSessionProducts]);

  // 2. LÓGICA DE ESCANEAMENTO
  const handleScan = useCallback(() => {
    if (!scanInput) return;
    const code = scanInput.trim();
    const product = products.find(
      (p) =>
        areBarcodesEqual(p.codigo_barras || "", code) ||
        areBarcodesEqual(p.codigo_produto, code)
    );

    if (product) {
      setCurrentProduct(product);
      vibrateSuccess();
    } else {
      toast({ title: "Item não encontrado", variant: "destructive" });
      setCurrentProduct(null);
    }
  }, [scanInput, products]);

  // 3. ADICIONAR MOVIMENTO
  const handleAddMovement = useCallback(
    async (qtd: number, tipo_local: "LOJA" | "ESTOQUE" = "LOJA") => {
      if (!currentProduct || !sessionData || isSessionFinalized) return;

      // Envia para a fila (background)
      await addToQueue({
        codigo_barras:
          currentProduct.codigo_barras || currentProduct.codigo_produto,
        quantidade: qtd,
        timestamp: Date.now(),
        sessao_id: sessionData.session.id,
        participante_id: sessionData.participant.id,
        tipo_local: tipo_local,
      });

      // UI Otimista: Atualiza a lista na tela imediatamente
      setProducts((prev) =>
        prev.map((p) =>
          p.codigo_produto === currentProduct.codigo_produto
            ? { ...p, saldo_contado: (p.saldo_contado || 0) + qtd }
            : p
        )
      );

      toast({ title: `Adicionado: ${qtd} em ${tipo_local}` });
      setScanInput("");
      setQuantityInput("");
      setCurrentProduct(null);
    },
    [currentProduct, sessionData, isSessionFinalized, addToQueue]
  );

  const handleRemoveMovement = useCallback(
    async (productCode: string) => {
      const product = products.find((p) => p.codigo_produto === productCode);
      if (!product || !sessionData) return;
      await handleAddMovement(-1, "LOJA"); // Simplificado para correção
    },
    [products, sessionData, handleAddMovement]
  );

  const handleResetItem = useCallback(
    async (productCode: string) => {
      const product = products.find((p) => p.codigo_produto === productCode);
      if (!product || !sessionData) return;
      await handleAddMovement(-product.saldo_contado, "LOJA");
    },
    [products, sessionData, handleAddMovement]
  );

  const missingItems = useMemo(() => {
    return products
      .filter((p) => p.saldo_contado === 0)
      .map((p) => ({
        codigo_de_barras: p.codigo_barras || p.codigo_produto,
        descricao: p.descricao,
        faltante: p.saldo_sistema,
      }));
  }, [products]);

  return {
    products,
    queueSize,
    isSyncing,
    missingItems,
    isSessionFinalized,
    scanInput,
    setScanInput,
    quantityInput,
    setQuantityInput,
    currentProduct,
    handleScan,
    handleAddMovement,
    handleRemoveMovement,
    handleResetItem,
    forceSync: syncNow,
  };
};
