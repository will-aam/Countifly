// components/inventory/HistoryTab.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Download,
  History as HistoryIcon,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  FileDown,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
}: HistoryTabProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [downloadingItemId, setDownloadingItemId] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (userId) {
      loadHistory();
    }
  }, [userId, loadHistory]);

  // Função de download ajustada para buscar o conteúdo quando necessário
  const downloadCsv = async (item: any) => {
    try {
      setDownloadingItemId(item.id);
      let content = item.conteudo_csv;

      // Se o conteúdo não veio na lista (devido à otimização), buscamos agora
      if (!content) {
        toast({
          title: "Preparando download...",
          description: "Buscando arquivo no servidor.",
        });

        const res = await fetch(`/api/inventory/${userId}/history/${item.id}`);
        if (!res.ok) throw new Error("Erro ao buscar arquivo");

        const data = await res.json();
        content = data.csv_conteudo;
      }

      if (!content) throw new Error("Conteúdo do arquivo vazio");

      // Cria o Blob e força o download
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
      console.error(error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setDownloadingItemId(null);
    }
  };

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

  // Função para analisar o CSV e extrair estatísticas
  const analyzeCsvData = (csvContent: string) => {
    try {
      const lines = csvContent.split("\n");
      if (lines.length < 2) return { total: 0, missing: 0, surplus: 0 };

      // Ignorar cabeçalho
      const dataLines = lines.slice(1).filter((line) => line.trim());
      let missing = 0;
      let surplus = 0;

      dataLines.forEach((line) => {
        const columns = line.split(";");
        if (columns.length >= 7) {
          const total = parseInt(columns[6]) || 0;
          if (total < 0) missing++;
          else if (total > 0) surplus++;
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

  // Função para formatar a data de forma mais compacta
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Função para formatar a hora
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* Header com informações gerais */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Histórico de Contagens</h2>
          {isLoadingHistory && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {history.length > 0 && (
            <span>
              Página {page} de {totalPages} ({history.length} itens)
            </span>
          )}
        </div>
      </div>

      {history.length > 0 ? (
        <>
          {/* Versão Desktop - Tabela */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Arquivo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span
                              className="truncate max-w-[300px]"
                              title={item.nome_arquivo}
                            >
                              {item.nome_arquivo}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{formatDate(item.created_at)}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(item.created_at)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadCsv(item)}
                              title="Baixar CSV"
                              disabled={downloadingItemId === item.id}
                            >
                              {downloadingItemId === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/inventory/history/${item.id}/report`
                                )
                              }
                              title="Gerar Relatório PDF"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
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

          {/* Versão Mobile - Cards Compactos */}
          <div className="md:hidden space-y-3">
            {history.map((item) => {
              const stats = analyzeCsvData(item.conteudo_csv);
              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <h3
                          className="font-medium truncate"
                          title={item.nome_arquivo}
                        >
                          {item.nome_arquivo}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => downloadCsv(item)}
                          title="Baixar CSV"
                          disabled={downloadingItemId === item.id}
                        >
                          {downloadingItemId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => confirmDelete(item.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatDate(item.created_at)} às{" "}
                        {formatTime(item.created_at)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {stats.missing > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Faltantes: {stats.missing}
                        </Badge>
                      )}
                      {stats.surplus > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Sobrantes: {stats.surplus}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Paginação - Versão Otimizada */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1 || isLoadingHistory}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">Página</span>
                <span className="text-sm font-medium px-2 py-1 bg-muted rounded">
                  {page}
                </span>
                <span className="text-sm text-muted-foreground">
                  de {totalPages}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || isLoadingHistory}
                className="flex items-center gap-1"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            {isLoadingHistory ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Carregando histórico...</p>
              </>
            ) : (
              <>
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma contagem encontrada
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diálogo de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta contagem? Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={executeDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
