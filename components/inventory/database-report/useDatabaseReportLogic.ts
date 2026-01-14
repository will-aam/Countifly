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
  // 1. Processamento e Filtros (se houver no futuro)
  // Por enquanto, apenas repassa, mas já deixa o gancho pronto para ordenação/filtro
  const processedItems = useMemo(() => {
    return items;
  }, [items]);

  // 2. Cálculos Financeiros (Valuation)
  const stats = useMemo(() => {
    let totalValue = 0;
    let totalCounted = 0;

    processedItems.forEach((item) => {
      const qty = safeParseFloat(item.total || item.quantity || 0);
      const price = safeParseFloat(item.price);

      totalCounted += qty;
      totalValue += qty * price;
    });

    const skuCount = processedItems.length;
    // Ticket Médio = Valor Total / Quantidade de Peças
    const averageTicket = totalCounted > 0 ? totalValue / totalCounted : 0;

    return {
      skuCount,
      totalCounted,
      totalValue,
      averageTicket,
    };
  }, [processedItems]);

  return {
    items: processedItems,
    stats,
  };
};
