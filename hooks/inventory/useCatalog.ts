// hooks/inventory/useCatalog.ts

"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { saveCatalogOffline, getCatalogOffline } from "@/lib/db";
import type { Product, BarCode } from "@/lib/types";

// --- ADAPTER (MAPEADOR UNIVERSAL) ---
// Esta função converte a resposta da sua NOVA API para o formato que o Countifly espera.
// Assim, o resto do sistema (relatórios, scanner, contagem) nunca vai quebrar!
const mapExternalDataToCatalog = (externalData: any) => {
  // AQUI VOCÊ VAI ADAPTAR QUANDO SUA API ESTIVER PRONTA.
  // Exemplo: Se sua API retornar { produtos_externos: [...] }
  const rawProductsList =
    externalData.products ||
    externalData.produtos_externos ||
    externalData.itens ||
    [];

  const mappedProducts: Product[] = rawProductsList.map(
    (item: any, index: number) => ({
      // Se a API não mandar um ID, criamos um numérico baseado no index
      id: item.id || index + 1,
      // Adaptação dos nomes dos campos (O lado esquerdo é como o sistema quer, o direito é o que vem da API)
      codigo_produto:
        item.codigo_produto ||
        item.cod_interno ||
        item.sku ||
        String(item.id || "SEM-COD"),
      descricao: item.descricao || item.nome || item.name || "Produto sem nome",
      saldo_estoque: Number(
        item.saldo_estoque || item.estoque || item.stock || 0,
      ),
      tipo_cadastro: item.tipo_cadastro || "API_EXTERNA", // Identificador para sabermos a origem
      price: Number(item.price || item.preco_venda || item.valor || 0),
      categoria: item.categoria || item.category || "Geral",
      subcategoria: item.subcategoria || item.subcategory || "",
      marca: item.marca || item.brand || "",
    }),
  );

  // Construção da lista de Códigos de Barras
  const mappedBarCodes: BarCode[] = [];

  // Se a sua API já devolver a lista separada (como é hoje), usamos ela:
  if (externalData.barCodes && Array.isArray(externalData.barCodes)) {
    mappedBarCodes.push(...externalData.barCodes);
  } else {
    // Se a sua API devolver o código de barras DENTRO do objeto do produto (que é o mais comum em APIs),
    // o Adapter extrai e constrói a relação automaticamente para o Countifly:
    rawProductsList.forEach((item: any, index: number) => {
      const productId = item.id || index + 1;
      const ean =
        item.codigo_de_barras || item.ean || item.barcode || item.gtin;

      if (ean) {
        mappedBarCodes.push({
          codigo_de_barras: String(ean),
          produto_id: productId,
        });
      }
    });
  }

  return {
    products: mappedProducts,
    barCodes: mappedBarCodes,
  };
};
// ------------------------------------

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
      // 1. TENTA BUSCAR DA API
      // ---> QUANDO SUA API ESTIVER PRONTA, TROQUE ESTA URL <---
      // Ex: const response = await fetch("https://sua-api.com.br/v1/produtos");
      const response = await fetch("/api/inventory");

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Sessão expirada.");
        }
        throw new Error("Falha de conexão com o servidor/API.");
      }

      const rawData = await response.json();

      // 2. PASSA OS DADOS PELO ADAPTER (A mágica acontece aqui)
      const { products: apiProducts, barCodes: apiBarCodes } =
        mapExternalDataToCatalog(rawData);

      setProducts(apiProducts);
      setBarCodes(apiBarCodes);

      // 3. Salva no Cache Offline do dispositivo
      saveCatalogOffline(apiProducts, apiBarCodes).catch((err) =>
        console.error("Erro ao salvar cache offline:", err),
      );
    } catch (error: any) {
      console.warn("Modo Offline ativado ou erro de rede.");

      // Fallback: Cache Offline
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
