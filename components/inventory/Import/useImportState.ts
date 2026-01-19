// app/components/inventory/Import/useImportState.ts
"use client";

import { useState, useRef, useCallback } from "react";
import type { Product } from "@/lib/types";

export interface ImportState {
  modifiedProductCodes: Set<string>;
  captureSnapshot: (products: Product[]) => void;
  detectChanges: (newProducts: Product[]) => void;
  clearHighlights: () => void;
}

export const useImportState = (): ImportState => {
  const [modifiedProductCodes, setModifiedProductCodes] = useState<Set<string>>(
    new Set(),
  );

  // Snapshot para guardar o estado ANTES da importação
  const preImportSnapshot = useRef<Map<string, number>>(new Map());

  // Passo 1: Tira a foto dos estoques atuais
  const captureSnapshot = useCallback((products: Product[]) => {
    const snapshot = new Map<string, number>();
    products.forEach((p) => {
      // Ignora itens fixos no snapshot
      if (p.tipo_cadastro === "FIXO") return;

      if (p.codigo_produto) {
        snapshot.set(p.codigo_produto.toString(), Number(p.saldo_estoque || 0));
      }
    });
    preImportSnapshot.current = snapshot;
  }, []);

  // Passo 2: Compara os novos produtos com a foto tirada
  const detectChanges = useCallback((newProducts: Product[]) => {
    const modified = new Set<string>();

    newProducts.forEach((prod) => {
      // --- PROTEÇÃO: Ignora itens fixos na comparação ---
      if (prod.tipo_cadastro === "FIXO") return;
      // --------------------------------------------------

      if (!prod.codigo_produto) return;
      const codigo = prod.codigo_produto.toString();
      const saldoAtual = Number(prod.saldo_estoque || 0);
      const saldoAntigo = preImportSnapshot.current.get(codigo);

      // Se não existia antes (novo) OU se o saldo é diferente (soma)
      if (saldoAntigo === undefined || saldoAntigo !== saldoAtual) {
        modified.add(codigo);
      }
    });

    setModifiedProductCodes(modified);

    // Limpa o snapshot para liberar memória
    preImportSnapshot.current.clear();
  }, []);

  const clearHighlights = useCallback(() => {
    setModifiedProductCodes(new Set());
  }, []);

  return {
    modifiedProductCodes,
    captureSnapshot,
    detectChanges,
    clearHighlights,
  };
};
