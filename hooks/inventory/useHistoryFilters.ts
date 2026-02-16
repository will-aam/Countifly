// hooks/inventory/useHistoryFilters.ts
"use client";

import { useState, useEffect, useMemo } from "react";

interface Company {
  id: number;
  nomeFantasia: string;
}

interface HistoryItem {
  id: number;
  nome_arquivo: string;
  created_at: string;
  empresa_id?: number | null;
}

export function useHistoryFilters(history: HistoryItem[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"date" | "name" | "company">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Resetar filtros
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCompanyId("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  // Filtragem
  const filteredHistory = useMemo(() => {
    let filtered = [...history];

    // Filtro de busca por nome
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.nome_arquivo.toLowerCase().includes(query),
      );
    }

    // Filtro por empresa
    if (selectedCompanyId !== "all") {
      if (selectedCompanyId === "none") {
        // Filtrar itens sem empresa
        filtered = filtered.filter((item) => !item.empresa_id);
      } else {
        const companyId = parseInt(selectedCompanyId);
        filtered = filtered.filter((item) => item.empresa_id === companyId);
      }
    }

    // Filtro por data (de)
    if (dateFrom) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.created_at);
        return itemDate >= dateFrom;
      });
    }

    // Filtro por data (até)
    if (dateTo) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.created_at);
        // Adiciona 23:59:59 ao dateTo para incluir o dia inteiro
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        return itemDate <= endOfDay;
      });
    }

    // Ordenação
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "name":
          comparison = a.nome_arquivo.localeCompare(b.nome_arquivo);
          break;
        case "company":
          // ✅ CORREÇÃO: Tratamento de undefined
          const aEmpresaId = a.empresa_id ?? null;
          const bEmpresaId = b.empresa_id ?? null;

          // Ordenar por empresa_id (nulls por último)
          if (aEmpresaId === null && bEmpresaId === null) comparison = 0;
          else if (aEmpresaId === null) comparison = 1;
          else if (bEmpresaId === null) comparison = -1;
          else comparison = aEmpresaId - bEmpresaId;
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    history,
    searchQuery,
    selectedCompanyId,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
  ]);

  // Toggle de ordenação
  const toggleSort = (column: "date" | "name" | "company") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedCompanyId !== "all") count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [searchQuery, selectedCompanyId, dateFrom, dateTo]);

  return {
    // Estados
    searchQuery,
    setSearchQuery,
    selectedCompanyId,
    setSelectedCompanyId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortBy,
    sortOrder,

    // Ações
    toggleSort,
    clearFilters,

    // Dados processados
    filteredHistory,
    activeFiltersCount,
  };
}
