// components/inventory/database-report/useDatabaseReportLogic.ts

import { useMemo } from "react";
import type { ProductCount } from "@/lib/types";
import type { DatabaseReportConfig } from "./types";

const safeParseFloat = (val: any) => {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const strVal = String(val).trim().replace(/\./g, "").replace(",", ".");
  const num = parseFloat(strVal);
  return isNaN(num) ? 0 : num;
};

export const useDatabaseReportLogic = (
  items: ProductCount[],
  config: DatabaseReportConfig,
) => {
  // 1. Extrair Listas de Opções para os Filtros
  const availableCategories = useMemo(() => {
    const cats = new Set(items.map((i) => i.categoria || "Geral"));
    return Array.from(cats).sort();
  }, [items]);

  const availableSubcategories = useMemo(() => {
    const subs = new Set(
      items.map((i) => i.subcategoria || "Sem Subcategoria"),
    );
    return Array.from(subs).sort();
  }, [items]);

  // 2. FILTRO PRINCIPAL
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // ✅ A. Filtro de Itens Temporários (NOVO - Deve vir primeiro)
      if (config.hideTempItems) {
        const codeProd = String(
          (item as any).codigo_produto || "",
        ).toUpperCase();
        const codeBar = String(item.codigo_de_barras || "").toUpperCase();

        if (codeProd.startsWith("TEMP-") || codeBar.startsWith("TEMP-")) {
          return false; // Remove itens temporários
        }
      }
      // -----------------------------------------------

      // B. Filtro de Quantidade (Limpeza)
      const qty =
        (Number(item.quant_loja) || 0) +
        (Number(item.quant_estoque) || 0) +
        (Number(item.quantity) || 0) +
        (Number(item.total) || 0);

      if (qty <= 0) return false;

      // C. Filtro de Categoria
      if (
        config.groupByCategory &&
        config.selectedCategories &&
        config.selectedCategories.length > 0
      ) {
        const cat = item.categoria || "Geral";
        if (!config.selectedCategories.includes(cat)) return false;
      }

      // D. Filtro de Subcategoria
      if (
        config.groupBySubcategory &&
        config.selectedSubcategories &&
        config.selectedSubcategories.length > 0
      ) {
        const sub = item.subcategoria || "Sem Subcategoria";
        if (!config.selectedSubcategories.includes(sub)) return false;
      }

      return true;
    });
  }, [
    items,
    config.hideTempItems, // ✅ ADICIONADO
    config.groupByCategory,
    config.groupBySubcategory,
    config.selectedCategories,
    config.selectedSubcategories,
  ]);

  // 3. Lógica de Agrupamento Dinâmica
  const groupedItems = useMemo(() => {
    let groupKeyProp: "categoria" | "subcategoria" | null = null;

    if (config.groupBySubcategory) {
      groupKeyProp = "subcategoria";
    } else if (config.groupByCategory) {
      groupKeyProp = "categoria";
    }

    if (!groupKeyProp) {
      return null;
    }

    const groups: Record<string, ProductCount[]> = {};

    filteredItems.forEach((item) => {
      const rawKey = item[groupKeyProp as keyof ProductCount];
      const fallbackName =
        groupKeyProp === "categoria" ? "Geral" : "Sem Subcategoria";
      const groupLabel =
        typeof rawKey === "string" && rawKey.trim() !== ""
          ? rawKey
          : fallbackName;

      if (!groups[groupLabel]) {
        groups[groupLabel] = [];
      }
      groups[groupLabel].push(item);
    });

    // Ordenar itens dentro de cada grupo
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.descricao.localeCompare(b.descricao));
    });

    return groups;
  }, [filteredItems, config.groupByCategory, config.groupBySubcategory]);

  // 4. Estatísticas Gerais
  const stats = useMemo(() => {
    let totalValue = 0;
    let totalCounted = 0;

    filteredItems.forEach((item) => {
      const qty =
        (Number(item.quant_loja) || 0) +
        (Number(item.quant_estoque) || 0) +
        (Number(item.quantity) || 0) +
        (Number(item.total) || 0);

      const price = safeParseFloat(item.price);

      totalCounted += qty;
      totalValue += qty * price;
    });

    const skuCount = filteredItems.length;
    const averageTicket = totalCounted > 0 ? totalValue / totalCounted : 0;

    return {
      skuCount,
      totalCounted,
      totalValue,
      averageTicket,
    };
  }, [filteredItems]);

  // 5. NOVO: Resumo Estruturado dos Grupos (Para o modo "Show Only Summary")
  // Isso facilita muito a criação da tabela resumida no Preview
  const groupSummaries = useMemo(() => {
    if (!groupedItems) return [];

    const totalGrandValue = stats.totalValue || 1; // Evita divisão por zero

    // Gera um array com os totais de cada grupo
    return Object.entries(groupedItems)
      .map(([groupName, groupItems]) => {
        let gQty = 0;
        let gValue = 0;

        groupItems.forEach((item) => {
          const qty =
            (Number(item.quant_loja) || 0) +
            (Number(item.quant_estoque) || 0) +
            (Number(item.quantity) || 0) +
            (Number(item.total) || 0);
          const price = safeParseFloat(item.price);

          gQty += qty;
          gValue += qty * price;
        });

        return {
          name: groupName,
          skuCount: groupItems.length,
          totalQuantity: gQty,
          totalValue: gValue,
          percentage: (gValue / totalGrandValue) * 100,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)); // Ordena por nome do grupo
  }, [groupedItems, stats.totalValue]);

  return {
    items: filteredItems,
    groupedItems,
    groupSummaries, // <--- Exportado novo dado
    stats,
    availableCategories,
    availableSubcategories,
  };
};
