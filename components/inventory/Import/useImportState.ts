// app/components/inventory/Import/useImportState.ts
// Preciso apagar?
"use client";

import { useState, useCallback } from "react";
import type { Product } from "@/lib/types";

export interface ImportState {
  highlightedProductCodes: Set<string>;
  refreshHighlights: (
    previousProducts: Product[],
    nextProducts: Product[]
  ) => void;
  clearHighlights: () => void;
}

export const useImportState = (): ImportState => {
  const [highlightedProductCodes, setHighlightedProductCodes] = useState<
    Set<string>
  >(new Set());

  const refreshHighlights = useCallback(
    (previousProducts: Product[], nextProducts: Product[]) => {
      const prevMap = new Map<string, number>();

      // Mapeia Saldo Anterior
      previousProducts.forEach((p) => {
        if (p.codigo_produto) {
          prevMap.set(
            p.codigo_produto.toString(),
            Number(p.saldo_estoque || 0)
          );
        }
      });

      const changedCodes = new Set<string>();

      nextProducts.forEach((next) => {
        if (!next.codigo_produto) return;
        const code = next.codigo_produto.toString();

        // Se não existia antes (novo) OU se o saldo mudou (soma), destaca
        if (!prevMap.has(code)) {
          changedCodes.add(code);
        } else {
          const prevSaldo = prevMap.get(code);
          const nextSaldo = Number(next.saldo_estoque || 0);

          // Se o saldo mudou, adiciona ao destaque
          if (prevSaldo !== nextSaldo) {
            changedCodes.add(code);
          }
        }
      });

      setHighlightedProductCodes(changedCodes);

      // Remove o destaque amarelo após 10 segundos (opcional, para não ficar amarelo pra sempre)
      setTimeout(() => {
        setHighlightedProductCodes(new Set());
      }, 10000);
    },
    []
  );

  const clearHighlights = useCallback(() => {
    setHighlightedProductCodes(new Set());
  }, []);

  return {
    highlightedProductCodes,
    refreshHighlights,
    clearHighlights,
  };
};
