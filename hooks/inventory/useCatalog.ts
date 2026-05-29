// hooks/inventory/useCatalog.ts

"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { saveCatalogOffline, getCatalogOffline } from "@/lib/db";
import type { Product, BarCode } from "@/lib/types";

// --- ADAPTER (MAPEADOR UNIVERSAL) ---
// Converte os dados da NOSSA API DO CATÁLOGO GLOBAL para o formato do Countifly
const mapExternalDataToCatalog = (rawProductsList: any[]) => {
  const mappedProducts: Product[] = rawProductsList.map((item: any) => ({
    id: item.id,
    // Usamos o ID do banco global como código interno do produto
    codigo_produto: String(item.id),
    descricao: item.descricao || "Produto sem descrição",
    // O catálogo global não gere stock nem preço, entra tudo a zero para a auditoria
    saldo_estoque: 0,
    price: 0,
    tipo_cadastro: "CATALOGO_GLOBAL",
    categoria: item.categoria || "Geral",
    subcategoria: item.subcategoria || "",
    marca: item.marca || "",
  }));

  // Extrai o código de barras que vem direto da nossa API e cria a relação
  const mappedBarCodes: BarCode[] = rawProductsList
    .filter((item: any) => item.codigo_barras) // Garante que tem código
    .map((item: any) => ({
      codigo_de_barras: String(item.codigo_barras),
      produto_id: item.id,
    }));

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
  const [syncProgress, setSyncProgress] = useState(0); // Útil se quiser mostrar uma barra de progresso no futuro

  const loadCatalogFromDb = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSyncProgress(0);

    try {
      // URL base da sua API do Catálogo (Se estiver noutro servidor, coloque o link completo aqui)
      // Exemplo: const API_BASE_URL = "https://meu-catalogo-global.com.br";
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_CATALOG_API_URL || "http://localhost:3000";

      let allApiProducts: any[] = [];
      let currentPage = 1;
      let totalPages = 1;
      let hasMore = true;

      // O LOOP DE PAGINAÇÃO: Puxa os 46 mil itens de 500 em 500 para não travar a memória!
      while (hasMore) {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/produtos?page=${currentPage}&limit=500`,
          {
            headers: {
              // A nossa Chave de Segurança (Passo 3)
              "x-api-key":
                process.env.NEXT_PUBLIC_CATALOG_API_KEY ||
                "minha-chave-secreta",
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          if (response.status === 401 || response.status === 403)
            throw new Error("Chave de API inválida.");
          throw new Error("Falha de conexão com o Catálogo Global.");
        }

        const json = await response.json();

        // Junta os produtos novos com os que já baixamos
        allApiProducts = [...allApiProducts, ...json.dados];
        totalPages = json.meta.totalPages;

        // Atualiza o progresso (opcional, mas ótimo para UX)
        setSyncProgress(Math.round((currentPage / totalPages) * 100));

        if (currentPage >= totalPages) {
          hasMore = false; // Acabaram as páginas, sai do loop
        } else {
          currentPage++; // Vai buscar a próxima página
        }
      }

      // Passa as dezenas de milhares de itens pelo nosso Adapter
      const { products: apiProducts, barCodes: apiBarCodes } =
        mapExternalDataToCatalog(allApiProducts);

      setProducts(apiProducts);
      setBarCodes(apiBarCodes);

      // Salva no Cache Offline do dispositivo para o auditor usar sem internet
      saveCatalogOffline(apiProducts, apiBarCodes).catch((err) =>
        console.error("Erro ao salvar cache offline:", err),
      );
    } catch (error: any) {
      console.warn("Modo Offline ativado ou erro de rede:", error.message);

      // Fallback: Tenta puxar do Cache Offline
      try {
        const cachedData = await getCatalogOffline();

        if (cachedData.products.length > 0) {
          setProducts(cachedData.products);
          setBarCodes(cachedData.barcodes);

          toast({
            title: "Modo Offline 📡",
            description: "Catálogo carregado da memória do dispositivo.",
            variant: "default",
          });
        }
      } catch (dbError) {
        console.error("Banco offline vazio.");
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
    syncProgress, // Exportamos o progresso para você usar na UI se quiser!
  };
};
