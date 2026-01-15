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
  // 1. Lógica de Agrupamento (Transforma Lista em Grupos)
  const groupedItems = useMemo(() => {
    // Se o botão de agrupar estiver desligado, retornamos null
    // (O frontend saberá que deve renderizar a lista plana)
    if (!config.groupByCategory) {
      return null;
    }

    // Cria o dicionário: { "Bebidas": [...], "Limpeza": [...] }
    const groups: Record<string, ProductCount[]> = {};

    items.forEach((item) => {
      // Define a chave do grupo. Se estiver vazio, joga em "Geral"
      const rawKey = item.categoria;
      const groupKey = rawKey && rawKey.trim() !== "" ? rawKey : "Geral";

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    // Opcional: Ordenar os itens dentro de cada grupo (por descrição)
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.descricao.localeCompare(b.descricao));
    });

    return groups;
  }, [items, config.groupByCategory]);

  // 2. Cálculos Financeiros (Valuation)
  // Nota: Os stats continuam sendo calculados sobre o total (items flat),
  // independente de como estão agrupados visualmente.
  const stats = useMemo(() => {
    let totalValue = 0;
    let totalCounted = 0;

    items.forEach((item) => {
      const qty = safeParseFloat(item.total || item.quantity || 0);
      const price = safeParseFloat(item.price);

      totalCounted += qty;
      totalValue += qty * price;
    });

    const skuCount = items.length;
    // Ticket Médio = Valor Total / Quantidade de Peças
    const averageTicket = totalCounted > 0 ? totalValue / totalCounted : 0;

    return {
      skuCount,
      totalCounted,
      totalValue,
      averageTicket,
    };
  }, [items]);

  return {
    items, // Lista original (para modo flat)
    groupedItems, // Lista agrupada (para modo categoria)
    stats,
  };
};
