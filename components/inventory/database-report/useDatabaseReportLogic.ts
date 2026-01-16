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
  config: DatabaseReportConfig
) => {
  // 0. FILTRO DE LIMPEZA
  // Remove tudo que não foi contado (Total = 0)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const qty =
        (Number(item.quant_loja) || 0) +
        (Number(item.quant_estoque) || 0) +
        (Number(item.quantity) || 0) +
        (Number(item.total) || 0);

      return qty > 0;
    });
  }, [items]);

  // 1. Lógica de Agrupamento Dinâmica (Categoria OU Subcategoria)
  const groupedItems = useMemo(() => {
    // Define qual chave usar para agrupar.
    // Prioridade: Se Subcategoria estiver ativa, usa ela. Senão, tenta Categoria.
    let groupKeyProp: "categoria" | "subcategoria" | null = null;

    if (config.groupBySubCategory) {
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
      // Pega o valor da chave (ex: "Bebidas" ou "Refrigerantes")
      const rawKey = item[groupKeyProp];

      // Se estiver vazio, joga em "Geral" ou "Sem Subcategoria"
      const fallbackName =
        groupKeyProp === "categoria" ? "Geral" : "Sem Subcategoria";
      const groupLabel = rawKey && rawKey.trim() !== "" ? rawKey : fallbackName;

      if (!groups[groupLabel]) {
        groups[groupLabel] = [];
      }
      groups[groupLabel].push(item);
    });

    // Ordenar itens dentro de cada grupo por descrição
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.descricao.localeCompare(b.descricao));
    });

    return groups;
  }, [filteredItems, config.groupByCategory, config.groupBySubCategory]);

  // 2. Cálculos Financeiros (Estatísticas Gerais)
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
  };
};
