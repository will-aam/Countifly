// components/inventory/history/HistoryDataTable.tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileSpreadsheet,
  Download,
  ClipboardList,
  Trash2,
  CheckCircle2,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import type { ColumnConfig } from "@/hooks/inventory/useHistoryColumns";

interface Company {
  id: number;
  nomeFantasia: string;
}

interface HistoryDataTableProps {
  items: any[];
  visibleColumns: ColumnConfig[];
  selectedIds: Set<number>;
  onToggleSelection: (id: number) => void;
  onDownload: (item: any) => void;
  onViewReport: (item: any) => void;
  onDelete: (id: number) => void;
  downloadingItemId: number | null;
  routingReportId: number | null;
  isLoading?: boolean;
  sortBy: "date" | "name" | "company";
  sortOrder: "asc" | "desc";
  onSort: (column: "date" | "name" | "company") => void;
  companies: Company[];
}

export function HistoryDataTable({
  items,
  visibleColumns,
  selectedIds,
  onToggleSelection,
  onDownload,
  onViewReport,
  onDelete,
  downloadingItemId,
  routingReportId,
  isLoading = false,
  sortBy,
  sortOrder,
  onSort,
  companies,
}: HistoryDataTableProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "HH:mm", { locale: ptBR });
    } catch {
      return "";
    }
  };

  const getCompanyName = (empresaId?: number | null) => {
    if (!empresaId) return null;
    const company = companies.find((c) => c.id === empresaId);
    return company?.nomeFantasia || null;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const SortButton = ({
    column,
    children,
  }: {
    column: "date" | "name" | "company";
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(column)}
      className="h-8 -ml-3 hover:bg-transparent gap-1"
    >
      {children}
      {sortBy === column ? (
        sortOrder === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </Button>
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50">
                {visibleColumns.map((col) => (
                  <TableHead key={col.key} className="font-medium">
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {visibleColumns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50">
                {visibleColumns.map((col) => {
                  if (col.key === "arquivo") {
                    return (
                      <TableHead
                        key={col.key}
                        className="font-medium"
                        style={{ width: col.width }}
                      >
                        <SortButton column="name">Arquivo</SortButton>
                      </TableHead>
                    );
                  }
                  if (col.key === "empresa") {
                    return (
                      <TableHead
                        key={col.key}
                        className="font-medium"
                        style={{ width: col.width }}
                      >
                        <SortButton column="company">Empresa</SortButton>
                      </TableHead>
                    );
                  }
                  if (col.key === "data") {
                    return (
                      <TableHead
                        key={col.key}
                        className="font-medium"
                        style={{ width: col.width }}
                      >
                        <SortButton column="date">Data</SortButton>
                      </TableHead>
                    );
                  }
                  return (
                    <TableHead
                      key={col.key}
                      className="font-medium text-right"
                      style={{ width: col.width }}
                    >
                      {col.label}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const companyName = getCompanyName(item.empresa_id);

                return (
                  <TableRow
                    key={item.id}
                    onClick={(e) => {
                      if (
                        e.target instanceof HTMLElement &&
                        e.target.closest("button")
                      ) {
                        return;
                      }
                      onToggleSelection(item.id);
                    }}
                    className={`border-b border-border/30 hover:bg-muted/30 transition-all cursor-pointer ${
                      isSelected ? "bg-primary/10" : ""
                    }`}
                  >
                    {visibleColumns.map((col) => {
                      // Coluna: Arquivo
                      if (col.key === "arquivo") {
                        return (
                          <TableCell key={col.key} className="py-4">
                            <div className="flex items-center gap-3">
                              {isSelected && (
                                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                              <div className="p-2 bg-muted/50 rounded-md">
                                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="space-y-1 min-w-0">
                                <TooltipProvider>
                                  <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                      <p className="font-medium text-sm truncate cursor-help">
                                        {truncateText(item.nome_arquivo, 50)}
                                      </p>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="max-w-md break-words"
                                    >
                                      {item.nome_arquivo}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <p className="text-xs text-muted-foreground">
                                  ID: {item.id}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        );
                      }

                      // Coluna: Empresa
                      if (col.key === "empresa") {
                        return (
                          <TableCell key={col.key} className="py-4">
                            {companyName ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <TooltipProvider>
                                  <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                      <span className="text-sm truncate cursor-help max-w-[180px] block">
                                        {truncateText(companyName, 25)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      {companyName}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                Sem empresa
                              </span>
                            )}
                          </TableCell>
                        );
                      }

                      // Coluna: Data
                      if (col.key === "data") {
                        return (
                          <TableCell key={col.key} className="py-4">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                {formatDate(item.created_at)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatTime(item.created_at)}
                              </p>
                            </div>
                          </TableCell>
                        );
                      }

                      // Coluna: Ações
                      if (col.key === "acoes") {
                        return (
                          <TableCell key={col.key} className="py-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                onClick={() => onDownload(item)}
                                disabled={downloadingItemId === item.id}
                                title="Baixar CSV"
                              >
                                {downloadingItemId === item.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-600"
                                onClick={() => onViewReport(item)}
                                disabled={routingReportId === item.id}
                                title="Montar Relatório"
                              >
                                {routingReportId === item.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                ) : (
                                  <ClipboardList className="h-4 w-4" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-red-500/10 hover:text-red-600"
                                onClick={() => onDelete(item.id)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        );
                      }

                      return null;
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
