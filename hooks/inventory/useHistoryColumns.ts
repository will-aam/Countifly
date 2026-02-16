// hooks/inventory/useHistoryColumns.ts
"use client";

import { useState, useEffect } from "react";

export type ColumnKey = "arquivo" | "empresa" | "data" | "acoes";

export interface ColumnConfig {
  key: ColumnKey;
  label: string;
  visible: boolean;
  required: boolean;
  width?: number;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "arquivo",
    label: "Arquivo",
    visible: true,
    required: true,
    width: 400,
  },
  {
    key: "empresa",
    label: "Empresa",
    visible: true,
    required: false,
    width: 200,
  },
  {
    key: "data",
    label: "Data",
    visible: true,
    required: true,
    width: 180,
  },
  {
    key: "acoes",
    label: "Ações",
    visible: true,
    required: true,
    width: 120,
  },
];

const STORAGE_KEY = "history-columns-config";

export function useHistoryColumns() {
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar configuração do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ColumnConfig[];

        // Mesclar com defaults para garantir novas colunas
        const merged = DEFAULT_COLUMNS.map((defaultCol) => {
          const savedCol = parsed.find((c) => c.key === defaultCol.key);
          return savedCol
            ? {
                ...defaultCol,
                visible: savedCol.visible,
                width: savedCol.width,
              }
            : defaultCol;
        });

        setColumns(merged);
      }
    } catch (error) {
      console.error("Erro ao carregar configuração de colunas:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Salvar configuração no localStorage
  const saveColumns = (newColumns: ColumnConfig[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newColumns));
      setColumns(newColumns);
    } catch (error) {
      console.error("Erro ao salvar configuração de colunas:", error);
    }
  };

  // Toggle visibilidade de uma coluna
  const toggleColumn = (key: ColumnKey) => {
    const column = columns.find((c) => c.key === key);

    // Não permitir ocultar colunas obrigatórias
    if (column?.required) return;

    const updated = columns.map((col) =>
      col.key === key ? { ...col, visible: !col.visible } : col,
    );

    saveColumns(updated);
  };

  // Atualizar largura de uma coluna
  const updateColumnWidth = (key: ColumnKey, width: number) => {
    const updated = columns.map((col) =>
      col.key === key ? { ...col, width } : col,
    );

    saveColumns(updated);
  };

  // Resetar para configuração padrão
  const resetColumns = () => {
    saveColumns(DEFAULT_COLUMNS);
  };

  // Obter apenas colunas visíveis
  const visibleColumns = columns.filter((col) => col.visible);

  return {
    columns,
    visibleColumns,
    isLoading,
    toggleColumn,
    updateColumnWidth,
    resetColumns,
  };
}
