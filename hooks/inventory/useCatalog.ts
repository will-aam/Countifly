// hooks/inventory/useCatalog.ts

"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { saveCatalogOffline, getCatalogOffline } from "@/lib/db";
import type { Product, BarCode } from "@/lib/types";

const mapSingleItemToCatalog = (item: any) => {
  const product: Product = {
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

  const barCode: BarCode = {
    codigo_de_barras: String(item.codigo_barras),
    produto_id: item.id,
    produto: product, // Previne o loop infinito
  };

  return { product, barCode };
};

export const useCatalog = (userId: number | null) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [barCodes, setBarCodes] = useState<BarCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. CARREGA IMPORTAÇÕES E ITENS FIXOS LOCAIS (FONTE PRIMÁRIA)
  const loadCatalogFromDb = useCallback(async () => {
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
  }, [userId]);

  useEffect(() => {
    loadCatalogFromDb();
  }, [loadCatalogFromDb]);

  // 2. FUNÇÃO DE QUEDA (FALLBACK) PARA A BASE GLOBAL
  const searchProductOnline = useCallback(async (scannedBarcode: string) => {
    try {
      const response = await fetch(
        `/api/global-catalog?barcode=${scannedBarcode}`,
      );

      if (!response.ok) return null;

      const itemData = await response.json();
      if (!itemData) return null;

      const { product, barCode } = mapSingleItemToCatalog(itemData);

      setProducts((prev) => {
        if (!prev.some((p) => p.id === product.id)) return [...prev, product];
        return prev;
      });

      setBarCodes((prev) => {
        if (!prev.some((b) => b.codigo_de_barras === barCode.codigo_de_barras))
          return [...prev, barCode];
        return prev;
      });

      saveCatalogOffline([product], [barCode]).catch(() => {});

      return product;
    } catch (error) {
      return null;
    }
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
