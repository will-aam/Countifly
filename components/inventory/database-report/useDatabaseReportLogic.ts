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
  // 0. FILTRO DE LIMPEZA (NOVO)
  // Remove tudo que não foi contado (Total = 0) antes de processar qualquer coisa
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Calcula o total real do item
      const qty =
        (Number(item.quant_loja) || 0) +
        (Number(item.quant_estoque) || 0) +
        (Number(item.quantity) || 0) +
        (Number(item.total) || 0); // Caso venha pré-calculado

      return qty > 0; // Só passa se tiver contagem
    });
  }, [items]);

  // 1. Lógica de Agrupamento (Usa filteredItems agora)
  const groupedItems = useMemo(() => {
    if (!config.groupByCategory) {
      return null;
    }

    const groups: Record<string, ProductCount[]> = {};

    filteredItems.forEach((item) => {
      const rawKey = item.categoria;
      const groupKey = rawKey && rawKey.trim() !== "" ? rawKey : "Geral";

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    // Ordenar itens dentro dos grupos
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.descricao.localeCompare(b.descricao));
    });

    return groups;
  }, [filteredItems, config.groupByCategory]);

  // 2. Cálculos Financeiros (Usa filteredItems agora)
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
    items: filteredItems, // Retorna a lista JÁ FILTRADA para o componente usar
    groupedItems,
    stats,
  };
};
