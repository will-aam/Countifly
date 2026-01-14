// hooks/inventory/useCatalog.ts
/**
 * Descrição: Hook responsável pelo Catálogo de Produtos (Com suporte Offline).
 * Responsabilidade:
 * 1. Buscar dados do servidor (Online).
 * 2. Salvar cache no IndexedDB para uso offline.
 * 3. Recuperar do cache se a rede falhar.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { saveCatalogOffline, getCatalogOffline } from "@/lib/db";
import type { Product, BarCode } from "@/lib/types";

export const useCatalog = (userId: number | null) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [barCodes, setBarCodes] = useState<BarCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Carrega o catálogo. Tenta Rede -> Falha -> Tenta Cache.
   */
  const loadCatalogFromDb = useCallback(async () => {
    // Mantemos a verificação do userId para garantir sessão
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // 1. Tenta buscar do Servidor (Online)
      const response = await fetch("/api/inventory");

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Sessão expirada.");
        }
        throw new Error("Falha de conexão com o servidor.");
      }

      const data = await response.json();

      const serverProducts = data.products || [];
      const serverBarCodes = data.barCodes || [];

      setProducts(serverProducts);
      setBarCodes(serverBarCodes);

      // 2. Salva no Cache Offline (IndexedDB) para o futuro
      saveCatalogOffline(serverProducts, serverBarCodes)
        .then(() => console.log("📦 Catálogo salvo offline com sucesso."))
        .catch((err) => console.error("Erro ao salvar cache offline:", err));
    } catch (error: any) {
      console.warn("⚠️ Erro de rede/servidor. Tentando cache offline...");

      // 3. Fallback: Tenta carregar do Cache Offline (IndexedDB)
      try {
        const cachedData = await getCatalogOffline();

        if (cachedData.products.length > 0) {
          setProducts(cachedData.products);
          setBarCodes(cachedData.barcodes);

          toast({
            title: "Modo Offline Ativo 📡",
            description: "Carregamos o catálogo salvo no seu dispositivo.",
            variant: "default",
          });
        } else {
          // Se não tem cache e não tem internet
          throw new Error("Sem internet e sem dados salvos.");
        }
      } catch (dbError) {
        // Silencioso se for erro de sessão, barulhento se for erro real
        if (!error.message.includes("Sessão")) {
          toast({
            title: "Erro de Conexão",
            description: "Não foi possível carregar o catálogo.",
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCatalogFromDb();
  }, [loadCatalogFromDb]);

  return {
    products,
    setProducts,
    barCodes,
    setBarCodes,
    isLoading,
    setIsLoading,
    loadCatalogFromDb,
  };
};
