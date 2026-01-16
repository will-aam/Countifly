// hooks/inventory/useCatalog.ts

"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { saveCatalogOffline, getCatalogOffline } from "@/lib/db";
import type { Product, BarCode } from "@/lib/types";

export const useCatalog = (userId: number | null) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [barCodes, setBarCodes] = useState<BarCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCatalogFromDb = useCallback(async () => {
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

      // 2. Salva no Cache Offline
      saveCatalogOffline(serverProducts, serverBarCodes).catch((err) =>
        console.error("Erro ao salvar cache offline:", err)
      );
    } catch (error: any) {
      // Silencia avisos normais de rede, só avisa se for crítico
      console.warn("Modo Offline ativado ou erro de rede.");

      // 3. Fallback: Cache Offline
      try {
        const cachedData = await getCatalogOffline();

        if (cachedData.products.length > 0) {
          setProducts(cachedData.products);
          setBarCodes(cachedData.barcodes);

          toast({
            title: "Modo Offline 📡",
            description: "Catálogo carregado do dispositivo.",
            variant: "default",
          });
        }
      } catch (dbError) {
        // Silencioso
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
