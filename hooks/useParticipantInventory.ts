// hooks/useParticipantInventory.ts
// Responsabilidade:
// 1. Gerenciar o estado do inventário para um participante específico.
// 2. Fornecer ações para registrar movimentos de contagem (adição, remoção, reset).
// 3. Sincronizar os dados com o backend e lidar com estados de sincronização.

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

export const useParticipantInventory = ({
  sessionData,
}: UseParticipantInventoryProps) => {
  const { addToQueue, queueSize, isSyncing, syncNow } = useSyncQueue(
    sessionData?.participant.id,
  );

  const [products, setProducts] = useState<ProductSessao[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("");
  const [currentProduct, setCurrentProduct] = useState<ProductSessao | null>(
    null,
  );
  const [isSessionFinalized, setIsSessionFinalized] = useState(false);

  // --- 1. CARGA E SINCRONIZAÇÃO (Polling) ---
  const loadSessionProducts = useCallback(
    async (isPoll = false) => {
      if (!sessionData || isSessionFinalized) return;

      try {
        const response = await fetch(
          `/api/session/${sessionData.session.id}/products`,
        );

        // Detecta se a sessão foi fechada pelo gestor (Status 409 Conflict)
        if (response.status === 409) {
          setIsSessionFinalized(true);
          return;
        }

        if (!response.ok) throw new Error("Erro ao sincronizar");

        const data: ProductSessao[] = await response.json();

        // Atualiza o estado com os totais somados de TODOS os participantes (Multiplayer)
        setProducts(data);

        if (!isPoll) {
          // Persiste cache local apenas na primeira carga
          const dbProducts = data.map((p) => ({
            id: parseInt(p.codigo_produto.replace(/\D/g, "") || "0"),
            codigo_produto: p.codigo_produto,
            descricao: p.descricao,
            saldo_estoque: p.saldo_sistema,
          }));
          saveCatalogOffline(dbProducts, []).catch(() => {});
        }
      } catch (error) {
        if (!isPoll) {
          const cached = await getCatalogOffline();
          if (cached.products.length > 0) {
            setProducts(
              cached.products.map((p) => ({
                codigo_produto: p.codigo_produto,
                codigo_barras: null,
                descricao: p.descricao,
                saldo_sistema: p.saldo_estoque,
                saldo_contado: 0,
              })),
            );
          }
        }
      }
    },
    [sessionData, isSessionFinalized],
  );

  // EFEITO MULTIPLAYER: Atualiza os dados a cada 5 segundos
  useEffect(() => {
    loadSessionProducts();
    const interval = setInterval(() => {
      // Só sincroniza se não estivermos a enviar dados no momento para evitar conflitos de UI
      if (!isSyncing) loadSessionProducts(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [loadSessionProducts, isSyncing]);

  // --- 2. AÇÕES ---
  const handleScan = useCallback(() => {
    if (!scanInput) return;
    const code = scanInput.trim();
    const product = products.find(
      (p) =>
        areBarcodesEqual(p.codigo_barras || "", code) ||
        areBarcodesEqual(p.codigo_produto, code),
    );

    if (product) {
      setCurrentProduct(product);
    } else {
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
        tipo_local,
      });

      // UI Otimista: Soma no local imediatamente
      setProducts((prev) =>
        prev.map((p) =>
          p.codigo_produto === currentProduct.codigo_produto
            ? { ...p, saldo_contado: (p.saldo_contado || 0) + qtd }
            : p,
        ),
      );

      setScanInput("");
      setQuantityInput("");
      setCurrentProduct(null);
      toast({ title: "Registado ✅" });
    },
    [currentProduct, sessionData, isSessionFinalized, addToQueue],
  );

  const handleRemoveMovement = (code: string) => handleAddMovement(-1, "LOJA");
  const handleResetItem = (code: string) => {
    const p = products.find((x) => x.codigo_produto === code);
    if (p) handleAddMovement(-p.saldo_contado, "LOJA");
  };

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
