// hooks/inventory/useCatalog.ts

"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { saveCatalogOffline, getCatalogOffline } from "@/lib/db";
import type { Product, BarCode } from "@/lib/types";

const mapSingleItemToCatalog = (item: any): Product => {
  return {
    id: item.id,
    codigo_produto: String(item.id),
    descricao: item.descricao || "Produto sem descrição",
    saldo_estoque: 0,
    price: 0,
    tipo_cadastro: "CATALOGO_GLOBAL",
    categoria: item.categoria || "Geral",
    subcategoria: item.subcategoria || "",
    marca: item.marca || "",
  };
};

export const useCatalog = (
  userId: number | null,
  mode: "audit" | "import" = "import",
) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [barCodes, setBarCodes] = useState<BarCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. CARREGA IMPORTAÇÕES E ITENS FIXOS LOCAIS (FONTE PRIMÁRIA)
  const loadCatalogFromDb = useCallback(async () => {
    // A contagem livre consulta apenas o catálogo global. Não hidrata nem
    // expõe os produtos importados/FIXO que pertencem ao módulo de importação.
    if (mode === "audit") {
      setProducts([]);
      setBarCodes([]);
      setIsLoading(false);
      return;
    }

    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/inventory");

      if (!response.ok) throw new Error("Falha de conexão.");

      const rawData = await response.json();
      const apiProducts = rawData.products || [];
      const apiBarCodes = rawData.barCodes || [];

      setProducts(apiProducts);
      setBarCodes(apiBarCodes);

      saveCatalogOffline(apiProducts, apiBarCodes).catch(() => {});
    } catch (error: any) {
      try {
        const cachedData = await getCatalogOffline();
        if (cachedData.products.length > 0) {
          setProducts(cachedData.products);
          setBarCodes(cachedData.barcodes);
        }
      } catch (dbError) {}
    } finally {
      setIsLoading(false);
    }
  }, [userId, mode]);

  useEffect(() => {
    loadCatalogFromDb();
  }, [loadCatalogFromDb]);

  // 2. FUNÇÃO DE QUEDA (FALLBACK) PARA A BASE GLOBAL
  const searchProductOnline = useCallback(async (scannedBarcode: string) => {
    const response = await fetch(
      `/api/global-catalog?barcode=${encodeURIComponent(scannedBarcode)}`,
    );

    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Falha na consulta ao catálogo global.");

    const itemData = await response.json();
    if (!itemData) return null;

    return mapSingleItemToCatalog(itemData);
  }, []);

  return {
    products,
    setProducts,
    barCodes,
    setBarCodes,
    isLoading,
    setIsLoading,
    loadCatalogFromDb,
    searchProductOnline,
  };
};
