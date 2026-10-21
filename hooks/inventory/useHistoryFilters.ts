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

  // Search, company/date filtering, ordering and pagination are performed
  // together by the API so the result set and page counts stay consistent.
  const filteredHistory = history;

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
