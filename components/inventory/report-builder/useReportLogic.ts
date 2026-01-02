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
    const base = items.filter((item) => {
      const total = item.total ?? 0;

      const isCorrect = total === 0;
      const isSurplus = total > 0;
      const isMissing = total < 0;

      if (isCorrect && config.showCorrect) return true;
      if (isSurplus && config.showSurplus) return true;
      if (isMissing && config.showMissing) return true;

      return false;
    });

    if (!config.sortByBiggestError) {
      return base;
    }

    // Ordenação focada em FALTAS primeiro:
    // 1) Todos negativos (maior falta no topo: -500, -300, -10, -1)
    // 2) Depois positivos (maior sobra no topo: +500, +300, +10, +1)
    // 3) Por fim zeros (se aparecerem, geralmente você nem mostra corretos quando está caçando erro)
    const sorted = [...base].sort((a, b) => {
      const ta = Number(a.total ?? 0);
      const tb = Number(b.total ?? 0);

      const aNeg = ta < 0;
      const bNeg = tb < 0;
      const aPos = ta > 0;
      const bPos = tb > 0;

      // 1) Negativos primeiro
      if (aNeg && !bNeg) return -1;
      if (!aNeg && bNeg) return 1;

      // 2) Se ambos negativos: ordenar do mais negativo para o menos negativo
      if (aNeg && bNeg) {
        // ta = -500, tb = -300 -> queremos -500 antes de -300
        return ta - tb; // mais negativo (menor valor) vem primeiro
      }

      // 3) Se ambos positivos: maior positivo primeiro
      if (aPos && bPos) {
        return tb - ta; // 500 vem antes de 300
      }

      // 4) Se chegamos aqui, um deles é zero:
      // - Negativos já tratados acima
      // - Positivos já tratados acima
      // Vamos jogar zeros para o final
      if (ta === 0 && tb !== 0) return 1;
      if (tb === 0 && ta !== 0) return -1;

      return 0;
    });

    return sorted;
  }, [
    items,
    config.showCorrect,
    config.showSurplus,
    config.showMissing,
    config.sortByBiggestError,
  ]);

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
