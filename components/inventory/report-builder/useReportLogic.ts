// components/inventory/report-builder/useReportLogic.ts

import { useMemo } from "react";
import type { ProductCount } from "@/lib/types";
import type { ReportConfig } from "./types";

const safeNum = (val: any) => Number(val) || 0;

export const useReportLogic = (items: ProductCount[], config: ReportConfig) => {
  // 1. Filtra os itens
  const filteredItems = useMemo(() => {
    const base = items.filter((item) => {
      // --- LÓGICA NOVA DE FILTRO TEMP ---
      if (config.hideTempItems) {
        // Verifica se o código do produto ou de barras começa com TEMP-
        const codeProd = String(
          (item as any).codigo_produto || ""
        ).toUpperCase();
        const codeBar = String(item.codigo_de_barras || "").toUpperCase();

        if (codeProd.startsWith("TEMP-") || codeBar.startsWith("TEMP-")) {
          return false; // Remove da lista imediatamente
        }
      }
      // ----------------------------------

      // CÁLCULO REAL DA DIVERGÊNCIA
      const counted = safeNum(item.quant_loja) + safeNum(item.quant_estoque);
      const system = safeNum(item.saldo_estoque);
      const diff = counted - system;

      const isCorrect = diff === 0;
      const isSurplus = diff > 0;
      const isMissing = diff < 0;

      if (isCorrect && config.showCorrect) return true;
      if (isSurplus && config.showSurplus) return true;
      if (isMissing && config.showMissing) return true;

      return false;
    });

    if (!config.sortByBiggestError) {
      return base;
    }

    // Ordenação (mantida igual)
    const sorted = [...base].sort((a, b) => {
      const diffA =
        safeNum(a.quant_loja) +
        safeNum(a.quant_estoque) -
        safeNum(a.saldo_estoque);
      const diffB =
        safeNum(b.quant_loja) +
        safeNum(b.quant_estoque) -
        safeNum(b.saldo_estoque);

      const aNeg = diffA < 0;
      const bNeg = diffB < 0;
      const aPos = diffA > 0;
      const bPos = diffB > 0;

      if (aNeg && !bNeg) return -1;
      if (!aNeg && bNeg) return 1;
      if (aNeg && bNeg) return diffA - diffB;
      if (aPos && bPos) return diffB - diffA;
      return 0;
    });

    return sorted;
  }, [
    items,
    config.showCorrect,
    config.showSurplus,
    config.showMissing,
    config.sortByBiggestError,
    config.hideTempItems, // Adicionado na dependência
  ]);

  // 2. Calcula KPI's (O cálculo será feito APÓS a filtragem, então os TEMPs não contarão nos stats)
  const stats = useMemo(() => {
    let totalSystem = 0;
    let totalCounted = 0;
    let totalDivergence = 0;

    let itemsCorrect = 0;
    let itemsSurplus = 0;
    let itemsMissing = 0;

    filteredItems.forEach((item) => {
      const sys = safeNum(item.saldo_estoque);
      const cnt = safeNum(item.quant_loja) + safeNum(item.quant_estoque);
      const diff = cnt - sys;

      totalSystem += sys;
      totalCounted += cnt;
      totalDivergence += diff;

      if (diff === 0) itemsCorrect++;
      else if (diff > 0) itemsSurplus++;
      else itemsMissing++;
    });

    const skuCount = filteredItems.length;
    const accuracy =
      skuCount > 0 ? ((itemsCorrect / skuCount) * 100).toFixed(1) : "0";

    return {
      skuCount,
      totalSystem,
      totalCounted,
      totalDivergence,
      accuracy,
      itemsCorrect,
      itemsSurplus,
      itemsMissing,
    };
  }, [filteredItems]);

  return { filteredItems, stats };
};
