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
  // 1. Extrair Listas de Opções para os Filtros (Unique values)
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

  // 2. FILTRO PRINCIPAL (Limpeza + Seleção do Usuário)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // A. Filtro de Quantidade (Limpeza)
      const qty =
        (Number(item.quant_loja) || 0) +
        (Number(item.quant_estoque) || 0) +
        (Number(item.quantity) || 0) +
        (Number(item.total) || 0);

      if (qty <= 0) return false;

      // B. Filtro de Categoria (Excel Style)
      // Só aplica se o agrupamento estiver ativo E houver uma lista de seleção definida
      if (
        config.groupByCategory &&
        config.selectedCategories &&
        config.selectedCategories.length > 0
      ) {
        const cat = item.categoria || "Geral";
        // Se a categoria do item NÃO estiver na lista de selecionados, remove.
        if (!config.selectedCategories.includes(cat)) return false;
      }

      // C. Filtro de Subcategoria (Excel Style)
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
    config.groupByCategory,
    config.groupBySubcategory,
    config.selectedCategories,
    config.selectedSubcategories,
  ]);

  // 3. Lógica de Agrupamento Dinâmica
  const groupedItems = useMemo(() => {
    // Prioridade: Subcategoria > Categoria
    let groupKeyProp: "categoria" | "subcategoria" | null = null;

    if (config.groupBySubcategory) {
      groupKeyProp = "subcategoria";
    } else if (config.groupByCategory) {
      groupKeyProp = "categoria";
    }

    // Se nenhum agrupamento estiver ativo, retorna null (lista plana)
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

  // 4. Estatísticas (Baseadas nos itens filtrados)
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

  return {
    items: filteredItems,
    groupedItems,
    stats,
    availableCategories, // Exportado para o Painel usar
    availableSubcategories, // Exportado para o Painel usar
  };
};
