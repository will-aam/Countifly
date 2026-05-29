// hooks/inventory/useCatalog.ts

"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { saveCatalogOffline, getCatalogOffline } from "@/lib/db";
import type { Product, BarCode } from "@/lib/types";

// --- ADAPTER (MAPEADOR UNIVERSAL) ---
// Adapta UM ÚNICO item vindo do banco global para o formato do Countifly
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
    produto: product, // <--- A CORREÇÃO DO LOOP ESTÁ AQUI! (Grudamos o produto no código)
  };

  return { product, barCode };
};
// ------------------------------------

export const useCatalog = (userId: number | null) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [barCodes, setBarCodes] = useState<BarCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Agora isso apenas carrega os itens que o usuário JÁ bipou e ficaram em cache
  const loadCatalogFromDb = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const cachedData = await getCatalogOffline();
      if (cachedData.products.length > 0) {
        setProducts(cachedData.products);
        setBarCodes(cachedData.barcodes);
      }
    } catch (dbError) {
      console.error("Cache offline vazio.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCatalogFromDb();
  }, [loadCatalogFromDb]);

  // --- NOVA FUNÇÃO: BUSCA INSTANTÂNEA NO BANCO NEON ---
  // useCallback adicionado para travar a Fuga de Efeito no React
  const searchProductOnline = useCallback(async (scannedBarcode: string) => {
    try {
      // Bate numa rota ultra-rápida interna que conecta direto no Neon
      const response = await fetch(
        `/api/global-catalog?barcode=${scannedBarcode}`,
      );

      if (!response.ok) return null;

      const itemData = await response.json();
      if (!itemData) return null; // Não achou no banco

      // Formata os dados
      const { product, barCode } = mapSingleItemToCatalog(itemData);

      // Injeta no estado local
      setProducts((prev) => {
        if (!prev.some((p) => p.id === product.id)) return [...prev, product];
        return prev;
      });

      setBarCodes((prev) => {
        if (!prev.some((b) => b.codigo_de_barras === barCode.codigo_de_barras))
          return [...prev, barCode];
        return prev;
      });

      // Atualiza o cache do celular silenciosamente
      saveCatalogOffline([product], [barCode]).catch(() => {});

      return product;
    } catch (error) {
      console.error("Erro ao buscar produto online:", error);
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
