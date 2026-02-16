// components/inventory/HistoryTab.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  History as HistoryIcon,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

// Hooks customizados
import { useHistoryFilters } from "@/hooks/inventory/useHistoryFilters";
import { useHistoryColumns } from "@/hooks/inventory/useHistoryColumns";

// Componentes
import { HistoryFilters } from "./history/HistoryFilters";
import { HistoryColumnConfig } from "./history/HistoryColumnConfig";
import { HistoryDataTable } from "./history/HistoryDataTable";
import { HistoryMobileCard } from "./history/HistoryMobileCard";

interface Company {
  id: number;
  nomeFantasia: string;
  ativo: boolean;
}

interface HistoryTabProps {
  userId: number | null;
  history: any[];
  loadHistory: () => Promise<void>;
  handleDeleteHistoryItem: (id: number) => Promise<void>;
  handleBatchDelete?: (ids: number[]) => Promise<void>;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  isLoadingHistory?: boolean;
  totalItems?: number;
}

// ✅ NOVO: Componente de Skeleton para Filtros
function FiltersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-full sm:w-[220px]" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 w-full sm:w-[200px]" />
        <Skeleton className="h-10 w-full sm:w-[200px]" />
      </div>
    </div>
  );
}

// ✅ NOVO: Componente de Skeleton para Cards Mobile
function MobileCardsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-8 w-full mb-3" />
            <div className="flex gap-4 mb-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function HistoryTab({
  userId,
  history,
  loadHistory,
  handleDeleteHistoryItem,
  handleBatchDelete,
  page,
  setPage,
  totalPages,
  isLoadingHistory = false,
  totalItems,
}: HistoryTabProps) {
  const router = useRouter();

  // Estados de UI
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  // Estados de seleção em lote
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // Estados de Loading individuais
  const [downloadingItemId, setDownloadingItemId] = useState<number | null>(
    null,
  );
  const [routingReportId, setRoutingReportId] = useState<number | null>(null);

  // Estado de empresas
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true); // ✅ NOVO

  // Hooks customizados
  const filters = useHistoryFilters(history);
  const columns = useHistoryColumns();

  // ✅ NOVO: Estado de carregamento inicial
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Carregar histórico
  useEffect(() => {
    if (userId) {
      loadHistory().finally(() => setIsInitialLoad(false));
    }
  }, [userId, loadHistory]);

  // Carregar empresas
  useEffect(() => {
    const loadCompanies = async () => {
      setIsLoadingCompanies(true);
      try {
        const res = await fetch("/api/companies");
        const data = await res.json();
        if (data.success) {
          setCompanies(data.companies.filter((c: Company) => c.ativo));
        }
      } catch (error) {
        console.error("Erro ao carregar empresas:", error);
      } finally {
        setIsLoadingCompanies(false);
      }
    };

    if (userId) {
      loadCompanies();
    }
  }, [userId]);

  // Limpar seleção ao mudar de página
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  // --- Lógica de Seleção em Lote ---
  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allIds = filters.filteredHistory.map((item) => item.id);
    setSelectedIds(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const confirmBatchDelete = () => {
    if (selectedIds.size === 0) return;
    setBatchDeleteDialogOpen(true);
  };

  const executeBatchDelete = async () => {
    if (!handleBatchDelete || selectedIds.size === 0) return;

    setIsDeletingBatch(true);
    try {
      await handleBatchDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setBatchDeleteDialogOpen(false);
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // --- Lógica de Download (CSV) ---
  const downloadCsv = async (item: any) => {
    try {
      setDownloadingItemId(item.id);
      let content = item.conteudo_csv;

      if (!content) {
        const res = await fetch(`/api/inventory/history/${item.id}`);
        if (!res.ok) throw new Error("Erro ao buscar arquivo");
        const data = await res.json();
        content = data.csv_conteudo || data.conteudo_csv;
      }

      if (!content) throw new Error("Conteúdo do arquivo vazio");

      const blob = new Blob([`\uFEFF${content}`], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = item.nome_arquivo || "contagem.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({
        title: "Download concluído",
        description: "O arquivo foi baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setDownloadingItemId(null);
    }
  };

  // --- Lógica de Deleção ---
  const confirmDelete = (id: number) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (itemToDelete !== null) {
      await handleDeleteHistoryItem(itemToDelete);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  // --- Roteamento Inteligente ---
  const handleSmartReportRedirect = async (item: any) => {
    try {
      setRoutingReportId(item.id);

      let content = item.conteudo_csv;
      if (!content) {
        const res = await fetch(`/api/inventory/history/${item.id}`);
        if (res.ok) {
          const data = await res.json();
          content = data.conteudo_csv || data.csv_conteudo;
        }
      }

      if (!content) {
        router.push(`/inventory/history/${item.id}/report`);
        return;
      }

      const headerLine = content.split("\n")[0] || "";
      const isValuation =
        headerLine.includes("preco") ||
        headerLine.includes("preço") ||
        headerLine.includes("valor_total") ||
        headerLine.includes("valor total") ||
        headerLine.includes("categoria");

      if (isValuation) {
        router.push(`/inventory/history/${item.id}/database-report`);
      } else {
        router.push(`/inventory/history/${item.id}/report`);
      }
    } catch (error) {
      console.error("Erro no roteamento:", error);
      router.push(`/inventory/history/${item.id}/report`);
    }
  };

  // Buscar dados da empresa para um item
  const getCompanyForItem = (empresaId?: number | null) => {
    if (!empresaId) return null;
    return companies.find((c) => c.id === empresaId) || null;
  };

  // ✅ NOVO: Estado de carregamento completo
  const isFullyLoading = isInitialLoad || columns.isLoading;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HistoryIcon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-11">
            {isFullyLoading ? (
              <Skeleton className="h-4 w-48 inline-block" />
            ) : selectedIds.size > 0 ? (
              <span className="text-primary font-medium">
                {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
              </span>
            ) : filters.filteredHistory.length > 0 ? (
              <>
                {filters.filteredHistory.length} de{" "}
                {totalItems ?? history.length} registros
                {filters.activeFiltersCount > 0 && " (filtrados)"}
              </>
            ) : filters.activeFiltersCount > 0 ? (
              "Nenhum resultado encontrado"
            ) : (
              "Nenhum registro encontrado"
            )}
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2">
          {isFullyLoading ? (
            <>
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24 hidden md:block" />{" "}
              {/* ✅ Skeleton só desktop */}
            </>
          ) : selectedIds.size > 0 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={isDeletingBatch}
              >
                Limpar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmBatchDelete}
                disabled={isDeletingBatch}
                className="gap-2"
              >
                {isDeletingBatch ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Excluir {selectedIds.size}
              </Button>
            </>
          ) : (
            <>
              {filters.filteredHistory.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  disabled={isLoadingHistory}
                >
                  Selecionar Todos
                </Button>
              )}
              {/* ✅ Botão Colunas: APENAS DESKTOP */}
              <div className="hidden md:flex">
                <HistoryColumnConfig
                  columns={columns.columns}
                  toggleColumn={columns.toggleColumn}
                  resetColumns={columns.resetColumns}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filtros */}
      {isFullyLoading ? (
        <FiltersSkeleton />
      ) : (
        <HistoryFilters
          searchQuery={filters.searchQuery}
          setSearchQuery={filters.setSearchQuery}
          selectedCompanyId={filters.selectedCompanyId}
          setSelectedCompanyId={filters.setSelectedCompanyId}
          dateFrom={filters.dateFrom}
          setDateFrom={filters.setDateFrom}
          dateTo={filters.dateTo}
          setDateTo={filters.setDateTo}
          clearFilters={filters.clearFilters}
          activeFiltersCount={filters.activeFiltersCount}
        />
      )}

      {/* Conteúdo */}
      {isFullyLoading ? (
        <>
          {/* Skeleton Desktop */}
          <div className="hidden md:block">
            <HistoryDataTable
              items={[]}
              visibleColumns={columns.visibleColumns}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              onDownload={downloadCsv}
              onViewReport={handleSmartReportRedirect}
              onDelete={confirmDelete}
              downloadingItemId={downloadingItemId}
              routingReportId={routingReportId}
              isLoading={true}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSort={filters.toggleSort}
              companies={companies}
            />
          </div>

          {/* Skeleton Mobile */}
          <div className="md:hidden">
            <MobileCardsSkeleton />
          </div>
        </>
      ) : filters.filteredHistory.length > 0 ? (
        <>
          {/* Tabela Desktop */}
          <div className="hidden md:block">
            <HistoryDataTable
              items={filters.filteredHistory}
              visibleColumns={columns.visibleColumns}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              onDownload={downloadCsv}
              onViewReport={handleSmartReportRedirect}
              onDelete={confirmDelete}
              downloadingItemId={downloadingItemId}
              routingReportId={routingReportId}
              isLoading={isLoadingHistory}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSort={filters.toggleSort}
              companies={companies}
            />
          </div>

          {/* Cards Mobile */}
          <div className="md:hidden space-y-4">
            {filters.filteredHistory.map((item) => (
              <HistoryMobileCard
                key={item.id}
                item={item}
                isSelected={selectedIds.has(item.id)}
                onToggleSelection={() => toggleSelection(item.id)}
                onDownload={() => downloadCsv(item)}
                onViewReport={() => handleSmartReportRedirect(item)}
                onDelete={() => confirmDelete(item.id)}
                isDownloading={downloadingItemId === item.id}
                isRouting={routingReportId === item.id}
                company={getCompanyForItem(item.empresa_id)}
              />
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-6 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1 || isLoadingHistory}
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || isLoadingHistory}
              >
                Próxima <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {filters.activeFiltersCount > 0
                ? "Nenhum resultado encontrado"
                : "Nenhuma contagem encontrada"}
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              {filters.activeFiltersCount > 0
                ? "Tente ajustar os filtros de busca"
                : "Realize uma contagem para vê-la aqui."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de Exclusão Individual */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-6">
            <Trash2 className="h-10 w-10 text-destructive mb-4 p-2 bg-destructive/10 rounded-full" />
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir esta contagem? Esta ação não pode
                ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 w-full mt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={executeDelete}
                className="flex-1"
              >
                Excluir
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Exclusão em Lote */}
      <Dialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-6">
            <Trash2 className="h-10 w-10 text-destructive mb-4 p-2 bg-destructive/10 rounded-full" />
            <DialogHeader>
              <DialogTitle>Confirmar exclusão em lote</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir {selectedIds.size}{" "}
                {selectedIds.size === 1 ? "item" : "itens"}? Esta ação não pode
                ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 w-full mt-4">
              <Button
                variant="outline"
                onClick={() => setBatchDeleteDialogOpen(false)}
                disabled={isDeletingBatch}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={executeBatchDelete}
                disabled={isDeletingBatch}
                className="flex-1 gap-2"
              >
                {isDeletingBatch && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Excluir {selectedIds.size}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
