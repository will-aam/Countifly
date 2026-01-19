// components/inventory/HistoryTab.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  History as HistoryIcon,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Download,
  AlertCircle,
  FileDown,
  Clock,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  ClipboardList,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface HistoryTabProps {
  userId: number | null;
  history: any[];
  loadHistory: () => Promise<void>;
  handleDeleteHistoryItem: (id: number) => Promise<void>;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  isLoadingHistory?: boolean;
  totalItems?: number;
}

export function HistoryTab({
  userId,
  history,
  loadHistory,
  handleDeleteHistoryItem,
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

  // Estados de Loading individuais
  const [downloadingItemId, setDownloadingItemId] = useState<number | null>(
    null,
  );
  // NOVO: Estado de loading para o redirecionamento inteligente
  const [routingReportId, setRoutingReportId] = useState<number | null>(null);

  useEffect(() => {
    if (userId) {
      loadHistory();
    }
  }, [userId, loadHistory]);

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

  // --- Lógica de Estatísticas Rápidas (Client Side) ---
  const analyzeCsvData = (csvContent: string) => {
    try {
      if (!csvContent) return { total: 0, missing: 0, surplus: 0 };
      const lines = csvContent.split("\n");
      if (lines.length < 2) return { total: 0, missing: 0, surplus: 0 };

      const dataLines = lines.slice(1).filter((line) => line.trim());
      let missing = 0;
      let surplus = 0;

      dataLines.forEach((line) => {
        const columns = line.split(";");
        if (columns.length >= 5) {
          const lastCol = parseInt(columns[columns.length - 1]) || 0;
          if (lastCol < 0) missing++;
          else if (lastCol > 0) surplus++;
        }
      });

      return {
        total: dataLines.length,
        missing,
        surplus,
      };
    } catch (error) {
      return { total: 0, missing: 0, surplus: 0 };
    }
  };

  // --- NOVO: Roteamento Inteligente ---
  // Decide se vai para /report (legado) ou /database-report (valuation)
  const handleSmartReportRedirect = async (item: any) => {
    try {
      setRoutingReportId(item.id);

      // 1. Busca o conteúdo CSV se não estiver na lista
      let content = item.conteudo_csv;
      if (!content) {
        const res = await fetch(`/api/inventory/history/${item.id}`);
        if (res.ok) {
          const data = await res.json();
          content = data.conteudo_csv || data.csv_conteudo;
        }
      }

      if (!content) {
        // Fallback seguro: abre o legado
        router.push(`/inventory/history/${item.id}/report`);
        return;
      }

      // 2. Analisa o cabeçalho para decidir a rota
      const headerLine = content.split("\n")[0] || "";

      // Palavras-chave exclusivas do Valuation
      const isValuation =
        headerLine.includes("preco") || // Cobre "preco_unitario" e "Preço"
        headerLine.includes("preço") ||
        headerLine.includes("valor_total") || // Cobre "valor_total"
        headerLine.includes("valor total") ||
        headerLine.includes("categoria"); // Cobre "categoria" e "Categoria"

      if (isValuation) {
        // Rota Nova (Valuation)
        router.push(`/inventory/history/${item.id}/database-report`);
      } else {
        // Rota Legada (Conferência Simples)
        router.push(`/inventory/history/${item.id}/report`);
      }
    } catch (error) {
      console.error("Erro no roteamento:", error);
      router.push(`/inventory/history/${item.id}/report`);
    }
    // Nota: não limpamos o loading aqui para evitar flash na troca de página
  };

  // Formatadores
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HistoryIcon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-11">
            {(totalItems ?? history.length) > 0
              ? `${totalItems ?? history.length} registros no total`
              : "Nenhum registro encontrado"}
          </p>
        </div>
      </div>

      {history.length > 0 ? (
        <>
          {/* Tabela Desktop */}
          <div className="hidden md:block">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/50">
                      <TableHead className="w-[50%] font-medium">
                        Arquivo
                      </TableHead>
                      <TableHead className="font-medium">Data</TableHead>
                      <TableHead className="text-right font-medium">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow
                        key={item.id}
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted/50 rounded-md">
                              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-medium text-sm">
                                {item.nome_arquivo}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ID: {item.id}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {formatDate(item.created_at)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTime(item.created_at)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center justify-end gap-1">
                            {/* Botão Download CSV */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                              onClick={() => downloadCsv(item)}
                              disabled={downloadingItemId === item.id}
                              title="Baixar CSV"
                            >
                              {downloadingItemId === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>

                            {/* BOTÃO INTELIGENTE DE RELATÓRIO */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-600"
                              onClick={() => handleSmartReportRedirect(item)}
                              disabled={routingReportId === item.id}
                              title="Visualizar Relatório"
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
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => confirmDelete(item.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Versão Mobile */}
          <div className="md:hidden space-y-4">
            {history.map((item) => {
              const stats = analyzeCsvData(item.conteudo_csv);
              return (
                <Card key={item.id} className="border shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileSpreadsheet className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm truncate">
                            {item.nome_arquivo}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            ID: {item.id}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(item.created_at)}</span>
                      <Clock className="h-3 w-3 ml-2" />
                      <span>{formatTime(item.created_at)}</span>
                    </div>

                    {stats.total > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="secondary" className="text-xs">
                          {stats.total} itens
                        </Badge>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadCsv(item)}
                          disabled={downloadingItemId === item.id}
                          className="h-8 px-3 text-xs"
                        >
                          {downloadingItemId === item.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <FileDown className="h-3 w-3 mr-1" />
                          )}
                          CSV
                        </Button>

                        {/* BOTÃO INTELIGENTE MOBILE */}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSmartReportRedirect(item)}
                          disabled={routingReportId === item.id}
                          className="h-8 px-3 text-xs"
                        >
                          {routingReportId === item.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <ClipboardList className="h-3 w-3 mr-1" />
                          )}
                          Relatório
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => confirmDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
            {isLoadingHistory ? (
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            ) : (
              <>
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhuma contagem encontrada
                </h3>
                <p className="text-sm text-muted-foreground">
                  Realize uma contagem para vê-la aqui.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diálogo de Exclusão (Mantido) */}
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
    </div>
  );
}
