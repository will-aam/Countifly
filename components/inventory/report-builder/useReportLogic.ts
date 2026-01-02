// components/inventory/report-builder/useReportLogic.ts

import { useMemo } from "react";
import type { ProductCount } from "@/lib/types";
import type { ReportConfig } from "./types";

/**
 * Hook responsável por processar os dados brutos com base nos filtros visuais.
 * Separa a lógica de cálculo da interface do usuário.
 */
export const useReportLogic = (items: ProductCount[], config: ReportConfig) => {
  // 1. Filtra os itens conforme os switches (Switches de configuração)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const total = item.total ?? 0;

      const isCorrect = total === 0;
      const isSurplus = total > 0;
      const isMissing = total < 0;

      if (isCorrect && config.showCorrect) return true;
      if (isSurplus && config.showSurplus) return true;
      if (isMissing && config.showMissing) return true;

      return false;
    });
  }, [items, config.showCorrect, config.showSurplus, config.showMissing]);

  // 2. Calcula as estatísticas do relatório (Resumo Executivo)
  const stats = useMemo(() => {
    // Totais absolutos (soma das quantidades)
    const totalSystem = filteredItems.reduce(
      (acc, item) => acc + Number(item.saldo_estoque),
      0
    );
    const totalCounted = filteredItems.reduce(
      (acc, item) =>
        acc + (Number(item.quant_loja) + Number(item.quant_estoque)),
      0
    );

    // Divergência total (soma dos "total" de cada item)
    const totalDivergence = filteredItems.reduce(
      (acc, item) => acc + Number(item.total ?? 0),
      0
    );

    // Contagem de SKUs por tipo
    const itemsCorrect = filteredItems.filter(
      (i) => (i.total ?? 0) === 0
    ).length;
    const itemsSurplus = filteredItems.filter((i) => (i.total ?? 0) > 0).length;
    const itemsMissing = filteredItems.filter((i) => (i.total ?? 0) < 0).length;

    const skuCount = filteredItems.length;

    // Acuracidade baseada em % de SKUs corretos
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
