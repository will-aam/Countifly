/**
 * Descrição: Hook especializado para o modo "Colaborador" (Multiplayer) com Suporte Offline.
 */

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
    session: { id: number; codigo: string };
    participant: { id: number; nome: string };
  } | null;
}

const vibrateSuccess = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(200);
  }
};

const vibrateError = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }
};

export const useParticipantInventory = ({
  sessionData,
}: UseParticipantInventoryProps) => {
  // --- Integração com o Carteiro Silencioso ---
  // CORREÇÃO: Passamos o ID do participante como o userId para o hook de fila
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

  const loadSessionProducts = useCallback(async () => {
    if (!sessionData) return;

    try {
      const response = await fetch(
        `/api/session/${sessionData.session.id}/products`
      );

      if (response.status === 409) {
        setIsSessionFinalized(true);
        vibrateError();
        toast({
          title: "Sessão Encerrada",
          description: "O anfitrião finalizou esta contagem.",
          variant: "destructive",
        });
        throw new Error("SESSION_CLOSED");
      }

      if (!response.ok) throw new Error("Erro ao carregar produtos.");

      const data: ProductSessao[] = await response.json();
      setProducts(data);
      vibrateSuccess();

      const dbProducts = data.map((p) => ({
        id: parseInt(p.codigo_produto.replace(/\D/g, "") || "0"),
        codigo_produto: p.codigo_produto,
        descricao: p.descricao,
        saldo_estoque: p.saldo_sistema,
      }));

      const dbBarcodes = data.map((p) => ({
        codigo_de_barras: p.codigo_barras || p.codigo_produto,
        produto_id: parseInt(p.codigo_produto.replace(/\D/g, "") || "0"),
      }));

      saveCatalogOffline(dbProducts, dbBarcodes).catch(console.error);
    } catch (error: any) {
      if (error.message === "SESSION_CLOSED") return;

      const cached = await getCatalogOffline();
      if (cached.products.length > 0) {
        const restoredProducts: ProductSessao[] = cached.products.map((p) => {
          const bc = cached.barcodes.find(
            (b) =>
              b.produto_id === p.id || b.codigo_de_barras === p.codigo_produto
          );
          return {
            codigo_produto: p.codigo_produto,
            codigo_barras: bc?.codigo_de_barras || null,
            descricao: p.descricao,
            saldo_sistema: p.saldo_estoque,
            saldo_contado: 0,
          };
        });
        setProducts(restoredProducts);
        toast({
          title: "Modo Offline 📡",
          description: "Catálogo local carregado.",
        });
      }
    }
  }, [sessionData]);

  useEffect(() => {
    loadSessionProducts();
  }, [loadSessionProducts]);

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
      vibrateError();
      toast({ title: "Item não encontrado", variant: "destructive" });
      setCurrentProduct(null);
    }
  }, [scanInput, products]);

  const handleAddMovement = useCallback(
    async (qtd: number, tipo_local: "LOJA" | "ESTOQUE" = "LOJA") => {
      if (!currentProduct || !sessionData || isSessionFinalized) return;

      await addToQueue({
        codigo_barras:
          currentProduct.codigo_barras || currentProduct.codigo_produto,
        quantidade: qtd,
        timestamp: Date.now(),
        sessao_id: sessionData.session.id,
        participante_id: sessionData.participant.id,
        tipo_local: tipo_local,
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.codigo_produto === currentProduct.codigo_produto
            ? { ...p, saldo_contado: (p.saldo_contado || 0) + qtd }
            : p
        )
      );

      vibrateSuccess();
      toast({
        title: "Adicionado ✅",
        description: `${qtd} un. em ${tipo_local}`,
      });
      setScanInput("");
      setQuantityInput("");
      setCurrentProduct(null);
    },
    [currentProduct, sessionData, isSessionFinalized, addToQueue]
  );

  const handleRemoveMovement = useCallback(
    async (productCode: string) => {
      const product = products.find((p) => p.codigo_produto === productCode);
      if (
        !product ||
        (product.saldo_contado || 0) <= 0 ||
        !sessionData ||
        isSessionFinalized
      )
        return;

      await addToQueue({
        codigo_barras: product.codigo_barras || product.codigo_produto,
        quantidade: -1,
        timestamp: Date.now(),
        sessao_id: sessionData.session.id,
        participante_id: sessionData.participant.id,
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.codigo_produto === productCode
            ? { ...p, saldo_contado: Math.max(0, (p.saldo_contado || 0) - 1) }
            : p
        )
      );
      vibrateSuccess();
    },
    [products, sessionData, isSessionFinalized, addToQueue]
  );

  const handleResetItem = useCallback(
    async (productCode: string) => {
      const product = products.find((p) => p.codigo_produto === productCode);
      if (!product || !sessionData || isSessionFinalized) return;

      await addToQueue({
        codigo_barras: product.codigo_barras || product.codigo_produto,
        quantidade: -product.saldo_contado,
        timestamp: Date.now(),
        sessao_id: sessionData.session.id,
        participante_id: sessionData.participant.id,
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.codigo_produto === productCode ? { ...p, saldo_contado: 0 } : p
        )
      );
      vibrateSuccess();
    },
    [products, sessionData, isSessionFinalized, addToQueue]
  );

  useEffect(() => {
    if (isSessionFinalized) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") syncNow();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [syncNow, isSessionFinalized]);

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
